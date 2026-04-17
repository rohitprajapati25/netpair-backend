import { Request, Response } from "express";
import Task, { TASK_STATUS, TASK_PRIORITY } from "../model/Task.js";
import Project from "../model/Project.js";
import User from "../model/User.js";
import Employee from "../model/Employee.js";
import { auditLog } from "../utils/auditLogger.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve the correct User._id to use as assigned_to.
// Task.assigned_to now refs "User". When an admin assigns a task they pass
// an Employee._id (legacy). We look up the matching User by email so both
// old and new records work.
// ─────────────────────────────────────────────────────────────────────────────
const resolveUserId = async (id: string): Promise<any> => {
  // 1. Already a User? Return as-is.
  const user = await User.findById(id).select("_id").lean();
  if (user) return user._id;

  // 2. Legacy Employee._id — find matching User by email
  const emp = await Employee.findById(id).select("email").lean();
  if (emp) {
    const u = await User.findOne({ email: (emp as any).email }).select("_id").lean();
    if (u) return u._id;
  }
  return id; // fallback
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE TASK  — Admin / SuperAdmin
// ─────────────────────────────────────────────────────────────────────────────
export const createTask = async (req: Request, res: Response) => {
  try {
    const { task_title, project_id, assigned_to, description, priority, start_date, due_date } = req.body;

    const project = await Project.findOne({ _id: project_id, deletedAt: null });
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    // Resolve assignee — accept both User._id and Employee._id
    const assigneeId = await resolveUserId(assigned_to);
    const assignee   = await User.findById(assigneeId).select("name").lean();
    if (!assignee) return res.status(404).json({ success: false, message: "Assignee not found" });

    if (new Date(start_date) > new Date(due_date)) {
      return res.status(400).json({ success: false, message: "Start date cannot be after due date" });
    }

    const task = await Task.create({
      task_title,
      project_id,
      assigned_to: assigneeId,
      assigned_by: (req as any).user.id,
      description,
      priority:   priority || TASK_PRIORITY.MEDIUM,
      start_date: new Date(start_date),
      due_date:   new Date(due_date),
      status:     TASK_STATUS.TODO,
    });

    const populated = await Task.findById(task._id)
      .populate("project_id",  "name status")
      .populate("assigned_to", "name email department")
      .populate("assigned_by", "name")
      .lean();

    res.status(201).json({ success: true, task: populated });

    await auditLog(req, {
      action:   "TASK_CREATE",
      resource: "Task Management",
      details:  `Task "${task_title}" created for ${(assignee as any).name} in "${project.name}"`,
      severity: priority === "Critical" || priority === "High" ? "HIGH" : "INFO",
      status:   "SUCCESS",
      meta:     { taskId: task._id, projectId: project_id, assignedTo: assigneeId, priority },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET TASKS
// Admin/HR: all tasks (with optional filters)
// Employee: only tasks assigned to them
// ─────────────────────────────────────────────────────────────────────────────
export const getTasks = async (req: Request, res: Response) => {
  try {
    const { project_id, status, assigned_to, page = 1, limit = 100 } = req.query;
    const user = (req as any).user;
    const query: any = { deletedAt: null };

    if (project_id)  query.project_id  = project_id;
    if (status)      query.status      = status;
    if (assigned_to) query.assigned_to = assigned_to;

    // Employee sees only their own tasks
    if (user.role === "employee") {
      query.assigned_to = user.id; // User._id directly (Task now refs User)
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate("project_id",  "name status priority")
        .populate("assigned_to", "name department")
        .populate("assigned_by", "name")
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit))
        .lean(),
      Task.countDocuments(query),
    ]);

    res.json({ success: true, tasks, total, page: Number(page), limit: Number(limit) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE TASK  — Admin/SuperAdmin (full update) | Employee (status + progress only)
// ─────────────────────────────────────────────────────────────────────────────
export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id }  = req.params;
    const updates = req.body;
    const user    = (req as any).user;

    const query: any = { _id: id, deletedAt: null };

    // Employees can only update their own tasks, and only status/progress
    if (user.role === "employee") {
      query.assigned_to = user.id;
      const allowed: any = {};
      if (updates.status   !== undefined) allowed.status   = updates.status;
      if (updates.progress !== undefined) allowed.progress = Math.max(0, Math.min(100, Number(updates.progress)));
      Object.assign(updates, allowed);
      // Strip fields employees shouldn't touch
      delete updates.task_title;
      delete updates.project_id;
      delete updates.assigned_to;
      delete updates.assigned_by;
      delete updates.priority;
      delete updates.start_date;
      delete updates.due_date;
    }

    const prevTask = await Task.findOne(query).lean();
    if (!prevTask) return res.status(404).json({ success: false, message: "Task not found or access denied" });

    const task = await Task.findOneAndUpdate(
      query,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate("project_id",  "name status")
      .populate("assigned_to", "name email")
      .populate("assigned_by", "name");

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Auto-add status-change comment
    if (updates.status && updates.status !== (prevTask as any).status) {
      task.comments = task.comments || [];
      task.comments.push({
        text:      `Status changed: ${(prevTask as any).status} → ${updates.status}`,
        by:        user.id,
        createdAt: new Date(),
      });
      await task.save();
    }

    res.json({ success: true, task });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE TASK (soft delete)  — Admin / SuperAdmin only
// ─────────────────────────────────────────────────────────────────────────────
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true, message: "Task deleted", deletedId: req.params.id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET TASK STATS
// ─────────────────────────────────────────────────────────────────────────────
export const getTaskStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const match: any = { deletedAt: null };
    if (user.role === "employee") match.assigned_to = user.id;

    const stats = await Task.aggregate([
      { $match: match },
      {
        $group: {
          _id:        null,
          total:      { $sum: 1 },
          completed:  { $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.COMPLETED]   }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.IN_PROGRESS] }, 1, 0] } },
          blocked:    { $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.BLOCKED]     }, 1, 0] } },
          todo:       { $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.TODO]        }, 1, 0] } },
          review:     { $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.REVIEW]      }, 1, 0] } },
          avgProgress: { $avg: "$progress" },
          overdue: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ["$status", TASK_STATUS.COMPLETED] },
                  { $lt: ["$due_date", new Date()] },
                ]},
                1, 0,
              ],
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      stats: stats[0] || { total: 0, completed: 0, inProgress: 0, blocked: 0, todo: 0, review: 0, avgProgress: 0, overdue: 0 },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE TASK PROGRESS  — Employee (own tasks) | Admin
// ─────────────────────────────────────────────────────────────────────────────
export const updateTaskProgress = async (req: Request, res: Response) => {
  try {
    const { id }             = req.params;
    const { progress, comment } = req.body;
    const user               = (req as any).user;

    const query: any = { _id: id, deletedAt: null };
    if (user.role === "employee") query.assigned_to = user.id;

    const task = await Task.findOne(query);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    task.progress = Math.max(0, Math.min(100, Number(progress)));

    if (comment?.trim()) {
      task.comments = task.comments || [];
      task.comments.push({
        text:      `Progress → ${task.progress}%: ${comment.trim()}`,
        by:        user.id,
        createdAt: new Date(),
      });
    }

    // Auto-complete when progress hits 100
    if (task.progress === 100 && task.status !== TASK_STATUS.COMPLETED) {
      task.status = TASK_STATUS.COMPLETED;
    }

    await task.save();
    await task.populate([
      { path: "project_id",  select: "name" },
      { path: "assigned_to", select: "name email" },
    ]);

    res.json({ success: true, task });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD COMMENT  — Employee (own tasks) | Admin
// ─────────────────────────────────────────────────────────────────────────────
export const addTaskComment = async (req: Request, res: Response) => {
  try {
    const { id }      = req.params;
    const { comment } = req.body;
    const user        = (req as any).user;

    if (!comment?.trim()) {
      return res.status(400).json({ success: false, message: "Comment cannot be empty" });
    }

    const query: any = { _id: id, deletedAt: null };
    if (user.role === "employee") query.assigned_to = user.id;

    const task = await Task.findOne(query);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    task.comments = task.comments || [];
    task.comments.push({ text: comment.trim(), by: user.id, createdAt: new Date() });

    await task.save();
    await task.populate("comments.by", "name");

    res.json({ success: true, task });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};
