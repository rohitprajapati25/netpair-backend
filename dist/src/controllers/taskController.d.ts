import { Request, Response } from 'express';
export declare const createTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTasks: (req: Request, res: Response) => Promise<void>;
export declare const updateTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getTaskStats: (req: Request, res: Response) => Promise<void>;
export declare const updateTaskProgress: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const addTaskComment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=taskController.d.ts.map