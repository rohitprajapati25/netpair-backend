import type { Response, NextFunction } from "express";
import { ROLES } from "../../constants/roles.js"; 

export const authorizeRoles = (...roles: ROLES[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "User role not found" });
    }

    const userRole = (req.user.role as string).toLowerCase().trim() as ROLES;

    console.log('🔐 Role check:', { userRole, allowed: roles });
    
    if (!roles.includes(userRole as any)) {
      return res.status(403).json({ message: `Access Denied. Role: ${userRole}, Required: ${roles.join(', ')}` });
    }

    next();
  };
};