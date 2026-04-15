import mongoose, { Schema, Document } from "mongoose";

export interface IAnnouncement extends Document {
  title:      string;
  message:    string;
  targetRole: "all" | "admin" | "hr" | "employee";
  priority:   "normal" | "important" | "urgent";
  createdBy: {
    id:   mongoose.Types.ObjectId;
    name: string;
    role: string;
  };
  isActive:  boolean;
  expiresAt?: Date;
  createdAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title:      { type: String, required: true, trim: true, maxlength: 200 },
    message:    { type: String, required: true, trim: true, maxlength: 2000 },
    targetRole: { type: String, enum: ["all", "admin", "hr", "employee"], default: "all" },
    priority:   { type: String, enum: ["normal", "important", "urgent"],  default: "normal" },
    createdBy: {
      id:   { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
    },
    isActive:  { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

AnnouncementSchema.index({ targetRole: 1, isActive: 1, createdAt: -1 });

export default mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
