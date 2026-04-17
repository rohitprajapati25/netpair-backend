import { ROLES } from "../constants/roles.js";
import User from "../model/User.js";
import bcrypt from "bcrypt";

export const superAdmin = async () => {
  try {
    const existingSuperAdmin = await User.findOne({ role: "superadmin" });

    if (existingSuperAdmin) {
      // Ensure superadmin is always active (fix for existing inactive records)
      if (existingSuperAdmin.status !== ROLES.ACTIVE) {
        await User.updateOne(
          { role: "superadmin" },
          { $set: { status: ROLES.ACTIVE } }
        );
        console.log("✅ SuperAdmin status fixed → active");
      } else {
        console.log("✅ SuperAdmin already exists and is active");
      }
      return;
    }

    const hashedPassword = await bcrypt.hash(
      process.env.SUPERADMIN_PASSWORD as string,
      10
    );

    await User.create({
      name: "Super Admin",
      email: process.env.SUPERADMIN_EMAIL!,
      password: hashedPassword,
      role: ROLES.SUPER_ADMIN,
      status: ROLES.ACTIVE,        // ✅ Always active
      department: "Management",
      designation: "System Owner",
    });

    console.log("🔥 SuperAdmin Created Successfully");
  } catch (error) {
    console.log("❌ Error creating SuperAdmin:", error);
  }
};
