import mongoose, { Document } from "mongoose";
export interface IAnnouncement extends Document {
    title: string;
    message: string;
    targetRole: "all" | "admin" | "hr" | "employee";
    priority: "normal" | "important" | "urgent";
    createdBy: {
        id: mongoose.Types.ObjectId;
        name: string;
        role: string;
    };
    isActive: boolean;
    expiresAt?: Date;
    createdAt: Date;
}
declare const _default: mongoose.Model<IAnnouncement, {}, {}, {}, mongoose.Document<unknown, {}, IAnnouncement, {}, mongoose.DefaultSchemaOptions> & IAnnouncement & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAnnouncement>;
export default _default;
//# sourceMappingURL=Announcement.d.ts.map