import type { Response, NextFunction } from "express";
import { ROLES } from "../../constants/roles.js"; 

export const authorizeRoles = (...roles: ROLES[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    console.log('🔐 Role middleware - User:', req.user);
    console.log('🔐 Role middleware - Allowed roles:', roles);
    
    if (!req.user || !req.user.role) {
      console.log('❌ No user or role found');
      return res.status(401).json({ message: "User role not found" });
    }

    const userRole = (req.user.role as string).toLowerCase().trim() as ROLES;
    console.log('🔐 Role check:', { userRole, allowed: roles, userRoleType: typeof userRole });
    
    // Check if userRole is in allowed roles
    const hasAccess = roles.some(role => role.toLowerCase() === userRole);
    console.log('🔐 Access check result:', hasAccess);
    
    if (!hasAccess) {
      console.log('❌ Access denied');
      return res.status(403).json({ message: `Access Denied. Role: ${userRole}, Required: ${roles.join(', ')}` });
    }
    
    console.log('✅ Access granted');
    next();
  };
};