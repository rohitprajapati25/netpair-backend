
import { Request, Response } from "express";
import Attendance, { IAttendance } from "../model/Attendance.js";
import User from "../model/User.js";
import { ROLES } from "../../constants/roles.js";

export const getAttendanceRecords = async (req: Request, res: Response) => {
  try {
    const {
      search,
      status, 
      department,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20
    } = req.query;

    const query: any = {};

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom as string);
      if (dateTo) query.date.$lte = new Date(dateTo as string + 'T23:59:59.999Z');
    }

    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ] as any,
        role: { $in: [ROLES.EMPLOYEE, ROLES.HR] }
      } as any);
      query.employee = { $in: users.map((u: any) => u._id) };
    }


    if (status && status !== 'All') query.status = status;
    // Removed default 'Present' filter - show all records first for debugging
    console.log('🔍 Attendance query:', JSON.stringify(query));

    
    if (department && department !== 'All') {
      const users = await User.find({ department, role: { $in: [ROLES.EMPLOYEE, ROLES.HR] } } as any);
      query.employee = { $in: users.map((u: any) => u._id) };
    }

    const records = await Attendance.find(query)
      .populate('employee', 'name email department designation profileImage')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      records: records,  // ✅ Frontend expects 'records'
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records'
    });
  }
};

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { employeeId, status, workMode, checkIn, checkOut, notes } = req.body;
    
    let workingHours = 0;
    if (checkIn && checkOut) {
      const [h1, m1] = checkIn.split(':').map(Number);
      const [h2, m2] = checkOut.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 1440;
      workingHours = diff;
    }

    const attendance: Partial<IAttendance> = {
      employee: employeeId,
      date: new Date(),
      status: status || 'Absent',
      workMode: workMode || 'Office',
      checkIn,
      checkOut,
      workingHours,
      notes,
      createdBy: (req as any).user.id
    };

    const newRecord = await Attendance.create(attendance);

    const populated = await Attendance.findById(newRecord._id)
      .populate('employee', 'name designation department');

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      attendance: populated
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark attendance'
    });
  }
};

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const updated = await Attendance.findByIdAndUpdate(id, updateData, { new: true })
      .populate('employee', 'name designation');

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      attendance: updated
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update attendance'
    });
  }
};

export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await Attendance.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete attendance'
    });
  }
};
