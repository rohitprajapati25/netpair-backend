import mongoose from "mongoose";
import { ROLES } from "../../constants/roles.js";
declare const _default: mongoose.Model<{
    role: ROLES.SUPER_ADMIN | ROLES.ADMIN | ROLES.HR | ROLES.EMPLOYEE;
    name?: string | null | undefined;
    email?: string | null | undefined;
    password?: string | null | undefined;
} & mongoose.DefaultTimestampProps, {}, {}, {
    id: string;
}, mongoose.Document<unknown, {}, {
    role: ROLES.SUPER_ADMIN | ROLES.ADMIN | ROLES.HR | ROLES.EMPLOYEE;
    name?: string | null | undefined;
    email?: string | null | undefined;
    password?: string | null | undefined;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, {
    timestamps: true;
}> & Omit<{
    role: ROLES.SUPER_ADMIN | ROLES.ADMIN | ROLES.HR | ROLES.EMPLOYEE;
    name?: string | null | undefined;
    email?: string | null | undefined;
    password?: string | null | undefined;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any, any>, {}, {}, {}, {}, {
    timestamps: true;
}, {
    role: ROLES.SUPER_ADMIN | ROLES.ADMIN | ROLES.HR | ROLES.EMPLOYEE;
    name?: string | null | undefined;
    email?: string | null | undefined;
    password?: string | null | undefined;
} & mongoose.DefaultTimestampProps, mongoose.Document<unknown, {}, {
    role: ROLES.SUPER_ADMIN | ROLES.ADMIN | ROLES.HR | ROLES.EMPLOYEE;
    name?: string | null | undefined;
    email?: string | null | undefined;
    password?: string | null | undefined;
} & mongoose.DefaultTimestampProps, {
    id: string;
}, mongoose.MergeType<mongoose.DefaultSchemaOptions, {
    timestamps: true;
}>> & Omit<{
    role: ROLES.SUPER_ADMIN | ROLES.ADMIN | ROLES.HR | ROLES.EMPLOYEE;
    name?: string | null | undefined;
    email?: string | null | undefined;
    password?: string | null | undefined;
} & mongoose.DefaultTimestampProps & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, "id"> & {
    id: string;
}, {
    [path: string]: mongoose.SchemaDefinitionProperty<undefined, any, any>;
} | {
    [x: string]: mongoose.SchemaDefinitionProperty<any, any, mongoose.Document<unknown, {}, {
        role: ROLES.SUPER_ADMIN | ROLES.ADMIN | ROLES.HR | ROLES.EMPLOYEE;
        name?: string | null | undefined;
        email?: string | null | undefined;
        password?: string | null | undefined;
    } & mongoose.DefaultTimestampProps, {
        id: string;
    }, mongoose.MergeType<mongoose.DefaultSchemaOptions, {
        timestamps: true;
    }>> & Omit<{
        role: ROLES.SUPER_ADMIN | ROLES.ADMIN | ROLES.HR | ROLES.EMPLOYEE;
        name?: string | null | undefined;
        email?: string | null | undefined;
        password?: string | null | undefined;
    } & mongoose.DefaultTimestampProps & {
        _id: mongoose.Types.ObjectId;
    } & {
        __v: number;
    }, "id"> & {
        id: string;
    }> | undefined;
}, {
    role: ROLES.SUPER_ADMIN | ROLES.ADMIN | ROLES.HR | ROLES.EMPLOYEE;
    name?: string | null | undefined;
    email?: string | null | undefined;
    password?: string | null | undefined;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>, {
    role: ROLES.SUPER_ADMIN | ROLES.ADMIN | ROLES.HR | ROLES.EMPLOYEE;
    name?: string | null | undefined;
    email?: string | null | undefined;
    password?: string | null | undefined;
    createdAt: NativeDate;
    updatedAt: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>;
export default _default;
//# sourceMappingURL=user.model.d.ts.map