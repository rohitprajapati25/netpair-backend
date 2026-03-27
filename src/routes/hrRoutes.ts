import express from "express";
import { 
  createHR, getHRs, updateHR, deleteHR 
} from "../controllers/hrController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { ROLES } from "../../constants/roles.js";

const router = express.Router();

router.post("/", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), createHR);
router.get("/", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), getHRs);
router.put("/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateHR);
router.delete("/:id", protect, authorizeRoles(ROLES.SUPER_ADMIN), deleteHR);

export default router;

