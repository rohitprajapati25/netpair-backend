// import type { Request, Response } from "express";
// import Employee from "../model/Employee.js";
// import { ROLES } from "../../constants/roles.js";

// export const createEmployee = async (req: Request, res: Response) => {
//   try {
//  const {
//       name,
//       email,
//       phone,
//       gender,
//       dob,
//       department,
//       designation,      // ✅ Schema uses 'designation' NOT 'position'
//       role,
//       joiningDate,
//       employmentType,
//       password,
//       status,
//     } = req.body;
     
//     // Validation
//     if (!name || !email || !phone || !department || !position) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Missing required fields" 
//       });
//     }

//     const existing = await Employee.findOne({ email });
//     if (existing) {
//       return res.status(400).json({ 
//         success: false, 
//         message: "Employee email already exists" 
//       });
//     }

//     const employee = new Employee({
//       name, email, phone, department, position,
//       joiningDate: new Date(joiningDate),
//       status: status || "active",
//       createdBy: (req as any).user.id
//     });

//     await employee.save();

//     const populated = await Employee.findById(employee._id)
//       .populate('createdBy', 'name');

//     res.status(201).json({
//       success: true,
//       message: "Employee created successfully",
//       employee: populated
//     });

//   } catch (error: any) {
//     res.status(500).json({ 
//       success: false, 
//       message: error.message 
//     });
//   }
// };

// export const getEmployees = async (req: Request, res: Response) => {
//   try {
//     const { search, department, status, page = 1, limit = 10 } = req.query;

//     const query: any = { createdBy: (req as any).user.id };

//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: 'i' } },
//         { email: { $regex: search, $options: 'i' } }
//       ];
//     }

//     if (department && department !== "All") query.department = department;
//     if (status && status !== "All") query.status = status;

//     const employees = await Employee.find(query)
//       .populate('createdBy', 'name')
//       .sort({ joiningDate: -1 })
//       .limit(Number(limit))
//       .skip((Number(page) - 1) * Number(limit));

//     const total = await Employee.countDocuments(query);

//     res.json({
//       success: true,
//       employees,
//       pagination: {
//         page: Number(page),
//         limit: Number(limit),
//         total,
//         pages: Math.ceil(total / Number(limit))
//       }
//     });

//   } catch (error: any) {
//     res.status(500).json({ 
//       success: false, 
//       message: error.message 
//     });
//   }
// };

// export const updateEmployee = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const updateData = req.body;

//     const employee = await Employee.findOneAndUpdate(
//       { _id: id, createdBy: (req as any).user.id },
//       { $set: updateData },
//       { new: true, runValidators: true }
//     ).populate('createdBy', 'name');

//     if (!employee) {
//       return res.status(404).json({ 
//         success: false, 
//         message: "Employee not found or unauthorized" 
//       });
//     }

//     res.json({
//       success: true,
//       message: "Employee updated successfully",
//       employee
//     });

//   } catch (error: any) {
//     res.status(500).json({ 
//       success: false, 
//       message: error.message 
//     });
//   }
// };

// export const deleteEmployee = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     const deleted = await Employee.findOneAndDelete({
//       _id: id,
//       createdBy: (req as any).user.id
//     });

//     if (!deleted) {
//       return res.status(404).json({ 
//         success: false, 
//         message: "Employee not found or unauthorized" 
//       });
//     }

//     res.json({
//       success: true,
//       message: "Employee deleted successfully"
//     });

//   } catch (error: any) {
//     res.status(500).json({ 
//       success: false, 
//       message: error.message 
//     });
//   }
// };



