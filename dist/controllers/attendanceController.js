import Attendance from "../model/Attendance.js";
import Employee from "../model/Employee.js";
import User from "../model/User.js";
import { ROLES } from "../constants/roles.js";
import { auditLog } from "../utils/auditLogger.js";
// ─────────────────────────────────────────────────────────────────────────────
// COMPANY SHIFT CONFIG  (9:00 AM – 6:00 PM)
// ─────────────────────────────────────────────────────────────────────────────
const SHIFT_START_H = 9; // 09:00
const SHIFT_START_M = 0;
const SHIFT_END_H = 18; // 18:00
const SHIFT_END_M = 0;
const SHIFT_START_MINS = SHIFT_START_H * 60 + SHIFT_START_M; // 540
const SHIFT_END_MINS = SHIFT_END_H * 60 + SHIFT_END_M; // 1080
const TOTAL_SHIFT_MINS = SHIFT_END_MINS - SHIFT_START_MINS; // 540 (9 hrs)
/** "HH:MM" → total minutes since midnight */
const timeToMins = (t) => {
    const parts = t.split(":");
    const h = parseInt(parts[0] ?? "0", 10);
    const m = parseInt(parts[1] ?? "0", 10);
    return h * 60 + m;
};
/** minutes since midnight → "HH:MM" */
const minsToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};
/** Calculate working minutes between two "HH:MM" strings */
const calcWorkingMins = (checkIn, checkOut) => {
    const inMins = timeToMins(checkIn);
    const outMins = timeToMins(checkOut);
    let diff = outMins - inMins;
    if (diff < 0)
        diff += 1440; // overnight (rare)
    return diff;
};
/** Determine status from checkIn time */
const deriveStatus = (checkInTime) => {
    const inMins = timeToMins(checkInTime);
    if (inMins > SHIFT_START_MINS)
        return "Late"; // after 09:00 = Late
    return "Present";
};
export const getAttendanceRecords = async (req, res) => {
    try {
        const { search, status, department, dateFrom, dateTo, page = 1, limit = 20 } = req.query;
        const requestingUser = req.user;
        const query = {};
        // ── SECURITY: employees can only see their own records ──────────────────
        if (requestingUser.role === ROLES.EMPLOYEE) {
            const user = await User.findById(requestingUser.id).select("email");
            if (user) {
                const emp = await Employee.findOne({ email: user.email }).select("_id");
                if (emp)
                    query.employee = emp._id;
                else
                    return res.json({ success: true, records: [], pagination: { current: 1, pages: 0, total: 0 } });
            }
        }
        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom)
                query.date.$gte = new Date(dateFrom);
            if (dateTo)
                query.date.$lte = new Date(dateTo + 'T23:59:59.999Z');
        }
        if (search) {
            const users = await User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ],
                role: { $in: [ROLES.EMPLOYEE, ROLES.HR] }
            });
            query.employee = { $in: users.map((u) => u._id) };
        }
        if (status && status !== 'All')
            query.status = status;
        console.log('🔍 Attendance query:', JSON.stringify(query));
        if (department && department !== 'All') {
            const users = await User.find({ department, role: { $in: [ROLES.EMPLOYEE, ROLES.HR] } });
            query.employee = { $in: users.map((u) => u._id) };
        }
        const records = await Attendance.find(query)
            .populate('employee', 'name department designation workMode shiftType locationType')
            .populate('createdBy', 'name')
            .sort({ date: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Attendance.countDocuments(query);
        res.json({
            success: true,
            records: records,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attendance records'
        });
    }
};
export const markAttendance = async (req, res) => {
    try {
        const { employeeId, status, workMode, checkIn, checkOut, notes, date } = req.body;
        console.log('Mark attendance body:', req.body);
        let workingHours = 0;
        if (checkIn && checkOut) {
            const [h1, m1] = checkIn.split(':').map(Number);
            const [h2, m2] = checkOut.split(':').map(Number);
            let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diff < 0)
                diff += 1440;
            workingHours = diff;
        }
        const attendanceDate = date ? new Date(date) : new Date();
        // JOIN DATE VALIDATION
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }
        if (!employee.joiningDate) {
            return res.status(400).json({
                success: false,
                message: 'Employee joining date not set'
            });
        }
        const joinDateStart = new Date(employee.joiningDate);
        joinDateStart.setHours(0, 0, 0, 0);
        const attDateStart = new Date(attendanceDate);
        attDateStart.setHours(0, 0, 0, 0);
        if (attDateStart < joinDateStart) {
            return res.status(400).json({
                success: false,
                message: `Cannot mark attendance before employee's joining date (${joinDateStart.toLocaleDateString('en-IN')}). Selected date: ${attDateStart.toLocaleDateString('en-IN')}`
            });
        }
        // DUPLICATE CHECK
        const existing = await Attendance.findOne({
            employee: employeeId,
            date: {
                $gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
                $lte: new Date(attendanceDate.setHours(23, 59, 59, 999))
            }
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Employee "${employee.name}" already has attendance for ${attendanceDate.toLocaleDateString('en-IN')}. Please EDIT the existing record.`
            });
        }
        const attendance = {
            employee: employeeId,
            date: attendanceDate,
            status: status || 'Absent',
            workMode: status === 'Absent' ? null : (workMode || ''),
            checkIn: checkIn || (status !== 'Absent' ? minsToTime(SHIFT_START_MINS) : undefined),
            checkOut: checkOut || (status !== 'Absent' ? minsToTime(SHIFT_END_MINS) : undefined),
            workingHours,
            notes,
            createdBy: req.user.id
        };
        console.log('Creating attendance:', attendance);
        const newRecord = await Attendance.create(attendance);
        const populated = await Attendance.findById(newRecord._id)
            .populate('employee', 'name department designation');
        res.status(201).json({
            success: true,
            message: 'Attendance marked successfully!',
            attendance: populated
        });
        // ── Audit log ────────────────────────────────────────────────────────────
        await auditLog(req, {
            action: "ATTENDANCE_MARK",
            resource: "Attendance System",
            details: `${employee.name} marked as "${status || 'Absent'}" on ${attendanceDate.toLocaleDateString('en-IN')}`,
            severity: status === 'Absent' ? "WARNING" : status === 'Late' ? "MEDIUM" : "INFO",
            status: "SUCCESS",
            meta: { employeeId, attendanceDate, attendanceStatus: status },
        });
    }
    catch (error) {
        console.error('Mark attendance error:', error);
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'Duplicate attendance. Employee already marked for this date. Please edit existing.'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to mark attendance'
        });
    }
};
export const updateAttendance = async (req, res) => {
    try {
        console.log('Update body:', req.body);
        const { id } = req.params;
        const { date, status, checkIn, checkOut, workMode, notes } = req.body;
        const user = req.user;
        const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;
        const attendance = await Attendance.findById(id);
        if (!attendance) {
            return res.status(404).json({ success: false, message: 'Attendance not found' });
        }
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (attendance.date < thirtyDaysAgo && !isSuperAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Can only edit recent records (30 days)'
            });
        }
        // JOIN DATE VALIDATION FOR DATE UPDATES
        if (date !== undefined) {
            const employee = await Employee.findById(attendance.employee);
            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: 'Employee not found'
                });
            }
            if (!employee.joiningDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Employee joining date not set'
                });
            }
            const joinDateStart = new Date(employee.joiningDate);
            joinDateStart.setHours(0, 0, 0, 0);
            const newAttDateStart = new Date(date);
            newAttDateStart.setHours(0, 0, 0, 0);
            if (newAttDateStart < joinDateStart) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot update attendance date before employee's joining date (${joinDateStart.toLocaleDateString('en-IN')}). New date: ${newAttDateStart.toLocaleDateString('en-IN')}`
                });
            }
        }
        const updates = {};
        if (date !== undefined)
            updates.date = new Date(date);
        if (status !== undefined)
            updates.status = status;
        if (checkIn !== undefined)
            updates.checkIn = checkIn;
        if (checkOut !== undefined)
            updates.checkOut = checkOut;
        if (workMode !== undefined)
            updates.workMode = workMode;
        if (notes !== undefined)
            updates.notes = notes;
        if (updates.status === 'Absent') {
            updates.workMode = null;
            updates.checkIn = null;
            updates.checkOut = null;
            updates.workingHours = 0;
        }
        // ── Recalculate workingHours if checkIn or checkOut changed ─────────────
        const finalCheckIn = updates.checkIn ?? attendance.checkIn;
        const finalCheckOut = updates.checkOut ?? attendance.checkOut;
        if (finalCheckIn && finalCheckOut && updates.status !== 'Absent') {
            updates.workingHours = calcWorkingMins(finalCheckIn, finalCheckOut);
        }
        // ── Re-derive status from checkIn if not explicitly set ─────────────────
        if (updates.checkIn && !updates.status) {
            updates.status = deriveStatus(updates.checkIn);
        }
        const updated = await Attendance.findByIdAndUpdate(id, {
            ...updates,
            updatedBy: user.id
        }, { new: true, runValidators: true, returnDocument: 'after' })?.populate('employee', 'name department designation');
        console.log('Updated attendance:', updated);
        res.json({
            success: true,
            message: 'Attendance updated successfully',
            attendance: updated
        });
    }
    catch (error) {
        console.error('Update error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Update failed'
        });
    }
};
export const deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        await Attendance.findByIdAndDelete(id);
        res.json({
            success: true,
            message: 'Attendance deleted'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Delete failed'
        });
    }
};
// TODAY STATS - Only today's Present/Absent count
export const getTodayAttendanceStats = async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const stats = await Attendance.aggregate([
            {
                $match: {
                    date: {
                        $gte: todayStart,
                        $lte: todayEnd
                    }
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        const result = { present: 0, absent: 0 };
        stats.forEach(stat => {
            if (stat._id === 'Present')
                result.present = stat.count;
            if (stat._id === 'Absent')
                result.absent = stat.count;
        });
        res.json({
            success: true,
            stats: result,
            todayDate: todayStart.toISOString().split('T')[0]
        });
    }
    catch (error) {
        console.error('Today stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch today stats'
        });
    }
};
// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE SELF CHECK-IN / CHECK-OUT
// ─────────────────────────────────────────────────────────────────────────────
/** GET /api/employees/attendance/today — returns today's record for the logged-in employee */
export const getTodayStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        // Find the Employee doc that matches this user (by email via User model)
        const user = await User.findById(userId).select("email");
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        const employee = await Employee.findOne({ email: user.email }).select("_id name joiningDate");
        if (!employee) {
            return res.json({ success: true, record: null, employeeId: null });
        }
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const record = await Attendance.findOne({
            employee: employee._id,
            date: { $gte: todayStart, $lte: todayEnd },
        });
        res.json({ success: true, record: record || null, employeeId: employee._id });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
/** POST /api/employees/attendance/checkin — employee marks themselves Present with current time */
export const checkIn = async (req, res) => {
    try {
        const userId = req.user.id;
        const { workMode = "Office", notes = "" } = req.body;
        const user = await User.findById(userId).select("email");
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        const employee = await Employee.findOne({ email: user.email }).select("_id name joiningDate");
        if (!employee)
            return res.status(404).json({ success: false, message: "Employee record not found" });
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        // Duplicate check
        const existing = await Attendance.findOne({
            employee: employee._id,
            date: { $gte: todayStart, $lte: todayEnd },
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "You have already checked in today.",
                record: existing,
            });
        }
        // Determine status: after 09:00 = Late  (company shift 09:00–18:00)
        const checkInTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const status = deriveStatus(checkInTime);
        const record = await Attendance.create({
            employee: employee._id,
            date: todayStart,
            checkIn: checkInTime,
            status,
            workMode,
            notes,
            createdBy: userId,
        });
        const populated = await Attendance.findById(record._id)
            .populate("employee", "name department designation");
        res.status(201).json({
            success: true,
            message: `Checked in at ${checkInTime}${status === "Late" ? " (Late)" : ""}`,
            record: populated,
            shiftInfo: {
                shiftStart: minsToTime(SHIFT_START_MINS),
                shiftEnd: minsToTime(SHIFT_END_MINS),
                status,
            },
        });
        await auditLog(req, {
            action: "ATTENDANCE_MARK",
            resource: "Attendance System",
            details: `${employee.name} self check-in at ${checkInTime} — ${status}`,
            severity: status === "Late" ? "WARNING" : "INFO",
            status: "SUCCESS",
            meta: { employeeId: employee._id, checkInTime, status },
        });
    }
    catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: "Already checked in today." });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};
