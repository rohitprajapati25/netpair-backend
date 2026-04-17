import type { Request, Response } from "express";
import Announcement from "../model/Announcement.js";
import { ROLES } from "../constants/roles.js";

// ── GET — fetch announcements for current user's role ─────────────────────────
export const getAnnouncements = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const role = user?.role?.toLowerCase();
    const { page = "1", limit = "20" } = req.query;

    const pageNum  = Math.max(1, parseInt(page as string));
    const pageSize = Math.max(1, parseInt(limit as string));

    // Build query: show announcements targeted at this role OR "all"
    const query: any = { isActive: true };

    if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) {
      // Admins see everything
      query.targetRole = { $in: ["all", "admin", "hr", "employee"] };
    } else if (role === ROLES.HR) {
      query.targetRole = { $in: ["all", "hr"] };
    } else {
      query.targetRole = { $in: ["all", "employee"] };
    }

    // Exclude expired
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ];

    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Announcement.countDocuments(query),
    ]);

    res.json({
      success: true,
      announcements,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST — create announcement ────────────────────────────────────────────────
export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const role = user?.role?.toLowerCase();
    const { title, message, targetRole = "all", priority = "normal", expiresAt } = req.body;

    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: "Title and message are required" });
    }

    // HR can only target employees or all — not admin-only audiences
    const target = targetRole.toLowerCase();
    if (role === ROLES.HR && target === "admin") {
      return res.status(403).json({
        success: false,
        message: "HR can only broadcast to employees or all staff",
      });
    }

    const announcement = await Announcement.create({
      title:      title.trim(),
      message:    message.trim(),
      targetRole: target,
      priority,
      expiresAt:  expiresAt ? new Date(expiresAt) : undefined,
      createdBy: {
        id:   user.id,
        name: user.name || "Admin",
        role: user.role || "admin",
      },
    });

    res.status(201).json({ success: true, announcement });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE — soft delete (set isActive = false) ───────────────────────────────
export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user   = (req as any).user;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }

    // Only creator or superadmin can delete
    const isOwner      = announcement.createdBy.id.toString() === user.id;
    const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;
    const isAdmin      = user.role === ROLES.ADMIN;

    if (!isOwner && !isSuperAdmin && !isAdmin) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this announcement" });
    }

    announcement.isActive = false;
    await announcement.save();

    res.json({ success: true, message: "Announcement deleted" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
