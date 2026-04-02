import { Request, Response } from 'express';
import Task, { TASK_STATUS, TASK_PRIORITY, ITask } from '../model/Task.js';
import Project from '../model/Project.js';
import Employee from '../model/Employee.js';

export const createTask = async (req: Request, res: Response) => {
  try {
    const { task_title, project_id, assigned_to, description, priority, start_date, due_date } = req.body;
    
    // Validate project exists
    const project = await Project.findById(project_id).notDeleted();
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Validate employee
    const employee = await Employee.findById(assigned_to).notDeleted();
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // Validate dates
    if (new Date(start_date) > new Date(due_date)) {
      return res.status(400).json({ message: "Start date cannot be after due date" });
    }

    const task = new Task({
      task_title,
      project_id,
      assigned_to,
      assigned_by: req.user!.id, // From auth middleware
      description,
      priority: priority as TASK_PRIORITY || TASK_PRIORITY.MEDIUM,
      start_date: new Date(start_date),
      due_date: new Date(due_date),
      status: TASK_STATUS.TODO
    });

    await task.save();
    await task.populate([{ path: 'project_id', select: 'name status' }, { path: 'assigned_to', select: 'name' }]);
    
    res.status(201).json(task);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  try {
    const { project_id, status, assigned_to, page = 1, limit = 10 } = req.query;
    const query: any = { deletedAt: null };

    if (project_id) query.project_id = project_id;
    if (status) query.status = status;
    if (assigned_to) query.assigned_to = assigned_to;

    // Role-based filters
    if (req.user!.role === 'employee') {
      query.assigned_to = req.user!.employeeId || req.user!.id;
    }

    const tasks = await Task.find(query)
      .populate('project_id', 'name status priority')
      .populate('assigned_to', 'name department')
      .populate('assigned_by', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Task.countDocuments(query);

    res.json({ success: true, tasks, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Status workflow validation (simple)
    if (updates.status) {
      const allowedTransitions: Record<string, string[]> = {
        [TASK_STATUS.TODO]: [TASK_STATUS.IN_PROGRESS, TASK_STATUS.BLOCKED],
        [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.REVIEW, TASK_STATUS.BLOCKED, TASK_STATUS.COMPLETED],
        [TASK_STATUS.REVIEW]: [TASK_STATUS.COMPLETED, TASK_STATUS.IN_PROGRESS],
        [TASK_STATUS.BLOCKED]: [TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS]
      };
      
      const task = await Task.findById(id).notDeleted();
      if (!task) return res.status(404).json({ message: "Task not found" });

      if (!allowedTransitions[task.status as string]?.includes(updates.status)) {
        return res.status(400).json({ message: "Invalid status transition" });
      }
    }

    const query: any = { _id: id, deletedAt: null };
    // Security: Employees should only be able to update tasks assigned to them
    if (req.user!.role === 'employee') {
      query.assigned_to = req.user!.employeeId || req.user!.id;
    }

    const task = await Task.findOneAndUpdate(
      query,
      { ...updates, updated_by: req.user!.id },
      { new: true, runValidators: true }
    ).populate('project_id assigned_to assigned_by', 'name status department');

    if (!task) return res.status(404).json({ message: "Task not found" });

    res.json({ success: true, task });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const task = await Task.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, { deletedAt: new Date() });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    res.json({ success: true, message: "Task soft deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaskStats = async (req: Request, res: Response) => {
  try {
    const stats = await Task.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.COMPLETED] }, 1, 0] } },
          blocked: { $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.BLOCKED] }, 1, 0] } },
          avgProgress: { $avg: "$progress" }
        }
      }
    ]);
    res.json(stats[0] || { total: 0, completed: 0, blocked: 0, avgProgress: 0 });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
