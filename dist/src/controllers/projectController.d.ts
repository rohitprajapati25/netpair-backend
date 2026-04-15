import { Request, Response } from "express";
export declare const getProjects: (req: Request, res: Response) => Promise<void>;
export declare const createProject: (req: Request, res: Response) => Promise<void>;
export declare const getProjectStats: (req: Request, res: Response) => Promise<void>;
export declare const getProjectLogs: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateProject: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteProject: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=projectController.d.ts.map