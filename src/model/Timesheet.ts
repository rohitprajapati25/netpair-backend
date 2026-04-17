import mongoose, { Document, Schema } from "mongoose";

export enum TIMESHEET_STATUS {
  SUBMITTED = "Submitted",
  APPROVED  = "Approved",
  REJECTED  = "Rejected",
}

export interface ITimesheet extends Document {
  date:              Date;
  project_id:        mongoose.Types.ObjectId;   // Ref Project
  task_id?:          mongoose.Types.ObjectId;   // Ref Task (optional)
  employee_id:       mongoose.Types.ObjectId;   // Ref User (unified)
  hours_worked:      number;
  work_description:  string;
  status:            TIMESHEET_STATUS;
  approved_by?:      mongoose.Types.ObjectId;   // Ref User (Admin/HR)
  rejection_reason?: string;
  deletedAt?:        Date;                      // soft-delete
  createdAt:         Date;
  updatedAt:         Date;
}

const timesheetSchema = new Schema<ITimesheet>(
  {
    date: {
      type:     Date,
      required: [true, "Date is required"],
    },
    project_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "Project",
      required: [true, "Project is required"],
      index:    true,
    },
    task_id: {
      type:  mongoose.Schema.Types.ObjectId,
      ref:   "Task",
      index: true,
    },
    // ── Ref changed to "User" so unified model works ──────────────────────────
    employee_id: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: [true, "Employee required"],
    },
    hours_worked: {
      type:     Number,
      required: [true, "Hours worked required"],
      min:      [0.5, "Minimum 0.5 hours"],
      max:      [24,  "Max 24 hours per day"],
    },
    work_description: {
      type:      String,
      required:  [true, "Work description required"],
      minlength: [10,   "Minimum 10 characters"],
      maxlength: [2000, "Max 2000 characters"],
    },
    status: {
      type:    String,
      enum:    Object.values(TIMESHEET_STATUS),
      default: TIMESHEET_STATUS.SUBMITTED,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },
    rejection_reason: {
      type:      String,
      maxlength: [500],
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

timesheetSchema.index({ employee_id: 1, date: -1 });
timesheetSchema.index({ project_id: 1, status: 1 });
timesheetSchema.index({ date: -1 });
timesheetSchema.index({ deletedAt: 1 });

export default mongoose.model<ITimesheet>("Timesheet", timesheetSchema);
