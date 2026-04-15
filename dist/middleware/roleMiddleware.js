export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: "User role not found" });
        }
        const userRole = req.user.role.toLowerCase().trim();
        const hasAccess = roles.some(role => role.toLowerCase() === userRole);
        if (!hasAccess) {
            return res.status(403).json({
                message: `Access Denied. Required: ${roles.join(', ')}`,
            });
        }
        next();
    };
};
//# sourceMappingURL=roleMiddleware.js.map