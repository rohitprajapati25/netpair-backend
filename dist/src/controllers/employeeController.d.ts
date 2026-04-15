import type { Request, Response } from "express";
export declare const createEmployee: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getEmployees: (req: Request, res: Response) => Promise<void>;
export declare const getEmployeeById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateEmployee: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteEmployee: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getActiveEmployees: (req: Request, res: Response) => Promise<void>;
export declare const getCompanies: (req: Request, res: Response) => Promise<void>;
export declare const getEmployeesByCompany: (req: Request, res: Response) => Promise<void>;
export declare const loginEmployee: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=employeeController.d.ts.map