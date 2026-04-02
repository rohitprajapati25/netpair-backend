import express from "express";
import { createEmployee, getEmployees, updateEmployee, deleteEmployee, getActiveEmployees, getCompanies, getEmployeesByCompany } from "../controllers/employeeController.js";
import { getAttendanceRecords, markAttendance, updateAttendance, deleteAttendance, getTodayAttendanceStats } from "../controllers/attendanceController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { ROLES } from "../../constants/roles.js";

const router = express.Router();

router.post("/employees", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), createEmployee);  // ✅ Role-specific dual save: RoleCollection + User
router.get("/employees", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getEmployees);
router.put("/employees/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), updateEmployee);

router.delete("/employees/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteEmployee);

router.get("/active-employees", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getActiveEmployees);
router.get("/companies", protect, authorizeRoles(ROLES.SUPER_ADMIN), getCompanies);
router.get("/employees-by-company", protect, authorizeRoles(ROLES.SUPER_ADMIN), getEmployeesByCompany);

router.get("/attendance", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getAttendanceRecords);
router.post("/attendance/mark", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), markAttendance);
router.put("/attendance/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateAttendance);
router.delete("/attendance/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteAttendance);

router.get("/attendance/today-stats", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getTodayAttendanceStats);

// ===== LEAVE ROUTES - Admin/SuperAdmin =====
import { getLeaves, updateLeaveStatus } from "../controllers/leaveController.js";

router.get("/leaves", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getLeaves);
router.put("/leaves/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateLeaveStatus);

// ===== PROJECT ROUTES =====

import Project from "../model/Project.js";
import { 
  getProjects, 
  createProject, 
  updateProject, 
  deleteProject, 
  getProjectStats, 
  getProjectLogs
 } from "../controllers/projectController.js";

import multerConfig from '../middleware/multerConfig.js';
const upload = multerConfig.default || multerConfig;

router.get("/projects", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getProjects);
// TODO: Add getProjectById controller
router.get("/projects/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).where({ deletedAt: null })
      .populate('assignedEmployees', 'name designation department');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    res.json({ success: true, project });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.post("/projects", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), upload.array('attachments', 5), createProject);
router.put("/projects/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateProject);
router.delete("/projects/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteProject);
router.get("/projects/stats", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getProjectStats);
router.get("/projects/logs", protect, authorizeRoles(ROLES.SUPER_ADMIN), getProjectLogs);
// TODO: Add getProjectProgress controller
router.get("/projects/:id/progress", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).where({ deletedAt: null }).select('progress milestones');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, progress: project.progress || 0 });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// TODO: Add updateProgress controller
router.put("/projects/:id/progress", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), async (req, res) => {
  try {
    const { progress } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { progress: Math.max(0, Math.min(100, Number(progress))) },
      { new: true }
    );
    if (!project) return res.status(404).json({ success: false });
    res.json({ success: true, progress: project.progress });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ===== ASSET ROUTES =====
import { 
  getAssets, 
  createAsset, 
  updateAsset, 
  deleteAsset, 
  getAssetStats 
} from "../controllers/assetController.js";

// ===== TASK ROUTES - Admin =====
import { 
  createTask, getTasks, updateTask, deleteTask, getTaskStats 
} from "../controllers/taskController.js";
import { getTimesheets, approveTimesheet, deleteTimesheet } from "../controllers/timesheetController.js";

router.get("/assets", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAssets);
router.post("/assets", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), createAsset);
router.put("/assets/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateAsset);
router.delete("/assets/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteAsset);
router.get("/assets/stats", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAssetStats);

router.post("/tasks", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), createTask);
router.get("/tasks", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getTasks);
router.put("/tasks/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateTask);
router.delete("/tasks/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteTask);
router.get("/tasks/stats", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getTaskStats);

router.get("/timesheets", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), getTimesheets);
router.put("/timesheets/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), approveTimesheet);
router.delete("/timesheets/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR), deleteTimesheet);

export default router;
