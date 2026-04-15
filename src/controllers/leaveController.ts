import type { Request, Response } from "express";
import mongoose from 'mongoose';
import Leave, { ILeave } from "../model/Leave.js";
import Employee from "../model/Employee.js";
import Admin from "../model/Admin.js";
import { ROLES } from "../../constants/roles.js";
import { auditLog } from "../utils/auditLogger.js";

// ================================
// GET LEAVES - Admin/SuperAdmin Dashboard
// Supports: search, status, type filters + pagination
// ================================
export const getLeaves = async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status, 
      type: leaveType,
      sort = 'createdAt'
    } = req.query;

    const query: any = {};

    // Search in employee name/email
    if (search) {
      query.$or = [
        { 'employeeId.name': { $regex: search, $options: 'i' } },
        { 'employeeId.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status && status !== 'All') {
      query.status = status;
    }

    // Leave type filter
    if (leaveType && leaveType !== 'All') {
      query.type = leaveType;
    }

    const leaves = await Leave.find(query)
      .populate('employeeId', 'name email department designation phone')
      .populate('approvedBy', 'name email')
      .sort(sort as any === 'recent' ? { createdAt: -1 } : { fromDate: 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Leave.countDocuments(query);

    // Stats for cards
    const stats = await Promise.all([
      Leave.countDocuments({ ...query, status: 'Pending' }),
      Leave.countDocuments({ ...query, status: 'Approved' }),
      Leave.countDocuments({ ...query, status: 'Rejected' }),
      Leave.countDocuments(query)
    ]);

    res.json({
      success: true,
      leaves,
      stats: {
        pending: stats[0],
        approved: stats[1],
        rejected: stats[2],
        total: stats[3]
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error: any) {
    console.error('GET_LEAVES_ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================================
// UPDATE LEAVE STATUS - Approve/Reject
// Admin/SuperAdmin only
// ================================
export const updateLeaveStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be Approved or Rejected'
      });
    }

    const leave = await Leave.findById(id).populate('employeeId');
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Only Pending leaves can be updated
    if (leave.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Only Pending leaves can be approved/rejected'
      });
    }

    // Update
    leave.status = status;
    leave.approvedBy = new mongoose.Types.ObjectId((req as any).user.id);
    leave.approvedAt = new Date();
    await leave.save();

    // Populate response
    const updatedLeave = await Leave.findById(id)
      .populate('employeeId', 'name email department')
      .populate('approvedBy', 'name email');

    res.json({
      success: true,
      message: `Leave ${status.toLowerCase()}d successfully`,
      leave: updatedLeave
    });

    // ── Audit log ────────────────────────────────────────────────────────────
    await auditLog(req, {
      action:   status === "Approved" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
      resource: "Leave Management",
      details:  `Leave request ${status.toLowerCase()} for ${(leave.employeeId as any)?.name || "Employee"}`,
      severity: status === "Rejected" ? "WARNING" : "INFO",
      status:   "SUCCESS",
      meta:     { leaveId: id, leaveStatus: status },
    });

  } catch (error: any) {
    console.error('UPDATE_LEAVE_STATUS_ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ================================
// CREATE LEAVE - Employee/HR Apply
// Added for completeness
// ================================
export const createLeave = async (req: Request, res: Response) => {
  try {
    const leaveData = req.body;

    // Basic validation
    const required = ['type', 'fromDate', 'toDate'];
    for (const field of required) {
      if (!leaveData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`
        });
      }
    }

    const newLeave = new Leave({
      ...leaveData,
      employeeId: (req as any).user.id  // Employee applying for self
    });

    await newLeave.save();

    const populatedLeave = await Leave.findById(newLeave._id)
      .populate('employeeId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      leave: populatedLeave
    });

    // ── Audit log ────────────────────────────────────────────────────────────
    await auditLog(req, {
      action:   "LEAVE_REQUEST",
      resource: "Leave Management",
      details:  `Leave request submitted for ${leaveData.type || "leave"} from ${leaveData.fromDate} to ${leaveData.toDate}`,
      severity: "INFO",
      status:   "SUCCESS",
      meta:     { leaveId: newLeave._id, type: leaveData.type },
    });

  } catch (error: any) {
    console.error('CREATE_LEAVE_ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// ================================
// CANCEL LEAVE - Employee cancels own pending leave
// ================================
export const cancelLeave = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const leave = await Leave.findById(id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });

    // Only allow cancelling own pending leaves
    const UserModel = await import("../model/User.js").then(m => m.default);
    const user = await UserModel.findById(userId).select("email");
    const empByEmail = await Employee.findOne({ email: user?.email });

    if (!empByEmail || leave.employeeId.toString() !== empByEmail._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel this leave" });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({ success: false, message: `Cannot cancel a ${leave.status} leave request` });
    }

    await Leave.findByIdAndDelete(id);
    res.json({ success: true, message: "Leave request cancelled successfully" });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
