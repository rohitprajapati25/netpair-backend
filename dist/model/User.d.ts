import mongoose, { Document } from "mongoose";
import { ROLES } from "../constants/roles.js";
export interface IUser extends Document {
    name: string;
    email: string;
    phone?: string;
    gender?: string;
    dob?: Date;
    department: string;
    designation: string;
    role: ROLES.ADMIN | ROLES.SUPER_ADMIN | ROLES.HR | ROLES.EMPLOYEE;
    joiningDate?: Date;
    employmentType?: string;
    password: string;
    status: ROLES.ACTIVE | ROLES.INACTIVE;
    isFirstLogin: boolean;
    createdBy?: mongoose.Types.ObjectId;
    deletedAt?: Date;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
export default _default;
//# sourceMappingURL=User.d.ts.map