import mongoose, { Schema, Document, Model } from 'mongoose';

export const LEAVE_TYPES = ['Casual', 'Sick', 'Emergency', 'Maternity', 'Paternity', 'Personal', 'Earned'] as const;
export type LeaveType = typeof LEAVE_TYPES[number];

export interface ILeave extends Document {
  employeeId: mongoose.Types.ObjectId;  // Reference to User (unified model)
  type: LeaveType;
  fromDate: Date;
  toDate: Date;
  days: number;
  reason?: string;
  rejectionReason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: mongoose.Types.ObjectId;  // User who approved/rejected (any role)
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema: Schema = new Schema<ILeave>(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',                          // ← unified User model
      required: [true, 'Employee ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: LEAVE_TYPES,
      required: [true, 'Leave type is required'],
    },
    fromDate: {
      type: Date,
      required: [true, 'From date is required'],
    },
    toDate: {
      type: Date,
      required: [true, 'To date is required'],
    },
    days: {
      type: Number,
      min: [1, 'Minimum 1 day leave'],
    },
    reason: {
      type: String,
      maxlength: [500, 'Reason max 500 characters'],
    },
    rejectionReason: {
      type: String,
      maxlength: [500, 'Rejection reason max 500 characters'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',                          // ← any role can approve (Admin/HR/SuperAdmin)
    },
    approvedAt: Date,
  },
  { timestamps: true }
);

// Compound indexes for common query patterns
LeaveSchema.index({ employeeId: 1, status: 1 });
LeaveSchema.index({ status: 1, fromDate: -1 });
LeaveSchema.index({ createdAt: -1 });

export const Leave: Model<ILeave> = mongoose.model<ILeave>('Leave', LeaveSchema);
export default Leave;
