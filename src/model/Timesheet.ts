import mongoose, { Document, Schema } from "mongoose";

export enum TIMESHEET_STATUS {
  SUBMITTED = "Submitted",
  APPROVED = "Approved",
  REJECTED = "Rejected"
}

export interface ITimesheet extends Document {
  date: Date;
  project_id: mongoose.Types.ObjectId; // Ref Project
  task_id: mongoose.Types.ObjectId; // Ref Task (optional if general project work)
  employee_id: mongoose.Types.ObjectId; // Ref Employee
  hours_worked: number;
  work_description: string;
  status: TIMESHEET_STATUS;
  approved_by?: mongoose.Types.ObjectId; // Ref Admin/HR
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
  deletedAt?: Date;
}

const timesheetSchema = new Schema<ITimesheet>({
  date: {
    type: Date,
    required: [true, "Date is required"]
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: [true, "Project is required"],
    index: true
  },
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    index: true
  },
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: [true, "Employee required"]
  },
  hours_worked: {
    type: Number,
    required: [true, "Hours worked required"],
    min: [0, "Hours cannot be negative"],
    max: [24, "Max 24 hours per day"]
  },
  work_description: {
    type: String,
    required: [true, "Work description required"],
    maxlength: [2000]
  },
  status: {
    type: String,
    enum: Object.values(TIMESHEET_STATUS),
    default: TIMESHEET_STATUS.SUBMITTED
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User" // Admin/HR
  },
  rejection_reason: {
    type: String,
    maxlength: [500]
  }
}, {
  timestamps: true
});

timesheetSchema.index({ employee_id: 1, date: 1 });
timesheetSchema.index({ project_id: 1, status: 1 });
timesheetSchema.index({ date: -1 });

timesheetSchema.query.notDeleted = function() {
  return this.where({ deletedAt: null });
};

export default mongoose.model<ITimesheet>("Timesheet", timesheetSchema);

