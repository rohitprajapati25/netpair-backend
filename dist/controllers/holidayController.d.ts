import type { Request, Response } from "express";
export declare const getHolidays: (req: Request, res: Response) => Promise<void>;
export declare const createHoliday: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateHoliday: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteHoliday: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=holidayController.d.ts.map