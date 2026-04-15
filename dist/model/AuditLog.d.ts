import mongoose, { Document } from "mongoose";
export interface IAuditLog extends Document {
    action: string;
    resource: string;
    details: string;
    severity: "INFO" | "MEDIUM" | "WARNING" | "HIGH";
    status: "SUCCESS" | "FAILED";
    user: {
        id: mongoose.Types.ObjectId;
        name: string;
        role: string;
        email: string;
    };
    device?: {
        name: string;
        os: string;
        browser: string;
        type: string;
    };
    meta?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}
declare const _default: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, mongoose.DefaultSchemaOptions> & IAuditLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAuditLog>;
export default _default;
//# sourceMappingURL=AuditLog.d.ts.map