/** POST /api/employees/attendance/checkout — employee records check-out time */
export const checkOut = async (req, res) => {
    try {
        const userId = req.user.id;
        const { notes } = req.body;
        const user = await User.findById(userId).select("email");
        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });
        const employee = await Employee.findOne({ email: user.email }).select("_id name");
        if (!employee)
            return res.status(404).json({ success: false, message: "Employee record not found" });
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        const record = await Attendance.findOne({
            employee: employee._id,
            date: { $gte: todayStart, $lte: todayEnd },
        });
        if (!record) {
            return res.status(404).json({
                success: false,
                message: "No check-in found for today. Please check in first.",
            });
        }
        if (record.checkOut) {
            return res.status(409).json({
                success: false,
                message: "You have already checked out today.",
                record,
            });
        }
        const checkOutTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        // Calculate working minutes using shift-aware helper
        let workingHours = 0;
        if (record.checkIn) {
            workingHours = calcWorkingMins(record.checkIn, checkOutTime);
        }
        // Detect early checkout (before 18:00)
        const checkOutMins = timeToMins(checkOutTime);
        const isEarlyCheckout = checkOutMins < SHIFT_END_MINS;
        const earlyByMins = isEarlyCheckout ? SHIFT_END_MINS - checkOutMins : 0;
        const updated = await Attendance.findByIdAndUpdate(record._id, { checkOut: checkOutTime, workingHours, ...(notes && { notes }), updatedBy: userId }, { new: true }).populate("employee", "name department designation");
        const hoursDisplay = `${Math.floor(workingHours / 60)}h ${workingHours % 60}m`;
        res.json({
            success: true,
            message: `Checked out at ${checkOutTime} · ${hoursDisplay} worked`,
            record: updated,
            shiftInfo: {
                shiftEnd: minsToTime(SHIFT_END_MINS),
                isEarlyCheckout,
                earlyByMins,
                totalShiftMins: TOTAL_SHIFT_MINS,
                workedMins: workingHours,
            },
        });
        await auditLog(req, {
            action: "ATTENDANCE_MARK",
            resource: "Attendance System",
            details: `${employee.name} checked out at ${checkOutTime} — ${hoursDisplay} worked`,
            severity: "INFO",
            status: "SUCCESS",
            meta: { employeeId: employee._id, checkOutTime, workingHours },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
//# sourceMappingURL=attendanceController.js.map