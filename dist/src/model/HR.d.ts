import mongoose, { Document } from 'mongoose';
export interface IHR extends Document {
    name: string;
    email: string;
    phone: string;
    gender?: string;
    dob?: Date;
    department: string;
    designation: string;
    role: string;
    joiningDate?: Date;
    employmentType: string;
    password: string;
    status: string;
    isFirstLogin: boolean;
    createdBy: mongoose.Types.ObjectId;
}
declare const _default: mongoose.Model<IHR, {}, {}, {}, mongoose.Document<unknown, {}, IHR, {}, mongoose.DefaultSchemaOptions> & IHR & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IHR>;
export default _default;
//# sourceMappingURL=HR.d.ts.map