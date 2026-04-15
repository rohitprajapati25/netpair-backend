import mongoose, { Document } from "mongoose";
export interface IEmployee extends Document {
    name: string;
    email: string;
    phone: string;
    gender?: string;
    dob?: Date;
    department: string;
    designation: string;
    role: string;
    joiningDate?: Date;
    employmentType?: string;
    password: string;
    isFirstLogin: boolean;
    status: string;
    createdBy?: mongoose.Types.ObjectId;
    deletedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
}
declare const _default: mongoose.Model<IEmployee, {}, {}, {}, mongoose.Document<unknown, {}, IEmployee, {}, mongoose.DefaultSchemaOptions> & IEmployee & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IEmployee>;
export default _default;
//# sourceMappingURL=Employee.d.ts.map