import type { Response, NextFunction } from "express";
import { ROLES } from "../../constants/roles.js"; 

export const authorizeRoles = (...roles: ROLES[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "User role not found" });
    }

    const userRole = req.user.role as ROLES;

    if (!roles.includes(userRole)) {
      return res.status(403).json({ message: "Access Denied" });
    }

    next();
  };
};