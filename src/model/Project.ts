import mongoose, { Document, Schema } from "mongoose";

export enum PROJECT_STATUS {
  PENDING = "Pending",
  ONGOING = "Ongoing",
  COMPLETED = "Completed",
  ON_HOLD = "On Hold",
  CANCELLED = "Cancelled"
}

export enum PROJECT_PRIORITY {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  CRITICAL = "Critical"
}

export interface IProject extends Document {
  name: string;
  description: string;
  client: string;
  clientContact: string;
  company: string;
  projectCode: string;
  projectOwnerId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: PROJECT_STATUS;
  priority: PROJECT_PRIORITY;
  project_type: string;
  assignedEmployees: mongoose.Types.ObjectId[];
  manager: mongoose.Types.ObjectId;
  budget: number;
  actualCost: number;
  progress: number;
  risks: string[];
  attachments: Array<{
    filename: string;
    path: string;
    size: number;
    mimeType: string;
  }>;

  milestones: [{
    name: string;
    dueDate: Date;
    completed: boolean;
  }];
  tasks?: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
}


const projectSchema = new Schema<IProject>({
  name: {
    type: String,
    required: [true, "Project name required"],
    trim: true,
    maxlength: [100, "Name too long"]
  },
  description: {
    type: String,
    maxlength: [1000, "Description too long"]
  },
  client: {
    type: String,
    trim: true
  },
  clientContact: {
    type: String
  },

  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },


  endDate: {
    type: Date
  },

status: {
    type: String,
    enum: Object.values(PROJECT_STATUS),
    default: PROJECT_STATUS.ONGOING
  },
  priority: {
    type: String,
    enum: Object.values(PROJECT_PRIORITY),
    default: PROJECT_PRIORITY.MEDIUM
  },
  project_type: {
    type: String,
    enum: ['Internal', 'Client', 'Product'],
    default: 'Internal'
  },
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  },

  budget: {
    type: Number,
    default: 0,
    min: 0
  },

  company: {
    type: String,
    required: [true, 'Company/Department is required']
  },






  projectCode: String,

  projectOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee"
  },

  // actualCost: { type: Number, default: 0, min: 0 }, // Removed unused

  progress: { type: Number, default: 0, min: 0, max: 100 },
  // risks: [{ type: String }], // Removed unused
  attachments: [{
    filename: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  milestones: [{
    name: {
      type: String,
      required: true
    },
    dueDate: Date,
    completed: {
      type: Boolean,
      default: false
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  deletedAt: Date
}, {
  timestamps: true
});


projectSchema.index({ status: 1 });
projectSchema.index({ priority: 1 });
projectSchema.index({ startDate: -1 });
projectSchema.index({ project_type: 1 });
projectSchema.index({ progress: -1 });
projectSchema.index({ tasks: 1 }); // For task queries

// Add tasks ref
projectSchema.add({
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task"
  }]
});

(projectSchema.query as any).notDeleted = function() {
  return this.where({ deletedAt: null });
};

export default mongoose.model<IProject>("Project", projectSchema);
