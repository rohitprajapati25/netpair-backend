import bcrypt from "bcryptjs";
import HR from "../model/HR.js";
import Admin from "../model/Admin.js";
import User from "../model/User.js";
import Employee from "../model/Employee.js";
import { ROLES } from "../constants/roles.js";
// ================================
// HR + USER DUAL CREATE (Copy Employee Pattern)
// ================================
export const createHR = async (req, res) => {
    try {
        const { name, email, phone, gender, dob, department, designation, joiningDate, employmentType, password, status } = req.body;
        // VALIDATION
        if (!name?.trim() || !email?.trim() || !phone?.trim() || !designation?.trim() || !password?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: name, email, phone, designation, password",
            });
        }
        // Email unique check (all collections)
        const existingChecks = [
            HR.findOne({ email: email.toLowerCase() }),
            Employee.findOne({ email: email.toLowerCase() }),
            Admin.findOne({ email: email.toLowerCase() }),
            User.findOne({ email: email.toLowerCase() })
        ];
        const [existingHR, existingEmp, existingAdmin, existingUser] = await Promise.all(existingChecks);
        if (existingHR || existingEmp || existingAdmin || existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already registered",
            });
        }
        // Password hash
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);
        const commonData = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            gender, dob: dob ? new Date(dob) : undefined,
            department: department?.trim() || '',
            designation: designation.trim(),
            joiningDate: joiningDate ? new Date(joiningDate) : undefined,
            employmentType: employmentType || "Full Time",
            password: hashedPassword,
            status: status || ROLES.INACTIVE,
            isFirstLogin: true,
            createdBy: req.user.id,
        };
        // HR Collection
        const hrDoc = new HR({ ...commonData, role: ROLES.HR });
        await hrDoc.save();
        // User Collection (Auth)
        const userDoc = new User({ ...commonData, role: ROLES.HR });
        await userDoc.save();
        // Response
        const populatedHR = await HR.findById(hrDoc._id)
            .populate('createdBy', 'name email')
            .select('-password');
        res.status(201).json({
            success: true,
            message: "HR created + User synced",
            hr: populatedHR,
            userId: userDoc._id
        });
    }
    catch (error) {
        console.error('CREATE_HR_ERROR:', error);
        if (error.code === 11000)
            return res.status(400).json({ success: false, message: 'Email exists' });
        res.status(500).json({ success: false, message: error.message });
    }
};
// ================================
// HR CRUD (get, update, delete)
export const getHRs = async (req, res) => {
    try {
        const { search, page = 1, limit = 10, status } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }
        if (status && status !== 'all')
            query.status = status;
        const [hrs, total] = await Promise.all([
            HR.find(query)
                .populate('createdBy', 'name')
                .select('-password')
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip((Number(page) - 1) * Number(limit)),
            HR.countDocuments(query),
        ]);
        res.json({
            success: true,
            hrs,
            employees: hrs, // alias — some frontend pages use .employees
            total,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const updateHR = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const hr = await HR.findById(id).select('email status');
        if (!hr)
            return res.status(404).json({ success: false, message: "HR not found" });
        await HR.findByIdAndUpdate(id, { $set: updateData }, { runValidators: true });
        // Sync User collection
        await User.findOneAndUpdate({ email: hr.email }, {
            $set: {
                ...('designation' in updateData && { designation: updateData.designation }),
                ...('department' in updateData && { department: updateData.department }),
                ...('status' in updateData && { status: updateData.status }),
            }
        });
        const updatedHR = await HR.findById(id).populate('createdBy', 'name').select('-password');
        res.json({ success: true, hr: updatedHR, employee: updatedHR });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const deleteHR = async (req, res) => {
    try {
        const { id } = req.params;
        const hr = await HR.findById(id).select('email name');
        if (!hr)
            return res.status(404).json({ success: false, message: "HR not found" });
        await HR.findByIdAndDelete(id);
        await User.findOneAndDelete({ email: hr.email });
        res.json({ success: true, message: "HR + User deleted" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=hrController.js.map