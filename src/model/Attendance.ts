import mongoose, { Document, SchemaOptions } from "mongoose";
import { IUser } from "../model/User.js";

export enum ATTENDANCE_STATUS {
  PRESENT = "Present",
  ABSENT = "Absent",
  LATE = "Late",
  LEAVE = "Leave",
  HALF_DAY = "Half Day"
}

export enum WORK_MODE {
  OFFICE = "Office",
  WFH = "WFH", 
  REMOTE = "Remote",
  OFFLINE = "Offline"
}

export interface IAttendance extends Document {
  employee: mongoose.Types.ObjectId | IUser;
  date: Date;
  checkIn?: string;
  checkOut?: string;
  status: ATTENDANCE_STATUS;
  workMode: WORK_MODE;
  workingHours?: number; // In minutes
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId | IUser;
}

const options = { timestamps: true };

const attendanceSchema = new mongoose.Schema<IAttendance>({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Employee", 
    required: true 
  },
  date: {
    type: Date,
    required: true
  },
  checkIn: String, // "HH:MM" format
  checkOut: String,
  status: {
    type: String,
    enum: Object.values(ATTENDANCE_STATUS),
    default: ATTENDANCE_STATUS.ABSENT
  },
  workMode: {
    type: String,
    enum: Object.values(WORK_MODE),
  },
  workingHours: Number, // minutes
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, options);

// UNIQUE: 1 employee 1 day - Custom error msg
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true, sparse: true });

// Duplicate check moved to controller pre-save
// Index provides DB-level protection

export default mongoose.model<IAttendance>("attendances", attendanceSchema);
