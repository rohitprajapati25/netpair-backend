import mongoose, { Document } from "mongoose";
export declare enum TASK_STATUS {
    TODO = "Todo",
    IN_PROGRESS = "In Progress",
    REVIEW = "Review",
    COMPLETED = "Completed",
    BLOCKED = "Blocked"
}
export declare enum TASK_PRIORITY {
    LOW = "Low",
    MEDIUM = "Medium",
    HIGH = "High",
    CRITICAL = "Critical"
}
export interface ITask extends Document {
    task_title: string;
    project_id: mongoose.Types.ObjectId;
    assigned_to: mongoose.Types.ObjectId;
    assigned_by: mongoose.Types.ObjectId;
    description?: string;
    priority: TASK_PRIORITY;
    start_date: Date;
    due_date: Date;
    status: TASK_STATUS;
    comments?: Array<{
        text: string;
        by: mongoose.Types.ObjectId;
        createdAt: Date;
    }>;
    progress?: number;
    created_at: Date;
    updated_at: Date;
    deletedAt?: Date;
}
declare const _default: mongoose.Model<ITask, {}, {}, {}, mongoose.Document<unknown, {}, ITask, {}, mongoose.DefaultSchemaOptions> & ITask & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ITask>;
export default _default;
//# sourceMappingURL=Task.d.ts.map