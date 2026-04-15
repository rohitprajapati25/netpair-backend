import jwt from "jsonwebtoken";
import User from "../model/User.js";
import Employee from "../model/Employee.js";
import HR from "../model/HR.js";
import Admin from "../model/Admin.js";
export const protect = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Multi-model lookup
        let user = await User.findById(decoded.id).select('status role email name');
        if (!user)
            user = await Employee.findById(decoded.id).select('status role email name');
        if (!user)
            user = await HR.findById(decoded.id).select('status role email name');
        if (!user)
            user = await Admin.findById(decoded.id).select('status role email name');
        if (!user) {
            return res.status(401).json({ message: "User record not found" });
        }
        // FIXED: Case-insensitive status
        const normalizedStatus = user.status.toString().toLowerCase().trim();
        console.log(`🔍 Middleware check - ID: ${decoded.id}, Status: ${normalizedStatus}`);
        if (normalizedStatus !== "active") {
            return res.status(401).json({ message: `Account status '${normalizedStatus}' - Contact admin.` });
        }
        req.user = {
            id: user._id,
            role: (user.role || 'employee').toLowerCase().trim(),
            status: normalizedStatus,
            email: user.email
        };
        console.log('👤 User auth:', { id: req.user.id, role: req.user.role });
        next();
    }
    catch (error) {
        console.error("🛡️ Auth error:", error);
        return res.status(401).json({ message: "Invalid token" });
    }
};
//# sourceMappingURL=authMiddleware.js.map