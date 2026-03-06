import { Request, Response } from "express";
import bcrypt from "bcryptjs"; 
import User from "../model/User";

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

    // 1. Validation Check
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (Name, Email, Password, or Role)",
      });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // 3. FIX: Role Normalization
    // Agar aapke Schema me "Employee" expected hai, toh hum lowercase nahi karenge.
    // Hum frontend se jo aa raha hai wahi bhejenge (ya Capitalize karenge).
    const formattedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase(); 
    // Isse 'employee' -> 'Employee' aur 'HR' -> 'Hr' ban jayega. 
    // Agar Schema me EXACTLY "HR" chahiye, toh direct 'role' use karein.

    // 4. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Create User in Database
    const newUser = await User.create({
      name,
      email,
      phone,
      gender,
      dob,
      department,
      designation,
      role: formattedRole, // Model Enum ke exact spelling se match karein
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
        ? "Role validation failed. Use 'Employee' or 'HR' exactly." 
        : "Server Error: " + error.message,
    });
  }
};