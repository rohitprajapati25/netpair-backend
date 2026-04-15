import express from "express";
import { createEmployee, getEmployees, updateEmployee, deleteEmployee, getActiveEmployees, getCompanies, getEmployeesByCompany } from "../controllers/employeeController.js";
import { getAttendanceRecords, markAttendance, updateAttendance, deleteAttendance, getTodayAttendanceStats } from "../controllers/attendanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { ROLES } from "../constants/roles.js";
import { getLeaves, updateLeaveStatus } from "../controllers/leaveController.js";
import Project from "../model/Project.js";
import { getProjects, createProject, updateProject, deleteProject, getProjectStats, getProjectLogs } from "../controllers/projectController.js";
import multerConfig from '../middleware/multerConfig.js';
import { getAssets, createAsset, updateAsset, deleteAsset, getAssetStats } from "../controllers/assetController.js";
import { createTask, getTasks, updateTask, deleteTask, getTaskStats, updateTaskProgress, addTaskComment } from "../controllers/taskController.js";
import { getTimesheets, approveTimesheet, deleteTimesheet } from "../controllers/timesheetController.js";
import { getUnifiedReports } from '../controllers/reportsController.js';
import { getDashboardStats, getDashboardActivity, getDashboardAttendanceTrend } from "../controllers/dashboardController.js";
import { getSystemHealth } from "../controllers/healthController.js";
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from "../controllers/announcementController.js";
import { updateProfile, changePassword, getProfile } from "../controllers/settingsController.js";
const router = express.Router();
const upload = multerConfig;
// ===== EMPLOYEE ROUTES =====
router.post("/employees", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), createEmployee);
router.get("/employees", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getEmployees);
router.get("/active-employees", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getActiveEmployees);
router.get("/companies", protect, authorizeRoles(ROLES.SUPER_ADMIN), getCompanies);
router.get("/employees-by-company", protect, authorizeRoles(ROLES.SUPER_ADMIN), getEmployeesByCompany);
router.put("/employees/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), updateEmployee);
router.delete("/employees/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteEmployee);
// ===== ATTENDANCE ROUTES =====
// Static routes BEFORE parameterized routes
router.get("/attendance/today-stats", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getTodayAttendanceStats);
router.get("/attendance", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getAttendanceRecords);
router.post("/attendance/mark", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), markAttendance);
router.put("/attendance/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateAttendance);
router.delete("/attendance/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteAttendance);
// ===== LEAVE ROUTES =====
// HR also needs to view and manage leaves
router.get("/leaves", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getLeaves);
router.put("/leaves/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), updateLeaveStatus);
// ===== PROJECT ROUTES =====
// Static routes BEFORE parameterized routes
router.get("/projects/stats", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getProjectStats);
router.get("/projects/logs", protect, authorizeRoles(ROLES.SUPER_ADMIN), getProjectLogs);
// Employee can READ projects (needed for timesheet modal & my-projects page)
router.get("/projects", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE), getProjects);
router.post("/projects", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), upload.array('attachments', 5), createProject);
router.get("/projects/:id/progress", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).where({ deletedAt: null }).select('progress milestones');
        if (!project)
            return res.status(404).json({ success: false, message: 'Project not found' });
        res.json({ success: true, progress: project.progress || 0 });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.put("/projects/:id/progress", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
    try {
        const { progress } = req.body;
        const project = await Project.findByIdAndUpdate(req.params.id, { progress: Math.max(0, Math.min(100, Number(progress))) }, { new: true });
        if (!project)
            return res.status(404).json({ success: false });
        res.json({ success: true, progress: project.progress });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.get("/projects/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).where({ deletedAt: null })
            .populate('assignedEmployees', 'name designation department');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        res.json({ success: true, project });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
router.put("/projects/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateProject);
router.delete("/projects/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteProject);
// ===== ASSET ROUTES =====
// Static routes BEFORE parameterized routes
router.get("/assets/stats", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAssetStats);
router.get("/assets", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAssets);
router.post("/assets", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), createAsset);
router.put("/assets/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateAsset);
router.delete("/assets/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteAsset);
// ===== TASK ROUTES =====
// Static routes BEFORE parameterized routes
router.get("/tasks/stats", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getTaskStats);
router.post("/tasks", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), createTask);
router.get("/tasks", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getTasks);
router.put("/tasks/:id/progress", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE), updateTaskProgress);
router.post("/tasks/:id/comments", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE), addTaskComment);
router.put("/tasks/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateTask);
router.delete("/tasks/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteTask);
// ===== TIMESHEET ROUTES =====
router.get("/timesheets", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getTimesheets);
router.put("/timesheets/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), approveTimesheet);
router.delete("/timesheets/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), deleteTimesheet);
// ===== REPORTS =====
router.get("/reports", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getUnifiedReports);
// ===== ANNOUNCEMENTS =====
router.get("/announcements", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE), getAnnouncements);
router.post("/announcements", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), createAnnouncement);
router.delete("/announcements/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteAnnouncement);
// ===== HOLIDAYS / CALENDAR =====
import { getHolidays, createHoliday, updateHoliday, deleteHoliday } from "../controllers/holidayController.js";
router.get("/holidays", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE), getHolidays);
router.post("/holidays", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), createHoliday);
router.put("/holidays/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateHoliday);
router.delete("/holidays/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteHoliday);
// ===== DASHBOARD =====
router.get("/dashboard/stats", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE), getDashboardStats);
router.get("/dashboard/activity", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getDashboardActivity);
router.get("/dashboard/attendance-trend", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getDashboardAttendanceTrend);
router.get("/dashboard/health", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getSystemHealth);
// ===== SETTINGS =====
// All roles need access to their own profile and password
router.get("/profile", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE), getProfile);
router.put("/profile", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE), updateProfile);
router.post("/password", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE), changePassword);
// ===== AUDIT LOGS =====
// Queries the real AuditLog collection — written by auditLogger utility on every action
import AuditLog from '../model/AuditLog.js';
router.get("/audit-logs", protect, authorizeRoles(ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { page = '1', limit = '10', dateRange = 'week', search = '', action = 'All', severity = 'All', status = 'All', } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const pageSize = Math.max(1, parseInt(limit));
        // ── date range ──────────────────────────────────────────────────────────
        const now = new Date();
        let fromDate = null;
        if (dateRange === 'today') {
            fromDate = new Date(now);
            fromDate.setHours(0, 0, 0, 0);
        }
        else if (dateRange === 'week') {
            fromDate = new Date(now);
            fromDate.setDate(now.getDate() - 7);
            fromDate.setHours(0, 0, 0, 0);
        }
        else if (dateRange === 'month') {
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        // ── build query ─────────────────────────────────────────────────────────
        const query = {};
        if (fromDate)
            query.createdAt = { $gte: fromDate };
        if (action && action !== 'All')
            query.action = action;
        if (severity && severity !== 'All')
            query.severity = severity;
        if (status && status !== 'All')
            query.status = status;
        if (search) {
            const s = search;
            query.$or = [
                { 'user.name': { $regex: s, $options: 'i' } },
                { 'user.email': { $regex: s, $options: 'i' } },
                { action: { $regex: s, $options: 'i' } },
                { resource: { $regex: s, $options: 'i' } },
                { details: { $regex: s, $options: 'i' } },
            ];
        }
        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            AuditLog.countDocuments(query),
        ]);
        // Reshape for frontend
        const shaped = logs.map((l) => ({
            _id: l._id,
            timestamp: l.createdAt,
            action: l.action,
            resource: l.resource,
            details: l.details,
            severity: l.severity,
            status: l.status,
            ipAddress: l.ipAddress || '—',
            userAgent: l.userAgent || '—',
            device: {
                name: l.device?.name || 'Unknown Device',
                os: l.device?.os || '—',
                browser: l.device?.browser || '—',
                type: l.device?.type || 'Desktop',
            },
            user: {
                name: l.user?.name || '—',
                role: l.user?.role || '—',
                email: l.user?.email || '—',
            },
        }));
        res.json({ success: true, logs: shaped, total, page: pageNum, totalPages: Math.ceil(total / pageSize) });
    }
    catch (err) {
        console.error('Audit logs error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// DELETE single log — SuperAdmin only
router.delete("/audit-logs/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const deleted = await AuditLog.findByIdAndDelete(req.params.id);
        if (!deleted)
            return res.status(404).json({ success: false, message: 'Log not found' });
        res.json({ success: true, message: 'Log deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// DELETE all logs — SuperAdmin only (with optional dateRange filter)
router.delete("/audit-logs", protect, authorizeRoles(ROLES.SUPER_ADMIN), async (req, res) => {
    try {
        const { dateRange } = req.query;
        const query = {};
        if (dateRange === 'today') {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: start };
        }
        else if (dateRange === 'week') {
            const start = new Date();
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            query.createdAt = { $gte: start };
        }
        else if (dateRange === 'month') {
            const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            query.createdAt = { $gte: start };
        }
        // If no dateRange → delete ALL logs
        const result = await AuditLog.deleteMany(query);
        res.json({ success: true, deleted: result.deletedCount, message: `${result.deletedCount} logs deleted` });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
export default router;
//# sourceMappingURL=adminRoutes.js.map