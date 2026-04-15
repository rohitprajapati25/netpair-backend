import Employee from '../model/Employee.js';
import Attendance from '../model/Attendance.js';
import Task from '../model/Task.js';
import Timesheet from '../model/Timesheet.js';
import Leave from '../model/Leave.js';
import Project from '../model/Project.js';
import Asset from '../model/Asset.js';
import AuditLog from '../model/AuditLog.js';
import { ROLES } from '../constants/roles.js';
export const getDashboardStats = async (req, res) => {
    try {
        const user = req.user;
        const role = user?.role?.toLowerCase();
        // ── Today boundaries ────────────────────────────────────────────────────
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const todayStr = todayStart.toISOString().split('T')[0];
        // ── Role-specific stats ─────────────────────────────────────────────────
        if (role === ROLES.EMPLOYEE) {
            // Employee sees only their own data
            const empId = user.employeeId || user.id;
            const [myTasks, myLeaves, myTimesheets, myAttendance] = await Promise.all([
                Task.countDocuments({ assigned_to: empId, deletedAt: null }),
                Leave.countDocuments({ employeeId: empId }),
                Timesheet.countDocuments({ employee_id: empId, deletedAt: null }),
                Attendance.countDocuments({ employee: empId, status: 'Present' }),
            ]);
            return res.json({
                success: true,
                stats: { myTasks, myLeaves, myTimesheets, myAttendance }
            });
        }
        if (role === ROLES.HR) {
            const [presentToday, pendingLeaves, activeTasks, activeProjects] = await Promise.all([
                Attendance.countDocuments({ date: { $gte: todayStart, $lte: todayEnd }, status: 'Present' }),
                Leave.countDocuments({ status: 'Pending' }),
                Task.countDocuments({ status: { $in: ['In Progress', 'TODO'] }, deletedAt: null }),
                Project.countDocuments({ status: 'Ongoing', deletedAt: null }),
            ]);
            return res.json({
                success: true,
                stats: { presentToday, pendingLeaves, activeTasks, activeProjects }
            });
        }
        // ── Admin / SuperAdmin ──────────────────────────────────────────────────
        const [totalEmployees, presentToday, absentToday, lateToday, activeTasks, pendingTimesheets, pendingLeaves, activeProjects, totalAssets, totalAdmins, systemAlerts,] = await Promise.all([
            Employee.countDocuments({ status: 'active', deletedAt: null }),
            Attendance.countDocuments({ date: { $gte: todayStart, $lte: todayEnd }, status: 'Present' }),
            Attendance.countDocuments({ date: { $gte: todayStart, $lte: todayEnd }, status: 'Absent' }),
            Attendance.countDocuments({ date: { $gte: todayStart, $lte: todayEnd }, status: 'Late' }),
            Task.countDocuments({ status: { $in: ['In Progress', 'TODO'] }, deletedAt: null }),
            Timesheet.countDocuments({ status: 'Submitted', deletedAt: null }),
            Leave.countDocuments({ status: 'Pending' }),
            Project.countDocuments({ status: 'Ongoing', deletedAt: null }),
            Asset.countDocuments({ deletedAt: null }),
            Employee.countDocuments({ role: ROLES.ADMIN, status: 'active', deletedAt: null }),
            AuditLog.countDocuments({ severity: { $in: ['HIGH', 'WARNING'] }, createdAt: { $gte: todayStart } }),
        ]);
        // Attendance rate (last 7 days)
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 6);
        weekAgo.setHours(0, 0, 0, 0);
        const [weekPresent, weekTotal] = await Promise.all([
            Attendance.countDocuments({ date: { $gte: weekAgo }, status: 'Present' }),
            Attendance.countDocuments({ date: { $gte: weekAgo } }),
        ]);
        const attendanceRate = weekTotal > 0 ? Math.round((weekPresent / weekTotal) * 100) : 0;
        res.json({
            success: true,
            stats: {
                totalEmployees,
                presentToday,
                absentToday,
                lateToday,
                activeTasks,
                pendingTimesheets,
                pendingLeaves,
                activeProjects,
                totalAssets,
                totalAdmins,
                systemAlerts,
                attendanceRate,
            }
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Stats fetch failed' });
    }
};
export const getDashboardActivity = async (req, res) => {
    try {
        // Pull from AuditLog — real system events
        const logs = await AuditLog.find()
            .sort({ createdAt: -1 })
            .limit(15)
            .lean();
        const activity = logs.map((log) => ({
            _id: log._id,
            action: log.action?.replace(/_/g, ' ') || 'System Event',
            description: log.details || '',
            timestamp: log.createdAt,
            status: log.status === 'SUCCESS' ? 'success' : log.status === 'FAILED' ? 'error' : 'info',
            user: {
                name: log.user?.name || 'System',
                role: log.user?.role || '',
            },
            severity: log.severity,
            resource: log.resource,
        }));
        res.json({ success: true, activity });
    }
    catch (error) {
        console.error('Dashboard activity error:', error);
        res.status(500).json({ success: false, message: 'Activity fetch failed' });
    }
};
// ── Weekly attendance trend (last 7 days) ────────────────────────────────────
export const getDashboardAttendanceTrend = async (req, res) => {
    try {
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const start = new Date(d);
            start.setHours(0, 0, 0, 0);
            const end = new Date(d);
            end.setHours(23, 59, 59, 999);
            const [present, absent, late] = await Promise.all([
                Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'Present' }),
                Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'Absent' }),
                Attendance.countDocuments({ date: { $gte: start, $lte: end }, status: 'Late' }),
            ]);
            result.push({
                day: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
                Present: present,
                Absent: absent,
                Late: late,
            });
        }
        res.json({ success: true, trend: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=dashboardController.js.map