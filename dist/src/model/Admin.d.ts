import mongoose, { Document } from 'mongoose';
export interface IAdmin extends Document {
    name: string;
    email: string;
    phone: string;
    department?: string;
    designation: string;
    role: string;
    joiningDate?: Date;
    employmentType: string;
    password: string;
    status: string;
    isFirstLogin: boolean;
    createdBy: mongoose.Types.ObjectId;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
}
declare const _default: mongoose.Model<IAdmin, {}, {}, {}, mongoose.Document<unknown, {}, IAdmin, {}, mongoose.DefaultSchemaOptions> & IAdmin & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAdmin>;
export default _default;
//# sourceMappingURL=Admin.d.ts.map