import { Request, Response } from "express";
import Attendance, { IAttendance } from "../model/Attendance.js";
import Employee from "../model/Employee.js";
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
    console.log('🔍 Attendance query:', JSON.stringify(query));

    if (department && department !== 'All') {
      const users = await User.find({ department, role: { $in: [ROLES.EMPLOYEE, ROLES.HR] } } as any);
      query.employee = { $in: users.map((u: any) => u._id) };
    }

    const records = await Attendance.find(query)

      .populate('employee', 'name department designation workMode shiftType locationType')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Attendance.countDocuments(query);

    res.json({
      success: true,
      records: records,
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
    const { employeeId, status, workMode, checkIn, checkOut, notes, date } = req.body;
    
    console.log('Mark attendance body:', req.body);
    
    let workingHours = 0;
    if (checkIn && checkOut) {
      const [h1, m1] = checkIn.split(':').map(Number);
      const [h2, m2] = checkOut.split(':').map(Number);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 1440;
      workingHours = diff;
    }

    const attendanceDate = date ? new Date(date) : new Date();

    // JOIN DATE VALIDATION
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }
    if (!employee.joiningDate) {
      return res.status(400).json({
        success: false,
        message: 'Employee joining date not set'
      });
    }
    
    const joinDateStart = new Date(employee.joiningDate);
    joinDateStart.setHours(0,0,0,0);
    
    const attDateStart = new Date(attendanceDate);
    attDateStart.setHours(0,0,0,0);
    
    if (attDateStart < joinDateStart) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark attendance before employee's joining date (${joinDateStart.toLocaleDateString('en-IN')}). Selected date: ${attDateStart.toLocaleDateString('en-IN')}`
      });
    }

    // DUPLICATE CHECK
    const existing = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: new Date(attendanceDate.setHours(0,0,0,0)),
        $lte: new Date(attendanceDate.setHours(23,59,59,999))
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Employee "${employee.name}" already has attendance for ${attendanceDate.toLocaleDateString('en-IN')}. Please EDIT the existing record.`
      });
    }

    const attendance: Partial<IAttendance> = {
      employee: employeeId,
      date: attendanceDate,
      status: status || 'Absent',
      workMode: status === 'Absent' ? null : (workMode || ''),
      checkIn: checkIn || (status !== 'Absent' ? '09:30' : undefined),
      checkOut: checkOut || (status !== 'Absent' ? '18:30' : undefined),
      workingHours,
      notes,
      createdBy: (req as any).user.id
    };
    
    console.log('Creating attendance:', attendance);

    const newRecord = await Attendance.create(attendance);

    const populated = await Attendance.findById(newRecord._id)
      .populate('employee', 'name department designation');

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully!',
      attendance: populated
    });

  } catch (error: any) {
    console.error('Mark attendance error:', error);
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate attendance. Employee already marked for this date. Please edit existing.'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to mark attendance'
    });
  }
};

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    console.log('Update body:', req.body);
    const { id } = req.params;
    const { date, status, checkIn, checkOut, workMode, notes } = req.body;

    const user = (req as any).user;
    const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance not found' });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (attendance.date < thirtyDaysAgo && !isSuperAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Can only edit recent records (30 days)'
      });
    }

    // JOIN DATE VALIDATION FOR DATE UPDATES
    if (date !== undefined) {
      const employee = await Employee.findById(attendance.employee);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      if (!employee.joiningDate) {
        return res.status(400).json({
          success: false,
          message: 'Employee joining date not set'
        });
      }
      
      const joinDateStart = new Date(employee.joiningDate);
      joinDateStart.setHours(0,0,0,0);
      
      const newAttDateStart = new Date(date);
      newAttDateStart.setHours(0,0,0,0);
      
      if (newAttDateStart < joinDateStart) {
        return res.status(400).json({
          success: false,
          message: `Cannot update attendance date before employee's joining date (${joinDateStart.toLocaleDateString('en-IN')}). New date: ${newAttDateStart.toLocaleDateString('en-IN')}`
        });
      }
    }

    const updates: any = {};
    if (date !== undefined) updates.date = new Date(date);
    if (status !== undefined) updates.status = status;
    if (checkIn !== undefined) updates.checkIn = checkIn;
    if (checkOut !== undefined) updates.checkOut = checkOut;
    if (workMode !== undefined) updates.workMode = workMode;
    if (notes !== undefined) updates.notes = notes;

    if (updates.status === 'Absent') {
      updates.workMode = null;
      updates.checkIn = null;
      updates.checkOut = null;
    }

    const updated = await Attendance.findByIdAndUpdate(
      id,
      {
        ...updates,
        updatedBy: user.id
      },
      { new: true, runValidators: true, returnDocument: 'after' }
    )?.populate('employee', 'name department designation');

    console.log('Updated attendance:', updated);

    res.json({
      success: true,
      message: 'Attendance updated successfully',
      attendance: updated
    });

  } catch (error: any) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Update failed'
    });
  }
};

export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await Attendance.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Attendance deleted'
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Delete failed'
    });
  }
};

// TODAY STATS - Only today's Present/Absent count
export const getTodayAttendanceStats = async (req: Request, res: Response) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const stats = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: todayStart,
            $lte: todayEnd
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = { present: 0, absent: 0 };
    stats.forEach(stat => {
      if (stat._id === 'Present') result.present = stat.count;
      if (stat._id === 'Absent') result.absent = stat.count;
    });

    res.json({
      success: true,
      stats: result,
      todayDate: todayStart.toISOString().split('T')[0]
    });
  } catch (error: any) {
    console.error('Today stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today stats'
    });
  }
};

