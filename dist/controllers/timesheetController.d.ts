import { Request, Response } from 'express';
export declare const submitTimesheet: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTimesheets: (req: Request, res: Response) => Promise<void>;
export declare const approveTimesheet: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getProductivityReport: (req: Request, res: Response) => Promise<void>;
export declare const deleteTimesheet: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=timesheetController.d.ts.map