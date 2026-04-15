// import mongoose, { Document } from "mongoose";
// import { ROLES } from "../constants/roles.js";
// export interface IEmployee extends Document {
//   name: string;
//   email: string;
//   phone: string; 
//   gender?: string;
//   dob?: Date;
//   department: string;
//   designation: string;
//   role: ROLES.ADMIN | ROLES.SUPER_ADMIN | ROLES.HR |  ROLES.EMPLOYEE;
//   position: string;
//   joiningDate: Date;
//   employmentType?: string;
//   password: string;
//   isFirstLogin: boolean;
//   status: ROLES.ACTIVE | ROLES.INACTIVE;
//   createdBy: mongoose.Types.ObjectId;
//   deletedAt?: Date; // ✅ Soft delete
// }
// const employeeSchema = new mongoose.Schema<IEmployee>({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   phone: { type: String, required: true },
//   department: { type: String, required: true },
//   position: { type: String, required: true },
//   joiningDate: { type: Date, required: true, default: Date.now },
//   status: { 
//     type: String, 
//     enum: [ROLES.ACTIVE, ROLES.INACTIVE], 
//     default: ROLES.INACTIVE 
//   },
//   createdBy: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     ref: "User", 
//     required: true 
//   }
// }, { timestamps: true });
import mongoose, { Schema } from "mongoose";
// ✅ MongoDB Schema definition
const employeeSchema = new Schema({
    // Personal Information
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
        minlength: [2, "Name must be at least 2 characters"],
        maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, "Invalid email format"],
    },
    phone: {
        type: String,
        trim: true,
        required: [true, "Phone is required"],
        match: [/^\+?\d{10,15}$/, "Phone must be 10-15 digits"],
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
    },
    dob: {
        type: Date,
        validate: {
            validator: function (v) {
                return v && new Date(v) < new Date() &&
                    (new Date().getFullYear() - new Date(v).getFullYear()) >= 18;
            },
            message: 'Must be at least 18 years old and birth date before today'
        }
    },
    // Employment Details
    department: {
        type: String,
        trim: true,
    },
    designation: {
        type: String,
        required: [true, "Designation is required"],
        trim: true,
    },
    role: {
        type: String,
        required: [true, "Role is required"],
        enum: ["superadmin", "admin", "hr", "employee"],
        default: "employee",
    },
    joiningDate: Date,
    employmentType: {
        type: String,
        enum: ["Full Time", "Part Time", "Intern", "Contract"],
        default: "Full Time"
    },
    // Security
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, "Password must be at least 8 characters"],
        select: false, // ✅ Don't return password by default
    },
    isFirstLogin: {
        type: Boolean,
        default: true,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    // Status & Metadata
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "inactive", // ✅ New registrations are inactive
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    deletedAt: Date, // ✅ Soft delete support
}, {
    timestamps: true, // ✅ Auto-adds createdAt, updatedAt
    collection: "employees",
});
// ✅ Index for common queries
// employeeSchema.index({ email: 1 }); // Removed duplicate index
employeeSchema.index({ status: 1 });
employeeSchema.index({ createdAt: -1 });
// ✅ Query middleware to exclude soft-deleted documents
employeeSchema.query.notDeleted = function () {
    return this.where({ deletedAt: { $eq: null } });
};
// ✅ Export Model
export default mongoose.model("Employee", employeeSchema);
//# sourceMappingURL=Employee.js.map