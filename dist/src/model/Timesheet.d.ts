import mongoose, { Document } from "mongoose";
export declare enum TIMESHEET_STATUS {
    SUBMITTED = "Submitted",
    APPROVED = "Approved",
    REJECTED = "Rejected"
}
export interface ITimesheet extends Document {
    date: Date;
    project_id: mongoose.Types.ObjectId;
    task_id: mongoose.Types.ObjectId;
    employee_id: mongoose.Types.ObjectId;
    hours_worked: number;
    work_description: string;
    status: TIMESHEET_STATUS;
    approved_by?: mongoose.Types.ObjectId;
    rejection_reason?: string;
    created_at: Date;
    updated_at: Date;
    deletedAt?: Date;
}
declare const _default: mongoose.Model<ITimesheet, {}, {}, {}, mongoose.Document<unknown, {}, ITimesheet, {}, mongoose.DefaultSchemaOptions> & ITimesheet & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ITimesheet>;
export default _default;
//# sourceMappingURL=Timesheet.d.ts.map