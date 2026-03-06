import express from "express";
import { createUser } from "../controllers/adminController";
import { protect } from "../middleware/authMiddleware";
import { authorizeRoles } from "../middleware/roleMiddleware";

const router = express.Router();

router.post(
  "/create-user",
  protect,
  authorizeRoles("superadmin", "admin", "hr"), 
  createUser
);

export default router;