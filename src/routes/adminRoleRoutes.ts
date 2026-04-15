import express from "express";
import { 
  createAdmin, getAdmins, updateAdmin, deleteAdmin 
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

router.post("/", protect, authorizeRoles(ROLES.SUPER_ADMIN), createAdmin);
router.get("/", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAdmins);
router.put("/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN), updateAdmin);
router.delete("/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN), deleteAdmin);

export default router;

