import type { Request, Response } from "express";
export declare const createHR: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getHRs: (req: Request, res: Response) => Promise<void>;
export declare const updateHR: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteHR: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=hrController.d.ts.map