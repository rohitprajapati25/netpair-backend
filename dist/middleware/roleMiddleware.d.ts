import type { Response, NextFunction } from "express";
import { ROLES } from "../constants/roles.js";
export declare const authorizeRoles: (...roles: ROLES[]) => (req: any, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=roleMiddleware.d.ts.map