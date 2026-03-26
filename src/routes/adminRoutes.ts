import express from "express";
import { createEmployee, getEmployees, updateEmployee, deleteEmployee, getActiveEmployees } from "../controllers/employeeController.js";
import { getAttendanceRecords, markAttendance, updateAttendance, deleteAttendance } from "../controllers/attendanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { ROLES } from "../../constants/roles.js";

const router = express.Router();

router.post("/employees", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), createEmployee);  // ✅ Role-specific dual save: RoleCollection + User
router.get("/employees", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getEmployees);
router.put("/employees/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), updateEmployee);

router.delete("/employees/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteEmployee);

router.get("/active-employees", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getActiveEmployees);

router.get("/attendance", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getAttendanceRecords);
router.post("/attendance/mark", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), markAttendance);
router.put("/attendance/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateAttendance);
router.delete("/attendance/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteAttendance);

export default router;