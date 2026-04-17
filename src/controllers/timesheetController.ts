import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Timesheet, { TIMESHEET_STATUS, ITimesheet } from '../model/Timesheet.js';
import Project from '../model/Project.js';
import Employee from '../model/Employee.js';
import User from '../model/User.js';
import Task from '../model/Task.js';
import { auditLog } from '../utils/auditLogger.js';

/** Resolve Employee._id from User._id (falls back to User._id if no Employee record found) */
const resolveEmployeeId = async (userId: string): Promise<any> => {
  const user = await User.findById(userId).select("email");
  if (user) {
    const emp = await Employee.findOne({ email: user.email }).select("_id");
    if (emp) return emp._id;
  }
  return userId;
};

export const submitTimesheet = async (req: Request, res: Response) => {
  try {
    const { date, project_id, task_id, hours_worked, work_description } = req.body;

    // Validate required fields
    if (!date || !project_id || !hours_worked || !work_description) {
      return res.status(400).json({ success: false, message: "date, project_id, hours_worked and work_description are required" });
    }

    const hours = Number(hours_worked);
    if (isNaN(hours) || hours < 0.5 || hours > 24) {
      return res.status(400).json({ success: false, message: "hours_worked must be between 0.5 and 24" });
    }

    if (work_description.trim().length < 10) {
      return res.status(400).json({ success: false, message: "work_description must be at least 10 characters" });
    }

    const project = await Project.findById(project_id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    // Validate task belongs to this project (if provided)
    if (task_id && mongoose.Types.ObjectId.isValid(task_id)) {
      const task = await Task.findOne({ _id: task_id, project_id, deletedAt: null });
      if (!task) return res.status(404).json({ success: false, message: "Task not found in this project" });
    }

    const employeeId = await resolveEmployeeId((req as any).user!.id);

    // Prevent duplicate: same employee, same project, same date
    const logDate = new Date(date);
    logDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(logDate); nextDay.setDate(nextDay.getDate() + 1);

    const duplicate = await Timesheet.findOne({
      employee_id: employeeId,
      project_id,
      date: { $gte: logDate, $lt: nextDay },
      deletedAt: null,
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `You already logged time for this project on ${logDate.toLocaleDateString("en-GB")}. Edit the existing entry instead.`,
      });
    }

    const timesheet = await Timesheet.create({
      date:             logDate,
      project_id,
      task_id:          (task_id && mongoose.Types.ObjectId.isValid(task_id)) ? task_id : undefined,
      employee_id:      employeeId,
      hours_worked:     hours,
      work_description: work_description.trim(),
      status:           TIMESHEET_STATUS.SUBMITTED,
    });

    const populated = await Timesheet.findById(timesheet._id)
      .populate("project_id",  "name projectCode")
      .populate("task_id",     "task_title")
      .populate("employee_id", "name")
      .lean();

    res.status(201).json({ success: true, message: "Timesheet submitted successfully", timesheet: populated });

    await auditLog(req, {
      action:   "TIMESHEET_SUBMIT",
      resource: "Timesheet System",
      details:  `Timesheet submitted — ${hours}h on ${date} for project "${project.name}"`,
      severity: "INFO",
      status:   "SUCCESS",
      meta:     { timesheetId: timesheet._id, projectId: project_id, hours },
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getTimesheets = async (req: Request, res: Response) => {
  try {
    const { employee_id, status, date, page = 1, limit = 200 } = req.query;
    const query: any = { deletedAt: null };

    if (employee_id || (req as any).user!.role === 'employee') {
      query.employee_id = employee_id || await resolveEmployeeId((req as any).user!.id);
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
      timesheet.approved_by = new mongoose.Types.ObjectId((req as any).user!.id);
    } else {
      timesheet.rejection_reason = rejection_reason;
    }

    await timesheet.save();
    await timesheet.populate('project_id task_id employee_id approved_by');

    res.json({ success: true, timesheet });

    // ── Audit log ────────────────────────────────────────────────────────────
    await auditLog(req, {
      action:   status === TIMESHEET_STATUS.APPROVED ? "TIMESHEET_APPROVED" : "TIMESHEET_REJECTED",
      resource: "Timesheet System",
      details:  `Timesheet ${status.toLowerCase()} (ID: ${id})${rejection_reason ? ` — Reason: ${rejection_reason}` : ""}`,
      severity: status === TIMESHEET_STATUS.REJECTED ? "WARNING" : "INFO",
      status:   "SUCCESS",
      meta:     { timesheetId: id, timesheetStatus: status },
    });
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
    const user   = (req as any).user;
    const query: any = { _id: id, deletedAt: null };

    // Employee can only delete their own SUBMITTED timesheets
    if (user.role === "employee") {
      query.employee_id = await resolveEmployeeId(user.id);
      query.status      = TIMESHEET_STATUS.SUBMITTED;
    }

    const timesheet = await Timesheet.findOneAndUpdate(
      query,
      { deletedAt: new Date() },
      { new: true }
    );
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: "Timesheet not found or cannot be deleted (only Submitted timesheets can be deleted)",
      });
    }

    res.json({ success: true, message: "Timesheet deleted" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
