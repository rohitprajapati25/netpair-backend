import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  action:    string;
  resource:  string;
  details:   string;
  severity:  "INFO" | "MEDIUM" | "WARNING" | "HIGH";
  status:    "SUCCESS" | "FAILED";
  user: {
    id:    mongoose.Types.ObjectId;
    name:  string;
    role:  string;
    email: string;
  };
  device?: {
    name:    string;   // e.g. "Chrome on Windows"
    os:      string;   // e.g. "Windows 10"
    browser: string;   // e.g. "Chrome 120"
    type:    string;   // "Desktop" | "Mobile" | "Tablet"
  };
  meta?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action:   { type: String, required: true, index: true },
    resource: { type: String, required: true },
    details:  { type: String, required: true },
    severity: { type: String, enum: ["INFO","MEDIUM","WARNING","HIGH"], default: "INFO" },
    status:   { type: String, enum: ["SUCCESS","FAILED"], default: "SUCCESS" },
    user: {
      id:    { type: Schema.Types.ObjectId, required: true, index: true },
      name:  { type: String, required: true },
      role:  { type: String, required: true },
      email: { type: String, default: "" },
    },
    device: {
      name:    { type: String, default: "Unknown Device" },
      os:      { type: String, default: "" },
      browser: { type: String, default: "" },
      type:    { type: String, default: "Desktop" },
    },
    meta:      { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,   // adds createdAt + updatedAt
    versionKey: false,
  }
);

// Index for fast filtering
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ "user.id": 1, createdAt: -1 });

export default mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
