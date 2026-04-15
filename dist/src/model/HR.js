import { Schema, model } from 'mongoose';
import { ROLES } from '../../constants/roles.js';
const hrSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email']
    },
    phone: {
        type: String,
        required: true,
        match: [/^\d{10}$/, 'Phone must be 10 digits']
    },
    gender: { type: String },
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
    department: { type: String, required: true },
    designation: { type: String, required: true },
    role: {
        type: String,
        default: ROLES.HR,
        enum: [ROLES.HR]
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
export default model('HR', hrSchema);
//# sourceMappingURL=HR.js.map