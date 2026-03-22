import type { Request, Response } from "express";
import Employee from "../model/Employee.js";
import { ROLES } from "../../constants/roles.js";

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, department, position, joiningDate, status } = req.body;
    
    // Validation
    if (!name || !email || !phone || !department || !position) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    const existing = await Employee.findOne({ email });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: "Employee email already exists" 
      });
    }

    const employee = new Employee({
      name, email, phone, department, position,
      joiningDate: new Date(joiningDate),
      status: status || "active",
      createdBy: (req as any).user.id
    });

    await employee.save();

    const populated = await Employee.findById(employee._id)
      .populate('createdBy', 'name');

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee: populated
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const { search, department, status, page = 1, limit = 10 } = req.query;

    const query: any = { createdBy: (req as any).user.id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (department && department !== "All") query.department = department;
    if (status && status !== "All") query.status = status;

    const employees = await Employee.find(query)
      .populate('createdBy', 'name')
      .sort({ joiningDate: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Employee.countDocuments(query);

    res.json({
      success: true,
      employees,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const employee = await Employee.findOneAndUpdate(
      { _id: id, createdBy: (req as any).user.id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');

    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: "Employee not found or unauthorized" 
      });
    }

    res.json({
      success: true,
      message: "Employee updated successfully",
      employee
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await Employee.findOneAndDelete({
      _id: id,
      createdBy: (req as any).user.id
    });

    if (!deleted) {
      return res.status(404).json({ 
        success: false, 
        message: "Employee not found or unauthorized" 
      });
    }

    res.json({
      success: true,
      message: "Employee deleted successfully"
    });

  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

