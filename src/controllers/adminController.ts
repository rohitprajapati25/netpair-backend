import type { Request, Response } from "express";
import bcrypt from "bcryptjs"; 
import User from "../model/User.js";
import { ROLES } from "../../constants/roles.js";

export const createUser = async (req: any, res: Response) => {
  try {
    const {
      name,
      email,
      phone,
      gender,
      dob,
      department,
      designation,
      role,
      joiningDate,
      employmentType,
      password,
      status,
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (Name, Email, Password, or Role)",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      phone,
      gender,
      dob,
      department,
      designation,
      role, // ✅ Fixed: use role from req.body
      joiningDate,
      employmentType,
      password: hashedPassword,
      status: status || "Active",
      createdBy: req.user.id, 
      isFirstLogin: true,
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      userId: newUser._id,
    });

  } catch (error: any) {
    console.error("CREATE_USER_ERROR:", error.message); 
    
    return res.status(500).json({
      success: false,
      message: error.message.includes("validation failed") 
        ? "Role validation failed. Use 'employee' or 'hr' exactly." 
        : "Server Error: " + error.message,
    });
  }
};

// ✅ Industry-standard: GET /api/admin/employees?search=&department=&status=&page=1&limit=10
export const getEmployees = async (req: any, res: Response) => {
  try {
    const { search, department, status, page = 1, limit = 10 } = req.query;
    const query: any = { role: { $in: [ROLES.EMPLOYEE, ROLES.HR] } };

    // Dynamic search/filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    if (department) query.department = department;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [employees, total] = await Promise.all([
      User.find(query)
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      employees,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total
      }
    });

  } catch (error: any) {
    console.error('GET_EMPLOYEES_ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ PUT /api/admin/employees/:id
export const updateEmployee = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Prevent role/password changes
    const allowedUpdates = ['name', 'phone', 'gender', 'dob', 'department', 'designation', 'joiningDate', 'employmentType', 'status'];
    const filteredUpdates = Object.keys(updateData)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {} as any);

    const employee = await User.findOneAndUpdate(
      { _id: id, role: { $in: [ROLES.EMPLOYEE, ROLES.HR] } },
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      employee
    });

  } catch (error: any) {
    console.error('UPDATE_EMPLOYEE_ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ DELETE /api/admin/employees/:id (soft delete)
export const deleteEmployee = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const employee = await User.findOneAndUpdate(
      { _id: id, role: { $in: [ROLES.EMPLOYEE, ROLES.HR] } },
      { status: 'Inactive', deletedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Employee deleted successfully',
      employeeId: id
    });

  } catch (error: any) {
    console.error('DELETE_EMPLOYEE_ERROR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

