import mongoose, { Document, Model } from 'mongoose';
export interface ILeave extends Document {
    employeeId: mongoose.Types.ObjectId;
    type: 'Casual' | 'Sick' | 'Emergency' | 'Maternity' | 'Paternity' | 'Personal';
    fromDate: Date;
    toDate: Date;
    days: number;
    reason?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Leave: Model<ILeave>;
export default Leave;
//# sourceMappingURL=Leave.d.ts.map