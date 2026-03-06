import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: {
      type: String,
      enum: ["SuperAdmin", "Admin", "HR", "Employee"],
      default: "Employee",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);