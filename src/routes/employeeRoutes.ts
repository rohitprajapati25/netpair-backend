import express from "express";
import { createEmployee, getEmployees, updateEmployee, deleteEmployee, getActiveEmployees, loginEmployee } from "../controllers/employeeController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { ROLES } from "../../constants/roles.js";

const router = express.Router();

router.post("/", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), createEmployee);
router.get("/", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getEmployees);
router.get("/active", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getActiveEmployees);
router.put("/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), updateEmployee);
router.delete("/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteEmployee);
router.post("/login", loginEmployee);

// ===== EMPLOYEE LEAVE APPLY =====
import { createLeave } from "../controllers/leaveController.js";
router.post("/leaves", protect, authorizeRoles(ROLES.EMPLOYEE, ROLES.HR), createLeave);

// ===== TASK & TIMESHEET - Employee =====
import { getTasks, updateTask, deleteTask } from "../controllers/taskController.js";
import { submitTimesheet, deleteTimesheet } from "../controllers/timesheetController.js";

router.get("/tasks", protect, authorizeRoles(ROLES.EMPLOYEE), getTasks); // My assigned tasks
router.put("/tasks/:id", protect, authorizeRoles(ROLES.EMPLOYEE), updateTask);
router.delete("/tasks/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteTask);
router.post("/timesheets", protect, authorizeRoles(ROLES.EMPLOYEE), submitTimesheet);
router.delete("/timesheets/:id", protect, authorizeRoles(ROLES.EMPLOYEE), deleteTimesheet);

export default router;
