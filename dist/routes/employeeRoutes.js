import express from "express";
import { createEmployee, getEmployees, updateEmployee, deleteEmployee, getActiveEmployees, loginEmployee } from "../controllers/employeeController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { ROLES } from "../constants/roles.js";
const router = express.Router();
router.post("/", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), createEmployee);
router.get("/", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getEmployees);
router.get("/active", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getActiveEmployees);
router.put("/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), updateEmployee);
router.delete("/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteEmployee);
router.post("/login", loginEmployee);
// ===== EMPLOYEE LEAVE APPLY =====
import { createLeave, getLeaves, cancelLeave } from "../controllers/leaveController.js";
router.post("/leaves", protect, authorizeRoles(ROLES.EMPLOYEE, ROLES.HR), createLeave);
router.get("/leaves", protect, authorizeRoles(ROLES.EMPLOYEE), getLeaves); // My own leaves
router.delete("/leaves/:id", protect, authorizeRoles(ROLES.EMPLOYEE), cancelLeave);
// ===== EMPLOYEE ATTENDANCE =====
import { getAttendanceRecords, checkIn, checkOut, getTodayStatus } from "../controllers/attendanceController.js";
router.get("/attendance", protect, authorizeRoles(ROLES.EMPLOYEE), getAttendanceRecords);
router.get("/attendance/today", protect, authorizeRoles(ROLES.EMPLOYEE), getTodayStatus);
router.post("/attendance/checkin", protect, authorizeRoles(ROLES.EMPLOYEE), checkIn);
router.post("/attendance/checkout", protect, authorizeRoles(ROLES.EMPLOYEE), checkOut);
// ===== TASK & TIMESHEET - Employee =====
import { getTasks, updateTask, deleteTask, updateTaskProgress, addTaskComment } from "../controllers/taskController.js";
import { submitTimesheet, getTimesheets, deleteTimesheet } from "../controllers/timesheetController.js";
router.get("/tasks", protect, authorizeRoles(ROLES.EMPLOYEE), getTasks); // My assigned tasks
router.put("/tasks/:id", protect, authorizeRoles(ROLES.EMPLOYEE), updateTask);
router.put("/tasks/:id/progress", protect, authorizeRoles(ROLES.EMPLOYEE), updateTaskProgress);
router.post("/tasks/:id/comments", protect, authorizeRoles(ROLES.EMPLOYEE), addTaskComment);
router.delete("/tasks/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteTask);
router.post("/timesheets", protect, authorizeRoles(ROLES.EMPLOYEE), submitTimesheet);
router.get("/timesheets", protect, authorizeRoles(ROLES.EMPLOYEE), getTimesheets);
router.delete("/timesheets/:id", protect, authorizeRoles(ROLES.EMPLOYEE), deleteTimesheet);
// ===== EMPLOYEE PROFILE & SETTINGS =====
import { updateProfile, changePassword, getProfile } from "../controllers/settingsController.js";
router.get("/profile", protect, authorizeRoles(ROLES.EMPLOYEE), getProfile);
router.put("/profile", protect, authorizeRoles(ROLES.EMPLOYEE), updateProfile);
router.post("/password", protect, authorizeRoles(ROLES.EMPLOYEE), changePassword);
export default router;
//# sourceMappingURL=employeeRoutes.js.map