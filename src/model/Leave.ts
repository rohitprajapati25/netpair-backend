import mongoose, { Schema, Document, Model } from 'mongoose';
import { ROLES } from '../../../constants/roles.js';

export interface ILeave extends Document {
  employeeId: mongoose.Types.ObjectId;  // Reference to Employee
  type: 'Casual' | 'Sick' | 'Emergency' | 'Maternity' | 'Paternity' | 'Personal';
  fromDate: Date;
  toDate: Date;
  days: number;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: mongoose.Types.ObjectId;  // Admin/SuperAdmin who approved/rejected
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema: Schema = new Schema<ILeave>({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee ID is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['Casual', 'Sick', 'Emergency', 'Maternity', 'Paternity', 'Personal'],
    required: [true, 'Leave type is required']
  },
  fromDate: {
    type: Date,
    required: [true, 'From date is required']
  },
  toDate: {
    type: Date,
    required: [true, 'To date is required']
  },
  days: {
    type: Number,
    required: [true, 'Number of days is required'],
    min: [1, 'Minimum 1 day leave']
  },
  reason: {
    type: String,
    maxlength: [500, 'Reason max 500 characters']
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
LeaveSchema.index({ employeeId: 1, status: 1 });
LeaveSchema.index({ status: 1, fromDate: -1 });
LeaveSchema.index({ approvedBy: 1 });

// Calculate days automatically (pre-save)
LeaveSchema.pre('save', function(next) {
  if (this.fromDate && this.toDate) {
    const diffTime = this.toDate.getTime() - this.fromDate.getTime();
    this.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;  // Inclusive days
  }
  next();
});

export const Leave: Model<ILeave> = mongoose.model<ILeave>('Leave', LeaveSchema);

export default Leave;

