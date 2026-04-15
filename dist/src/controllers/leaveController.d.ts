import type { Request, Response } from "express";
export declare const getLeaves: (req: Request, res: Response) => Promise<void>;
export declare const updateLeaveStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createLeave: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=leaveController.d.ts.map