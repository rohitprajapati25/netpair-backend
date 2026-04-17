import mongoose, { Document, Schema } from "mongoose";

export enum TASK_STATUS {
  TODO        = "Todo",
  IN_PROGRESS = "In Progress",
  REVIEW      = "Review",
  COMPLETED   = "Completed",
  BLOCKED     = "Blocked",
}

export enum TASK_PRIORITY {
  LOW      = "Low",
  MEDIUM   = "Medium",
  HIGH     = "High",
  CRITICAL = "Critical",
}

export interface ITask extends Document {
  task_title:   string;
  project_id:   mongoose.Types.ObjectId;   // Ref Project
  assigned_to:  mongoose.Types.ObjectId;   // Ref User (unified — covers Employee & HR)
  assigned_by:  mongoose.Types.ObjectId;   // Ref User
  description?: string;
  priority:     TASK_PRIORITY;
  start_date:   Date;
  due_date:     Date;
  status:       TASK_STATUS;
  progress:     number;                    // 0-100
  comments:     Array<{
    text:      string;
    by:        mongoose.Types.ObjectId;
    createdAt: Date;
  }>;
  deletedAt?: Date;                        // soft-delete
  createdAt:  Date;
  updatedAt:  Date;
}

const taskSchema = new Schema<ITask>(
  {
    task_title: {
      type:      String,
      required:  [true, "Task title is required"],
      trim:      true,
      maxlength: [200, "Title too long"],
    },
    project_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Project",
      required: [true, "Project is required"],
      index:    true,
    },
    // ── Ref changed to "User" so both Employee._id and User._id work ──────────
    assigned_to: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "Assignee required"],
    },
    assigned_by: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    description: {
      type:      String,
      maxlength: [2000],
    },
    priority: {
      type:    String,
      enum:    Object.values(TASK_PRIORITY),
      default: TASK_PRIORITY.MEDIUM,
    },
    start_date: { type: Date, required: true },
    due_date:   { type: Date, required: true },
    status: {
      type:    String,
      enum:    Object.values(TASK_STATUS),
      default: TASK_STATUS.TODO,
    },
    progress: {
      type:    Number,
      default: 0,
      min:     0,
      max:     100,
    },
    comments: [
      {
        text:      { type: String, required: true },
        by:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ project_id: 1, status: 1 });
taskSchema.index({ assigned_to: 1 });
taskSchema.index({ due_date: 1 });
taskSchema.index({ status: 1, priority: 1 });
taskSchema.index({ deletedAt: 1 });

export default mongoose.model<ITask>("Task", taskSchema);
