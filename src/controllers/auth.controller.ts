import type { Request, Response } from "express";
import User from "../model/User.js";
import Employee from "../model/Employee.js";
import HR from "../model/HR.js";
import Admin from "../model/Admin.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { auditLoginLog, auditLog } from "../utils/auditLogger.js";
import sendEmail from "../utils/sendEmail.js";

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
        message: `Your account is ${normalizedStatus}. Please contact admin to activate your account.`
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

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Find user across all models
    let user = await User.findOne({ email });
    if (!user) user = await Employee.findOne({ email });
    if (!user) user = await HR.findOne({ email });
    if (!user) user = await Admin.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with this email" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and set to user model
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

    await user.save({ validateBeforeSave: false });

    // Create reset URL - Added fallback to localhost:5173
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const message = `Password Reset Link: ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You requested a password reset. Click the button below to set a new password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">If you cannot click the button, copy and paste this URL into your browser:</p>
            <p style="color: #2563eb; font-size: 12px;">${resetUrl}</p>
          </div>
        `,
      });

      await auditLog(req, {
        action: "PASSWORD_RESET_REQUEST",
        resource: "Authentication",
        details: `Password reset link sent to ${email}`,
        severity: "INFO"
      });

      res.status(200).json({ success: true, message: "Email sent" });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error("Email send error:", err);
      return res.status(500).json({ success: false, message: "Email could not be sent" });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const tokenStr = req.params.token;
    if (!tokenStr) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(String(tokenStr))
      .digest('hex');

    // Find user by token and check expiration across all models
    const query = {
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() },
    };

    let user = await User.findOne(query);
    if (!user) user = await Employee.findOne(query);
    if (!user) user = await HR.findOne(query);
    if (!user) user = await Admin.findOne(query);

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    await auditLog(req, {
      action: "PASSWORD_RESET_SUCCESS",
      resource: "Authentication",
      details: `Password reset successful for ${user.email}`,
      severity: "MEDIUM"
    });

    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

