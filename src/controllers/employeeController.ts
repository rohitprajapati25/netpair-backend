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
import HR from "../model/HR.js";
import Admin from "../model/Admin.js";
import User from "../model/User.js";
import { updateRoleUserStatus } from "../utils/roleSync.js";
import { ROLES } from "../../constants/roles.js";


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
    const { search, department, status, page = 1, limit = 10 } = req.query;

    const query: any = { createdBy: (req as any).user.id };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
{ position: { $regex: search, $options: "i" } },
      ];
    }

    if (department && department !== "All") {
      query.department = department;
    }
    if (status && status !== "All") {
      query.status = status;
    }

const employees = await Employee.find(query)
      .populate({
        path: 'createdBy',
        select: 'name'
      })
      .select("-password")
      .sort({ joiningDate: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));


    const total = await Employee.countDocuments(query);

    res.json({
      success: true,
      count: employees.length,
      employees,
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

    const employee = await Employee.findOne({
      _id: id,
      createdBy: (req as any).user.id,
    })
      .populate("createdBy", "name")
      .select("-password"); // ✅ Never return password

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or unauthorized",
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
    const employee = await Employee.findOne({ _id: id, createdBy: (req as any).user.id }).select('role email');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or unauthorized",
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
    req.io?.emit('employeeUpdate', { id, status: updateData.status });

    const populatedEmployee = await Employee.findById(id)
      .populate("createdBy", "name")
      .select("-password");

    res.json({
      success: true,
      message: "Employee updated & synced successfully",
      employee: populatedEmployee,
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

    console.log('Delete request for ID:', id, 'User:', req.user?.id);

    // 1. Get employee for sync
    const employee = await Employee.findOne({ _id: id, createdBy: req.user.id }).select('email');
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or unauthorized",
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
    const { page = 1, limit = 10, department, search } = req.query;

    const query: any = { status: ROLES.ACTIVE };


    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { position: { $regex: search, $options: "i" } }
      ];
    }

    if (department && department !== "All") {
      query.department = department;
    }

    const employees = await Employee.find(query)
      .select("name email phone department position role status")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const totalActive = await Employee.countDocuments({ status: ROLES.ACTIVE });

    const total = await Employee.countDocuments(query);

    res.json({
      success: true,
      activeCount: totalActive,
      totalActive,
      total,
      employees,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalActive,
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