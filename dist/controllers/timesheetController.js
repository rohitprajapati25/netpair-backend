import mongoose from 'mongoose';
import Timesheet, { TIMESHEET_STATUS } from '../model/Timesheet.js';
import Project from '../model/Project.js';
import { auditLog } from '../utils/auditLogger.js';
export const submitTimesheet = async (req, res) => {
    try {
        const { date, project_id, task_id, hours_worked, work_description } = req.body;
        const project = await Project.findById(project_id);
        if (!project)
            return res.status(404).json({ message: "Project not found" });
        const timesheet = new Timesheet({
            date: new Date(date),
            project_id,
            task_id: (task_id && mongoose.Types.ObjectId.isValid(task_id)) ? task_id : null,
            employee_id: req.user.employeeId || req.user.id,
            hours_worked,
            work_description,
            status: TIMESHEET_STATUS.SUBMITTED
        });
        await timesheet.save();
        await timesheet.populate([{ path: 'project_id', select: 'name projectCode' }, { path: 'task_id', select: 'task_title' }, { path: 'employee_id', select: 'name' }]);
        res.status(201).json(timesheet);
        // ── Audit log ────────────────────────────────────────────────────────────
        await auditLog(req, {
            action: "TIMESHEET_SUBMIT",
            resource: "Timesheet System",
            details: `Timesheet submitted — ${hours_worked}h on ${date} for project "${project.name}"`,
            severity: "INFO",
            status: "SUCCESS",
            meta: { timesheetId: timesheet._id, projectId: project_id, hours: hours_worked },
        });
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};
export const getTimesheets = async (req, res) => {
    try {
        const { employee_id, status, date, page = 1, limit = 10 } = req.query;
        const query = { deletedAt: null };
        if (employee_id || req.user.role === 'employee') {
            query.employee_id = employee_id || req.user.employeeId || req.user.id;
        }
        if (status)
            query.status = status;
        if (date)
            query.date = { $gte: new Date(date), $lte: new Date(date + 'T23:59:59') };
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const approveTimesheet = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;
        if (status !== TIMESHEET_STATUS.APPROVED && status !== TIMESHEET_STATUS.REJECTED) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }
        const timesheet = await Timesheet.findOne({ _id: id, deletedAt: null });
        if (!timesheet)
            return res.status(404).json({ message: "Timesheet not found" });
        timesheet.status = status;
        if (status === TIMESHEET_STATUS.APPROVED) {
            timesheet.approved_by = new mongoose.Types.ObjectId(req.user.id);
        }
        else {
            timesheet.rejection_reason = rejection_reason;
        }
        await timesheet.save();
        await timesheet.populate('project_id task_id employee_id approved_by');
        res.json({ success: true, timesheet });
        // ── Audit log ────────────────────────────────────────────────────────────
        await auditLog(req, {
            action: status === TIMESHEET_STATUS.APPROVED ? "TIMESHEET_APPROVED" : "TIMESHEET_REJECTED",
            resource: "Timesheet System",
            details: `Timesheet ${status.toLowerCase()} (ID: ${id})${rejection_reason ? ` — Reason: ${rejection_reason}` : ""}`,
            severity: status === TIMESHEET_STATUS.REJECTED ? "WARNING" : "INFO",
            status: "SUCCESS",
            meta: { timesheetId: id, timesheetStatus: status },
        });
    }
    catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
export const getProductivityReport = async (req, res) => {
    try {
        const { employee_id, period } = req.query; // period: 'week', 'month'
        // Implementation for reports (aggregate hours by employee/project)
        const match = { status: TIMESHEET_STATUS.APPROVED, deletedAt: null };
        if (employee_id)
            match.employee_id = employee_id;
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
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const deleteTimesheet = async (req, res) => {
    try {
        const { id } = req.params;
        const query = { _id: id, deletedAt: null };
        // If employee, can only delete their own submitted (not approved/rejected) timesheets
        if (req.user.role === 'employee') {
            query.employee_id = req.user.employeeId || req.user.id;
            query.status = TIMESHEET_STATUS.SUBMITTED;
        }
        const timesheet = await Timesheet.findByIdAndDelete(id);
        if (!timesheet)
            return res.status(404).json({ success: false, message: "Timesheet not found or cannot be deleted" });
        res.json({ success: true, message: "Timesheet deleted" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=timesheetController.js.map