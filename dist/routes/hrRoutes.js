import express from "express";
import { createHR, getHRs, updateHR, deleteHR } from "../controllers/hrController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { ROLES } from "../constants/roles.js";
const router = express.Router();
router.post("/", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), createHR);
router.get("/", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getHRs);
router.put("/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateHR);
router.delete("/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN), deleteHR);
// ===== TIMESHEET APPROVAL - HR =====
import { getTimesheets, approveTimesheet } from "../controllers/timesheetController.js";
router.get("/timesheets", protect, authorizeRoles(ROLES.HR), getTimesheets);
router.put("/timesheets/:id", protect, authorizeRoles(ROLES.HR), approveTimesheet);
// ===== HR PROFILE & SETTINGS =====
import { updateProfile, changePassword, getProfile } from "../controllers/settingsController.js";
router.get("/profile", protect, authorizeRoles(ROLES.HR), getProfile);
router.put("/profile", protect, authorizeRoles(ROLES.HR), updateProfile);
router.post("/password", protect, authorizeRoles(ROLES.HR), changePassword);
export default router;
//# sourceMappingURL=hrRoutes.js.map