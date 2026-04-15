import mongoose, { Types } from 'mongoose';
type RoleType = 'employee' | 'hr' | 'admin';
/**
 * Update Role + User collections atomically
 * @param roleDocId - Role document ID (same as User ID)
 * @param updateData - Fields to sync (name, status, department, etc.)
 * @param role - 'employee' | 'hr' | 'admin'
 */
export declare const syncRoleUserUpdate: (roleDocId: Types.ObjectId, updateData: any, role: RoleType) => Promise<{
    roleDoc: any;
    userDoc: (mongoose.Document<unknown, {}, import("../model/User.js").IUser, {}, mongoose.DefaultSchemaOptions> & import("../model/User.js").IUser & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }) | null;
    synced: boolean;
}>;
/**
 * Soft delete Role + User collections
 */
export declare const syncRoleUserDelete: (roleDocId: Types.ObjectId, role: RoleType) => Promise<{
    roleDocId: Types.ObjectId;
    role: RoleType;
    softDeleted: boolean;
}>;
export declare const syncRoleUserStatus: (roleDocId: Types.ObjectId, newStatus: string, role: RoleType) => Promise<{
    synced: boolean;
    status: string;
}>;
export declare const getLinkedUserByRoleId: (roleDocId: Types.ObjectId, role: RoleType) => Promise<(mongoose.Document<unknown, {}, import("../model/User.js").IUser, {}, mongoose.DefaultSchemaOptions> & import("../model/User.js").IUser & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | null>;
export {};
//# sourceMappingURL=roleSync.d.ts.map