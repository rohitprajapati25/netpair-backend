import mongoose, { Schema } from "mongoose";
export var PROJECT_STATUS;
(function (PROJECT_STATUS) {
    PROJECT_STATUS["PENDING"] = "Pending";
    PROJECT_STATUS["ONGOING"] = "Ongoing";
    PROJECT_STATUS["COMPLETED"] = "Completed";
    PROJECT_STATUS["ON_HOLD"] = "On Hold";
    PROJECT_STATUS["CANCELLED"] = "Cancelled";
})(PROJECT_STATUS || (PROJECT_STATUS = {}));
export var PROJECT_PRIORITY;
(function (PROJECT_PRIORITY) {
    PROJECT_PRIORITY["LOW"] = "Low";
    PROJECT_PRIORITY["MEDIUM"] = "Medium";
    PROJECT_PRIORITY["HIGH"] = "High";
    PROJECT_PRIORITY["CRITICAL"] = "Critical";
})(PROJECT_PRIORITY || (PROJECT_PRIORITY = {}));
const projectSchema = new Schema({
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
projectSchema.query.notDeleted = function () {
    return this.where({ deletedAt: null });
};
export default mongoose.model("Project", projectSchema);
//# sourceMappingURL=Project.js.map