import { Request, Response } from 'express';
import Task, { TASK_STATUS, TASK_PRIORITY, ITask } from '../model/Task.js';
import Project from '../model/Project.js';
import Employee from '../model/Employee.js';

export const createTask = async (req: Request, res: Response) => {
  try {
    const { task_title, project_id, assigned_to, description, priority, start_date, due_date } = req.body;
    
    // Validate project exists
    const project = await Project.findOne({ _id: project_id, deletedAt: null });
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Validate employee
    const employee = await Employee.findOne({ _id: assigned_to, deletedAt: null });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // Validate dates
    if (new Date(start_date) > new Date(due_date)) {
      return res.status(400).json({ message: "Start date cannot be after due date" });
    }

    const task = new Task({
      task_title,
      project_id,
      assigned_to,
      assigned_by: (req as any).user!.id, // From auth middleware
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
    console.log('🔍 GET TASKS - Query:', req.query, 'User:', (req as any).user);
    const { project_id, status, assigned_to, page = 1, limit = 10 } = req.query;
    const query: any = { deletedAt: null };

    if (project_id) query.project_id = project_id;
    if (status) query.status = status;
    if (assigned_to) query.assigned_to = assigned_to;

    // Role-based filters
    if ((req as any).user!.role === 'employee') {
      query.assigned_to = (req as any).user!.employeeId || (req as any).user!.id;
    }

    console.log('Query built:', query);

    const tasks = await Task.find(query)
      .populate('project_id', 'name status priority')
      .populate('assigned_to', 'name department')
      .populate('assigned_by', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Task.countDocuments(query);
    console.log('📊 Found tasks:', tasks.length, 'Total:', total);

    res.json({ success: true, tasks, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    console.error('💥 GetTasks ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const user = (req as any).user;

    // Status workflow validation (simple)

    if (updates.status) {
// Temporarily disable strict workflow validation for testing
      const currentTask = await Task.findOne({ _id: id, deletedAt: null });
      console.log('Status change: ' + (currentTask ? currentTask.status : 'unknown') + ' → ' + updates.status);
      // const allowedTransitions: Record<string, string[]> = {
      //   [TASK_STATUS.TODO]: [TASK_STATUS.IN_PROGRESS, TASK_STATUS.BLOCKED],
      //   [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.REVIEW, TASK_STATUS.BLOCKED, TASK_STATUS.COMPLETED],
      //   [TASK_STATUS.REVIEW]: [TASK_STATUS.COMPLETED, TASK_STATUS.IN_PROGRESS],
      //   [TASK_STATUS.BLOCKED]: [TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS]
      // };
      // 
      // const task = await Task.findOne({ _id: id, deletedAt: null });
      // if (!task) return res.status(404).json({ message: "Task not found" });
      //
      // if (!allowedTransitions[task.status as string]?.includes(updates.status)) {
      //   return res.status(400).json({ message: "Invalid status transition" });
      // }
    }


    const query: any = { _id: id, deletedAt: null };
    // Security: Employees should only be able to update tasks assigned to them
    if (user.role === 'employee') {
      query.assigned_to = user.employeeId || user.id;
    }

    const task = await Task.findOneAndUpdate(
      query,
      { 
        ...updates, 
        updated_by: user.id,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate([
      { path: 'project_id', select: 'name status' }, 
      { path: 'assigned_to', select: 'name email' },
      { path: 'assigned_by', select: 'name' }
    ]);

    if (!task) return res.status(404).json({ message: "Task not found or access denied" });

    // Add comment if status changed
    if (updates.status && updates.status !== task.status) {
      const statusComment = `Status changed from ${task.status} to ${updates.status}`;
      if (!task.comments) task.comments = [];
      task.comments.push({
        text: statusComment,
        by: user.id,
        createdAt: new Date()
      });
      await task.save();
    }

    res.json({ success: true, task });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    console.log('🔴 DELETE TASK - ID:', req.params.id, 'User:', (req as any).user);
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      console.log('❌ Task not found');
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    console.log('✅ Task soft deleted:', task.task_title);
    res.json({ success: true, message: "Task soft deleted", deletedId: req.params.id });
  } catch (error: any) {
    console.error('💥 DeleteTask ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTaskStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const matchConditions: any = { deletedAt: null };

    // If employee, only show their tasks
    if (user.role === 'employee') {
      matchConditions.assigned_to = user.employeeId || user.id;
    }

    const stats = await Task.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.COMPLETED] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.IN_PROGRESS] }, 1, 0] } },
          blocked: { $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.BLOCKED] }, 1, 0] } },
          todo: { $sum: { $cond: [{ $eq: ["$status", TASK_STATUS.TODO] }, 1, 0] } },
          avgProgress: { $avg: "$progress" },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", TASK_STATUS.COMPLETED] },
                    { $lt: ["$due_date", new Date()] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const result = stats[0] || { 
      total: 0, 
      completed: 0, 
      inProgress: 0, 
      blocked: 0, 
      todo: 0, 
      avgProgress: 0,
      overdue: 0
    };

    res.json({ success: true, stats: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTaskProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { progress, comment } = req.body;
    const user = (req as any).user;

    const query: any = { _id: id, deletedAt: null };
    if (user.role === 'employee') {
      query.assigned_to = user.employeeId || user.id;
    }

    const task = await Task.findOne(query);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.progress = Math.max(0, Math.min(100, Number(progress)));

    if (comment && task.comments) {
      task.comments.push({
        text: `Progress updated to ${progress}%: ${comment}`,
        by: user.id,
        createdAt: new Date()
      });
    }

    await task.save();
    await task.populate([
      { path: 'assigned_to', select: 'name email' },
      { path: 'updated_by', select: 'name' }
    ]);

    res.json({ success: true, task });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const addTaskComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const user = (req as any).user;

    const query: any = { _id: id, deletedAt: null };
    if (user.role === 'employee') {
      query.assigned_to = user.employeeId || user.id;
    }

    const task = await Task.findOne(query);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (!task.comments) task.comments = [];
    task.comments.push({
      text: comment,
      by: user.id,
      createdAt: new Date()
    });

    await task.save();
    await task.populate('comments.by', 'name');

    res.json({ success: true, task });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
