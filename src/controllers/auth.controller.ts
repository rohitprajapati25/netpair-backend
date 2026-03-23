import type { Request, Response } from "express";
import User from "../model/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Check email
    const user = await User.findOne({ email });
    if (!user) {
return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Password" });
    }

    // Security Check: Status active hai ya nahi?
    if (user.status.toString() === "inactive") {
    return res.status(403).json({ 
        success: false, 
        message: "Aapka account abhi active nahi hai. Kripya Admin se sampark karein." 
    });
}
    // 3️⃣ Generate Token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    // 4️⃣ Send Response
    res.status(200).json({
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};