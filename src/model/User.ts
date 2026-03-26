import mongoose, { Document } from "mongoose";
import { ROLES } from "../../constants/roles.js";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  gender?: string;
  dob?: Date;
  department: string;
  designation: string;
  role: ROLES.ADMIN | ROLES.SUPER_ADMIN | ROLES.HR |  ROLES.EMPLOYEE;
  joiningDate?: Date;
  employmentType?: string;
  password: string;
  status: ROLES.ACTIVE | ROLES.INACTIVE;
  isFirstLogin: boolean;
  createdBy?: mongoose.Types.ObjectId;
  deletedAt?: Date; // ✅ Soft delete
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    gender: String,
    dob: Date,
    department: { type: String, required: true },
  designation: { type: String, required: true },  // ✅ Matches form
    role: {
      type: String,
      required: true,
      enum: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE],
      default: ROLES.EMPLOYEE,
    },
    joiningDate: Date,
    employmentType: String,
    password: { type: String, required: true },
    status: {
      type: String,
      enum: [ROLES.ACTIVE,ROLES.INACTIVE ],
      default: ROLES.INACTIVE,
    },
    isFirstLogin: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    deletedAt: Date, // ✅ Soft delete support
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", userSchema);