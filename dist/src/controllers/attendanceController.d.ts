import { Request, Response } from "express";
export declare const getAttendanceRecords: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const markAttendance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateAttendance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteAttendance: (req: Request, res: Response) => Promise<void>;
export declare const getTodayAttendanceStats: (req: Request, res: Response) => Promise<void>;
/** GET /api/employees/attendance/today — returns today's record for the logged-in employee */
export declare const getTodayStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/employees/attendance/checkin — employee marks themselves Present with current time */
export declare const checkIn: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/** POST /api/employees/attendance/checkout — employee records check-out time */
export declare const checkOut: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=attendanceController.d.ts.map