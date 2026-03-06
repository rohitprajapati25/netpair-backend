import User from "../model/User";
import bcrypt from "bcrypt";

export const superAdmin = async () => {
  try {
    const existingSuperAdmin = await User.findOne({ role: "SuperAdmin" });

    if (existingSuperAdmin) {
      console.log("✅ SuperAdmin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash(
      process.env.SUPERADMIN_PASSWORD as string,
      10
    );

    await User.create({
  name: "Super Admin",
  email: process.env.SUPERADMIN_EMAIL,
  password: hashedPassword,
  role: "SuperAdmin",
  department: "Management",
  designation: "System Owner"
});

    console.log("🔥 SuperAdmin Created Successfully");
  } catch (error) {
    console.log("❌ Error creating SuperAdmin:", error);
  }
};