import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  dob?: Date;
  department: string;
  designation: string;
  role: "admin" | "hr" | "employee";
  joiningDate?: Date;
  employmentType?: string;
  password: string;
  status: "Active" | "Inactive";
  isFirstLogin: boolean;
  createdBy?: mongoose.Types.ObjectId;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    gender: String,
    dob: Date,
    department: { type: String, required: true },
    designation: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["superAdmin", "admin", "hr", "employee"],
      default: "employee",
    },
    joiningDate: Date,
    employmentType: String,
    password: { type: String, required: true },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    isFirstLogin: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", userSchema);