import type { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Employee from "../model/Employee.js";
import Attendance from "../model/Attendance.js";
import HR from "../model/HR.js";
import Admin from "../model/Admin.js";
import User from "../model/User.js";
import { ROLES } from "../../constants/roles.js";
import { auditLog } from "../utils/auditLogger.js";


export const createEmployee = async (req: Request, res: Response) => {
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

    // ================================
    // VALIDATION (Enhanced for all roles)
    // ================================
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !designation?.trim() || !password?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: name, email, phone, designation, password",
      });
    }

    // Role validation
    if (!Object.values(ROLES).includes(role as any)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role: ${role}. Must be one of: employee, hr, admin`,
      });
    }

    // Email exists check (across ALL role collections + User)
    const existingChecks = [
      Employee.findOne({ email: email.toLowerCase() }),
      HR.findOne({ email: email.toLowerCase() }),
      Admin.findOne({ email: email.toLowerCase() }),
      User.findOne({ email: email.toLowerCase() })
    ];
    
    const [existingEmployee, existingHR, existingAdmin, existingUser] = await Promise.all(existingChecks);
    
    if (existingEmployee || existingHR || existingAdmin || existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered in system",
      });
    }

    // Password hashing
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const commonData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      gender: gender || undefined,
      dob: dob ? new Date(dob) : undefined,
      department: department?.trim() || '',
      designation: designation.trim(),  // ✅ Direct frontend → backend mapping
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
  employmentType: employmentType || "Full Time",
      password: hashedPassword,
      status: status || ROLES.INACTIVE,
      isFirstLogin: true,
      createdBy: (req as any).user.id,
    };

    interface RoleDoc {
      _id: string;
      populate(path: string, select: string): any;
      select(fields: string): any;
    }

    let roleSpecificDoc: mongoose.Document;
    let roleModel: any;

    // ================================
    // TYPE-SAFE ROLE-SPECIFIC SAVE
    // ================================
    switch (role) {
      case ROLES.EMPLOYEE:
        roleModel = Employee;
        roleSpecificDoc = new Employee({ ...commonData, role: ROLES.EMPLOYEE } as any);
        break;
      case ROLES.HR:
        roleModel = HR;
        roleSpecificDoc = new HR({ ...commonData, role: ROLES.HR } as any);
        break;
      case ROLES.ADMIN:
        roleModel = Admin;
        roleSpecificDoc = new Admin({ ...commonData, role: ROLES.ADMIN } as any);
        break;
      default:
        throw new Error(`Unsupported role: ${role}`);
    }

    await roleSpecificDoc.save();

    // ================================
    // USER COLLECTION (Auth)
    // ================================
    const userDoc = new User({
      ...commonData,
      role: role as keyof typeof ROLES,
    } as any);
    await userDoc.save();

    // ================================
    // POPULATED RESPONSE
    // ================================
    const populatedRoleDoc = await roleModel
      .findById(roleSpecificDoc._id)
      .populate('createdBy', 'name email')
      .select('-password');

    res.status(201).json({
      success: true,
      message: `${role.toUpperCase()} created successfully. User ID: ${userDoc._id}`,
      roleSpecific: populatedRoleDoc,
      userId: userDoc._id,
    });

    // ── Audit log ────────────────────────────────────────────────────────────
    await auditLog(req, {
      action:   "EMPLOYEE_CREATE",
      resource: "Employee Management",
      details:  `New ${role} "${name}" (${email}) created in ${department || "N/A"} department`,
      severity: "INFO",
      status:   "SUCCESS",
      meta:     { employeeId: roleSpecificDoc._id, role, department },
    });

  } catch (error: any) {
    console.error('CREATE_USER_ERROR:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors)
        .map((e: any) => e.message)
        .join(', ');
      return res.status(400).json({ success: false, message: messages });
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern!)[0]!;
      return res.status(400).json({ 
        success: false, 
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

export const getEmployees = async (req: Request, res: Response) => {
  try {
    const { search, department, status, page = 1, limit = 10, ids } = req.query;

    const query: any = {};

    // Handle multi-ID fetch for AddTaskModal
    if (ids) {
      const idArray = (ids as string).split(',').map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
      query._id = { $in: idArray };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        // Schema uses 'designation', so we fix the search field here
        { designation: { $regex: search, $options: "i" } },
      ];
    }

    if (department && department !== "All") {
      query.department = department;
    }
    if (status && status !== "All") {
      query.status = status;
    }

    // Aggregate attendance stats per employee
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          status: 'Present',
          date: { $gte: new Date(new Date().getFullYear(), 0, 1) } // Current year
        }
      },
      {
        $group: {
          _id: '$employee',
          presentCount: { $sum: 1 }
        }
      }
    ]).exec();

    const statsMap: Record<string, number> = {};
    attendanceStats.forEach(stat => {
      statsMap[stat._id.toString()] = stat.presentCount;
    });

    const employees = await Employee.find(query)
      .populate({
        path: 'createdBy',
        select: 'name'
      })
      .select("-password")
      .sort({ joiningDate: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
      
    // Convert to plain objects to allow adding virtual 'presentCount' field
    const employeesWithStats = employees.map(emp => {
      const empObj = emp.toObject();
      (empObj as any).presentCount = statsMap[emp._id.toString()] || 0;
      return empObj;
    });

    const total = await Employee.countDocuments(query);

    res.json({
      success: true,
      count: employees.length,
      employees: employeesWithStats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id)
      .populate("createdBy", "name")
      .select("-password");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.json({
      success: true,
      employee,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // ✅ If password is being updated, hash it
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    // Get employee data for sync (role + email)
    const employee = await Employee.findById(id).select('role email status');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // 1. Update Role Collection (Employee)
    const updatedRoleDoc = await Employee.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    // 2. SYNC User collection by EMAIL (not ID - Employee._id ≠ User._id)
    await User.findOneAndUpdate(
      { email: employee.email },  // ✅ Match by email
      { 
        $set: { 
          status: updateData.status || employee.status,
          ...('department' in updateData && { department: updateData.department }),
          ...('designation' in updateData && { designation: updateData.designation }),
        }
      }
    );

    // Socket emit for real-time
    (req as any).io?.emit('employeeUpdate', { id, status: updateData.status });

    const populatedEmployee = await Employee.findById(id)
      .populate("createdBy", "name")
      .select("-password");

    res.json({
      success: true,
      message: "Employee updated & synced successfully",
      employee: populatedEmployee,
    });

    // ── Audit log ────────────────────────────────────────────────────────────
    await auditLog(req, {
      action:   "EMPLOYEE_UPDATE",
      resource: "Employee Management",
      details:  `Employee record updated (ID: ${id})`,
      severity: "INFO",
      status:   "SUCCESS",
      meta:     { employeeId: id, changes: Object.keys(updateData) },
    });
  } catch (error: any) {
    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((e: any) => e.message)
        .join(", ");
      return res.status(400).json({
        success: false,
        message: `Validation Error: ${messages}`,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('Delete request for ID:', id, 'User:', (req as any).user?.id);

    // 1. Get employee for sync — no createdBy restriction so any admin/superadmin can delete
    const employee = await Employee.findById(id).select('email name');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    console.log('Found employee:', employee.email);

    // 2. HARD DELETE Employee
    const deletedEmp = await Employee.findByIdAndDelete(id);
    console.log('Employee deleted:', !!deletedEmp);

    // 3. HARD DELETE User by email
    const deletedUser = await User.findOneAndDelete({ email: employee.email });
    console.log('User deleted:', !!deletedUser);

    res.json({
      success: true,
      message: "Employee & User PERMANENTLY deleted",
      deletedEmployee: !!deletedEmp,
      deletedUser: !!deletedUser
    });

    // ── Audit log ────────────────────────────────────────────────────────────
    await auditLog(req, {
      action:   "EMPLOYEE_DELETE",
      resource: "Employee Management",
      details:  `Employee "${employee.email}" permanently deleted`,
      severity: "HIGH",
      status:   "SUCCESS",
      meta:     { employeeId: id, email: employee.email },
    });
  } catch (error: any) {
    console.error('DELETE_ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




// ✅ NEW: Login endpoint - validate password
export const getActiveEmployees = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, department, search, role = 'employee' } = req.query;

    const query: any = { status: 'active', role: role.toString().toLowerCase() };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } }
      ];
    }

    if (department && department !== "All") {
      query.department = department;
    }

    const employees = await Employee.find(query)
      .select("name _id department designation role")
      .sort({ name: 1 })
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

// NEW: Get unique companies (departments) for super admin
export const getCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await Employee.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: '$department'
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          name: '$_id',
          _id: 0
        }
      }
    ]);

    res.json({
      success: true,
      companies
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// NEW: Get employees by company for dropdowns
export const getEmployeesByCompany = async (req: Request, res: Response) => {
  try {
    const { company, role, designation, page = 1, limit = 50 } = req.query;
    const query: any = { status: 'active' };

    if (company) {
      query.department = company;
    }

    if (role) {
      query.role = role;
    }

    if (designation === 'manager') {
      query.designation = { $regex: 'manager', $options: 'i' };
    }

    const employees = await Employee.find(query)
      .select('name _id department designation role')
      .sort({ name: 1 })
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


export const loginEmployee = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Get employee WITH password (use select('+password'))
    const employee = await Employee.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!employee) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ✅ Compare plain text password with hashed password
    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ✅ Return employee without password
    const employeeData = await Employee.findById(employee._id)
      .select("-password");

    res.json({
      success: true,
      message: "Login successful",
      employee: employeeData,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};