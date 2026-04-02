import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Timesheet, { TIMESHEET_STATUS, ITimesheet } from '../model/Timesheet.js';
import Project from '../model/Project.js';
import Employee from '../model/Employee.js';
import Task from '../model/Task.js';

export const submitTimesheet = async (req: Request, res: Response) => {
  try {
    const { date, project_id, task_id, hours_worked, work_description } = req.body;

    const project = await Project.findById(project_id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const timesheet = new Timesheet({
      date: new Date(date),
      project_id,
      task_id: (task_id && mongoose.Types.ObjectId.isValid(task_id)) ? task_id : null,
      employee_id: req.user!.employeeId || req.user!.id,
      hours_worked,
      work_description,
      status: TIMESHEET_STATUS.SUBMITTED
    });

    await timesheet.save();
    await timesheet.populate([{ path: 'project_id', select: 'name projectCode' }, { path: 'task_id', select: 'task_title' }, { path: 'employee_id', select: 'name' }]);

    res.status(201).json(timesheet);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getTimesheets = async (req: Request, res: Response) => {
  try {
    const { employee_id, status, date, page = 1, limit = 10 } = req.query;
    const query: any = { deletedAt: null };

    if (employee_id || req.user!.role === 'employee') {
      query.employee_id = employee_id || req.user!.employeeId || req.user!.id;
    }
    if (status) query.status = status;
    if (date) query.date = { $gte: new Date(date as string), $lte: new Date((date as string) + 'T23:59:59') };

    const timesheets = await Timesheet.find(query)
      .populate('project_id', 'name')
      .populate('task_id', 'task_title')
      .populate('employee_id', 'name')
      .populate('approved_by', 'name')
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Timesheet.countDocuments(query);

    res.json({ success: true, timesheets, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const approveTimesheet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (status !== TIMESHEET_STATUS.APPROVED && status !== TIMESHEET_STATUS.REJECTED) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const timesheet = await Timesheet.findOne({ _id: id, deletedAt: null });
    if (!timesheet) return res.status(404).json({ message: "Timesheet not found" });

    timesheet.status = status as TIMESHEET_STATUS;
    if (status === TIMESHEET_STATUS.APPROVED) {
      timesheet.approved_by = req.user!.id;
    } else {
      timesheet.rejection_reason = rejection_reason;
    }

    await timesheet.save();
    await timesheet.populate('project_id task_id employee_id approved_by');

    res.json({ success: true, timesheet });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getProductivityReport = async (req: Request, res: Response) => {
  try {
    const { employee_id, period } = req.query; // period: 'week', 'month'
    // Implementation for reports (aggregate hours by employee/project)
    const match: any = { status: TIMESHEET_STATUS.APPROVED, deletedAt: null };
    if (employee_id) match.employee_id = employee_id;

    const report = await Timesheet.aggregate([
      { $match: match },
      {
        $group: {
          _id: { employee_id: "$employee_id", project_id: "$project_id" },
          total_hours: { $sum: "$hours_worked" },
          entries: { $sum: 1 }
        }
      },
      { $lookup: { from: 'employees', localField: '_id.employee_id', foreignField: '_id', as: 'employee' } },
      { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } }
    ]);

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTimesheet = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const query: any = { _id: id, deletedAt: null };

    // If employee, can only delete their own submitted (not approved/rejected) timesheets
    if (req.user!.role === 'employee') {
      query.employee_id = req.user!.employeeId || req.user!.id;
      query.status = TIMESHEET_STATUS.SUBMITTED;
    }

    const timesheet = await Timesheet.findOneAndUpdate(query, { deletedAt: new Date() });
    if (!timesheet) return res.status(404).json({ success: false, message: "Timesheet not found or cannot be deleted" });

    res.json({ success: true, message: "Timesheet deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
