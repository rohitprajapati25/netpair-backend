import mongoose, { Document, Schema } from "mongoose";
import { PROJECT_PRIORITY } from "./Project.js"; // Reuse if fits, else define local

export enum TASK_STATUS {
  TODO = "Todo",
  IN_PROGRESS = "In Progress",
  REVIEW = "Review",
  COMPLETED = "Completed",
  BLOCKED = "Blocked"
}

export enum TASK_PRIORITY {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  CRITICAL = "Critical"
}

// Extend PROJECT_PRIORITY if same, but use local for task-specific
export interface ITask extends Document {
  task_title: string;
  project_id: mongoose.Types.ObjectId; // Ref Project
  assigned_to: mongoose.Types.ObjectId; // Ref Employee
  assigned_by: mongoose.Types.ObjectId; // Ref User/Admin
  description?: string;
  priority: TASK_PRIORITY;
  start_date: Date;
  due_date: Date;
  status: TASK_STATUS;
  comments?: string[]; // Array of {text, by, at}
  progress?: number; // 0-100
  created_at: Date;
  updated_at: Date;
  deletedAt?: Date;
}

const taskSchema = new Schema<ITask>({
  task_title: {
    type: String,
    required: [true, "Task title is required"],
    trim: true,
    maxlength: [200, "Title too long"]
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: [true, "Project is required"],
    index: true
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: [true, "Assignee required"]
  },
  assigned_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // or Admin model if separate
    required: true
  },
  description: {
    type: String,
    maxlength: [2000]
  },
  priority: {
    type: String,
    enum: Object.values(TASK_PRIORITY),
    default: TASK_PRIORITY.MEDIUM
  },
  start_date: {
    type: Date,
    required: true
  },
  due_date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(TASK_STATUS),
    default: TASK_STATUS.TODO
  },
  comments: [{
    text: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }
  }],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

taskSchema.index({ project_id: 1, status: 1 });
taskSchema.index({ assigned_to: 1 });
taskSchema.index({ due_date: 1 });
taskSchema.index({ status: 1, priority: 1 });

taskSchema.query.notDeleted = function() {
  return this.where({ deletedAt: null });
};

export default mongoose.model<ITask>("Task", taskSchema);

