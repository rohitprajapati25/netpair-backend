import mongoose from "mongoose";
import { ROLES } from "../constants/roles.js";
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: {
        type: String,
        enum: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE],
        default: ROLES.EMPLOYEE,
    },
}, { timestamps: true });
export default mongoose.model("User", userSchema);
//# sourceMappingURL=user.model.js.map