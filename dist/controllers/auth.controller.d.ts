import type { Request, Response } from "express";
export declare const loginUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const forgotPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const resetPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.controller.d.ts.map