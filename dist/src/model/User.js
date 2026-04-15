import mongoose from "mongoose";
import { ROLES } from "../../constants/roles.js";
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: String,
    gender: String,
    dob: Date,
    department: String,
    designation: { type: String, required: true }, // ✅ Matches form
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
        enum: [ROLES.ACTIVE, ROLES.INACTIVE],
        default: ROLES.INACTIVE,
    },
    isFirstLogin: { type: Boolean, default: true },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    deletedAt: Date, // ✅ Soft delete support
}, { timestamps: true });
export default mongoose.model("User", userSchema);
//# sourceMappingURL=User.js.map