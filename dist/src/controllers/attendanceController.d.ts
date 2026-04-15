import { Request, Response } from "express";
export declare const getAttendanceRecords: (req: Request, res: Response) => Promise<void>;
export declare const markAttendance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateAttendance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteAttendance: (req: Request, res: Response) => Promise<void>;
export declare const getTodayAttendanceStats: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=attendanceController.d.ts.map