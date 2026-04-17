import type { Request, Response } from "express";
import mongoose from "mongoose";
import Leave from "../model/Leave.js";
import User from "../model/User.js";
import { auditLog } from "../utils/auditLogger.js";

// ─── helpers ──────────────────────────────────────────────────────────────────
const POPULATE_EMPLOYEE = { path: "employeeId", select: "name email department designation phone", model: "User" };
const POPULATE_APPROVER  = { path: "approvedBy",  select: "name email role",                        model: "User" };

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/leaves  — Admin / HR / SuperAdmin
// Supports: search (employee name/email), status, type, pagination
// ─────────────────────────────────────────────────────────────────────────────
export const getLeaves = async (req: Request, res: Response) => {
  try {
    const {
      page      = "1",
      limit     = "10",
      search    = "",
      status,
      type: leaveType,
    } = req.query as Record<string, string>;

    const pageNum  = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(100, parseInt(limit)));

    // ── Build base query ──────────────────────────────────────────────────────
    const query: any = {};
    if (status    && status    !== "All") query.status = status;
    if (leaveType && leaveType !== "All") query.type   = leaveType;

    // ── Search: match employee name/email via $lookup ─────────────────────────
    // We can't $regex on a populated ref — use aggregation instead when search is present
    if (search.trim()) {
      // Find matching user IDs first, then filter leaves
      const matchedUsers = await User.find({
        $or: [
          { name:  { $regex: search.trim(), $options: "i" } },
          { email: { $regex: search.trim(), $options: "i" } },
        ],
      }).select("_id").lean();

      const ids = matchedUsers.map((u: any) => u._id);
      query.employeeId = { $in: ids };
    }

    const [leaves, total] = await Promise.all([
      Leave.find(query)
        .populate(POPULATE_EMPLOYEE)
        .populate(POPULATE_APPROVER)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Leave.countDocuments(query),
    ]);

    // ── Stats (always over full unfiltered set for the cards) ─────────────────
    const [pending, approved, rejected, totalAll] = await Promise.all([
      Leave.countDocuments({ status: "Pending" }),
      Leave.countDocuments({ status: "Approved" }),
      Leave.countDocuments({ status: "Rejected" }),
      Leave.countDocuments({}),
    ]);

    res.json({
      success: true,
      leaves,
      stats: { pending, approved, rejected, total: totalAll },
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    console.error("GET_LEAVES_ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/leaves/:id  — Admin / HR / SuperAdmin
// Approve or Reject a pending leave. HR can also add a rejection reason.
// ─────────────────────────────────────────────────────────────────────────────
export const updateLeaveStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const actorId = (req as any).user?.id;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Approved or Rejected",
      });
    }

    const leave = await Leave.findById(id).populate(POPULATE_EMPLOYEE);
    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot change a ${leave.status} leave — only Pending leaves can be updated`,
      });
    }

    // Update fields
    leave.status     = status;
    leave.approvedBy = new mongoose.Types.ObjectId(actorId);
    leave.approvedAt = new Date();
    if (status === "Rejected" && rejectionReason?.trim()) {
      leave.rejectionReason = rejectionReason.trim();
    }
    await leave.save();

    const updated = await Leave.findById(id)
      .populate(POPULATE_EMPLOYEE)
      .populate(POPULATE_APPROVER)
      .lean();

    res.json({
      success: true,
      message: `Leave ${status === "Approved" ? "approved" : "rejected"} successfully`,
      leave: updated,
    });

    // Audit
    await auditLog(req, {
      action:   status === "Approved" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
      resource: "Leave Management",
      details:  `Leave ${status.toLowerCase()} for ${(leave.employeeId as any)?.name || "Employee"}`,
      severity: status === "Rejected" ? "WARNING" : "INFO",
      status:   "SUCCESS",
      meta:     { leaveId: id, leaveStatus: status },
    });
  } catch (err: any) {
    console.error("UPDATE_LEAVE_STATUS_ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/employees/leaves  — Employee / HR (applying for self)
// ─────────────────────────────────────────────────────────────────────────────
export const createLeave = async (req: Request, res: Response) => {
  try {
    const { type, fromDate, toDate, reason } = req.body;
    const userId = (req as any).user?.id;

    // Validate required fields
    if (!type || !fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "type, fromDate and toDate are required",
      });
    }

    // Validate date order
    const from = new Date(fromDate);
    const to   = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }
    if (to < from) {
      return res.status(400).json({ success: false, message: "toDate must be on or after fromDate" });
    }

    // Prevent duplicate pending leave for overlapping dates
    const overlap = await Leave.findOne({
      employeeId: userId,
      status: "Pending",
      $or: [
        { fromDate: { $lte: to },   toDate: { $gte: from } },
      ],
    });
    if (overlap) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending leave request that overlaps with these dates",
      });
    }

    const newLeave = await Leave.create({
      employeeId: userId,
      type,
      fromDate: from,
      toDate:   to,
      reason:   reason?.trim() || "",
    });

    const populated = await Leave.findById(newLeave._id)
      .populate(POPULATE_EMPLOYEE)
      .lean();

    res.status(201).json({
      success: true,
      message: "Leave request submitted successfully",
      leave: populated,
    });

    await auditLog(req, {
      action:   "LEAVE_REQUEST",
      resource: "Leave Management",
      details:  `Leave request submitted: ${type} from ${fromDate} to ${toDate}`,
      severity: "INFO",
      status:   "SUCCESS",
      meta:     { leaveId: newLeave._id, type },
    });
  } catch (err: any) {
    console.error("CREATE_LEAVE_ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/employees/leaves  — Employee (own leaves only)
// ─────────────────────────────────────────────────────────────────────────────
export const getMyLeaves = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { status, type: leaveType } = req.query as Record<string, string>;

    const query: any = { employeeId: userId };
    if (status    && status    !== "All") query.status = status;
    if (leaveType && leaveType !== "All") query.type   = leaveType;

    const leaves = await Leave.find(query)
      .populate(POPULATE_APPROVER)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, leaves });
  } catch (err: any) {
    console.error("GET_MY_LEAVES_ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/employees/leaves/:id  — Employee (cancel own pending leave)
// ─────────────────────────────────────────────────────────────────────────────
export const cancelLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const leave = await Leave.findById(id);
    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }

    // Ownership check — compare against User._id directly (unified model)
    if (leave.employeeId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this leave" });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${leave.status} leave request`,
      });
    }

    await Leave.findByIdAndDelete(id);
    res.json({ success: true, message: "Leave request cancelled successfully" });
  } catch (err: any) {
    console.error("CANCEL_LEAVE_ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Keep old name as alias so existing imports don't break
export const getLeaves_employee = getMyLeaves;
