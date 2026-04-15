import { Schema, model } from 'mongoose';
import { ROLES } from '../../constants/roles.js';
const adminSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        match: [/^\d{10}$/, 'Phone must be 10 digits']
    },
    department: { type: String }, // Optional for admins
    designation: { type: String, required: true },
    role: {
        type: String,
        default: ROLES.ADMIN,
        enum: [ROLES.ADMIN]
    },
    joiningDate: { type: Date },
    employmentType: {
        type: String,
        enum: ["Full Time", "Part Time", "Intern", "Contract"],
        default: "Full Time"
    },
    password: { type: String, required: true, minlength: 8 },
    status: {
        type: String,
        enum: [ROLES.ACTIVE, ROLES.INACTIVE],
        default: ROLES.INACTIVE
    },
    isFirstLogin: { type: Boolean, default: true },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});
export default model('Admin', adminSchema);
//# sourceMappingURL=Admin.js.map