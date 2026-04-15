import mongoose, { Document } from "mongoose";
export declare enum PROJECT_STATUS {
    PENDING = "Pending",
    ONGOING = "Ongoing",
    COMPLETED = "Completed",
    ON_HOLD = "On Hold",
    CANCELLED = "Cancelled"
}
export declare enum PROJECT_PRIORITY {
    LOW = "Low",
    MEDIUM = "Medium",
    HIGH = "High",
    CRITICAL = "Critical"
}
export interface IProject extends Document {
    name: string;
    description: string;
    client: string;
    clientContact: string;
    company: string;
    projectCode: string;
    projectOwnerId: mongoose.Types.ObjectId;
    startDate: Date;
    endDate: Date;
    status: PROJECT_STATUS;
    priority: PROJECT_PRIORITY;
    project_type: string;
    assignedEmployees: mongoose.Types.ObjectId[];
    manager: mongoose.Types.ObjectId;
    budget: number;
    actualCost: number;
    progress: number;
    risks: string[];
    attachments: Array<{
        filename: string;
        path: string;
        size: number;
        mimeType: string;
    }>;
    milestones: [
        {
            name: string;
            dueDate: Date;
            completed: boolean;
        }
    ];
    tasks?: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    deletedAt?: Date;
}
declare const _default: mongoose.Model<IProject, {}, {}, {}, mongoose.Document<unknown, {}, IProject, {}, mongoose.DefaultSchemaOptions> & IProject & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IProject>;
export default _default;
//# sourceMappingURL=Project.d.ts.map