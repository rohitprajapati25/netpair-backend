import type { Request, Response } from "express";
import User from "../model/User.js";
import Employee from "../model/Employee.js";
import HR from "../model/HR.js";
import Admin from "../model/Admin.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { auditLoginLog } from "../utils/auditLogger.js";

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Multi-model search
    let user = await User.findOne({ email }).select('+password');
    let userType = 'user';

    if (!user) {
      user = await Employee.findOne({ email }).select('+password');
      userType = 'employee';
    }
    if (!user) {
      user = await HR.findOne({ email }).select('+password');
      userType = 'hr';
    }
    if (!user) {
      user = await Admin.findOne({ email }).select('+password');
      userType = 'admin';
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log(`🔍 Login [${userType}] - Email: ${email}, Status:`, user.status, `(raw: '${user.status}')`);

    // Password check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await auditLoginLog(req,
        { id: user._id.toString(), name: user.name, role: user.role || "unknown", email },
        false, `Failed login — wrong password for ${email}`
      );
      return res.status(400).json({ message: "Invalid Password" });
    }

    // FIXED: Case-insensitive status check + normalize
    const normalizedStatus = user.status.toString().toLowerCase().trim();
    console.log("Normalized status:", normalizedStatus);

    if (normalizedStatus !== "active") {
      await auditLoginLog(req,
        { id: user._id.toString(), name: user.name, role: user.role || "unknown", email },
        false, `Login blocked — account status: ${normalizedStatus}`
      );
      return res.status(403).json({ 
        success: false, 
        message: `Account status '${normalizedStatus}' - Contact admin for activation.` 
      });
    }

    const tokenRole = user.role || 'employee';
    const token = jwt.sign(
      { id: user._id, role: tokenRole },
      process.env.JWT_SECRET as string,
      { expiresIn: "30m" }
    );

    // ── Audit: successful login ──────────────────────────────────────────────
    await auditLoginLog(req,
      { id: user._id.toString(), name: user.name, role: tokenRole, email: user.email },
      true, `${user.name} (${tokenRole}) logged in successfully`
    );

    res.status(200).json({
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: tokenRole,
        status: normalizedStatus,
        type: userType,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

