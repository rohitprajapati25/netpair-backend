import bcrypt from "bcryptjs";
import Admin from "../model/Admin.js";
import HR from "../model/HR.js";
import User from "../model/User.js";
import Employee from "../model/Employee.js";
import { ROLES } from "../../constants/roles.js";
// ================================
// ADMIN + USER DUAL CREATE (Copy Pattern)
// ================================
export const createAdmin = async (req, res) => {
    try {
        const { name, email, phone, gender, dob, department, designation, joiningDate, employmentType, password, status } = req.body;
        // VALIDATION
        if (!name?.trim() || !email?.trim() || !phone?.trim() || !designation?.trim() || !password?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }
        // Email unique check
        const existingChecks = [
            Admin.findOne({ email: email.toLowerCase() }),
            HR.findOne({ email: email.toLowerCase() }),
            Employee.findOne({ email: email.toLowerCase() }),
            User.findOne({ email: email.toLowerCase() })
        ];
        const [existingAdmin, existingHR, existingEmp, existingUser] = await Promise.all(existingChecks);
        if (existingAdmin || existingHR || existingEmp || existingUser) {
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
        // Admin Collection
        const adminDoc = new Admin({ ...commonData, role: ROLES.ADMIN });
        await adminDoc.save();
        // User Collection (Auth)
        const userDoc = new User({ ...commonData, role: ROLES.ADMIN });
        await userDoc.save();
        // Response
        const populatedAdmin = await Admin.findById(adminDoc._id)
            .populate('createdBy', 'name email')
            .select('-password');
        res.status(201).json({
            success: true,
            message: "Admin created + User synced",
            admin: populatedAdmin,
            userId: userDoc._id
        });
    }
    catch (error) {
        console.error('CREATE_ADMIN_ERROR:', error);
        if (error.code === 11000)
            return res.status(400).json({ success: false, message: 'Email exists' });
        res.status(500).json({ success: false, message: error.message });
    }
};
// ================================
// ADMIN CRUD Operations
export const getAdmins = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const query = { createdBy: req.user.id };
        if (search) {
            query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }];
        }
        const admins = await Admin.find(query)
            .populate('createdBy', 'name')
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Admin.countDocuments(query);
        res.json({ success: true, admins, total, page: Number(page), limit: Number(limit) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const updateAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const admin = await Admin.findOne({ _id: id, createdBy: req.user.id }).select('email');
        if (!admin)
            return res.status(404).json({ success: false, message: "Admin not found" });
        // Update Admin
        await Admin.findByIdAndUpdate(id, { $set: updateData }, { runValidators: true });
        // Sync User
        await User.findOneAndUpdate({ email: admin.email }, {
            $set: {
                ...('designation' in updateData && { designation: updateData.designation }),
                ...('department' in updateData && { department: updateData.department }),
                status: updateData.status || admin.status
            }
        });
        const updatedAdmin = await Admin.findById(id).populate('createdBy', 'name').select('-password');
        res.json({ success: true, admin: updatedAdmin });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const deleteAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await Admin.findOne({ _id: id, createdBy: req.user.id }).select('email');
        if (!admin)
            return res.status(404).json({ success: false, message: "Admin not found" });
        // Hard delete both
        await Admin.findByIdAndDelete(id);
        await User.findOneAndDelete({ email: admin.email });
        res.json({ success: true, message: "Admin + User deleted" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=adminController.js.map