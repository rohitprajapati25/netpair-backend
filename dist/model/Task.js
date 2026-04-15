import mongoose, { Schema } from "mongoose";
export var TASK_STATUS;
(function (TASK_STATUS) {
    TASK_STATUS["TODO"] = "Todo";
    TASK_STATUS["IN_PROGRESS"] = "In Progress";
    TASK_STATUS["REVIEW"] = "Review";
    TASK_STATUS["COMPLETED"] = "Completed";
    TASK_STATUS["BLOCKED"] = "Blocked";
})(TASK_STATUS || (TASK_STATUS = {}));
export var TASK_PRIORITY;
(function (TASK_PRIORITY) {
    TASK_PRIORITY["LOW"] = "Low";
    TASK_PRIORITY["MEDIUM"] = "Medium";
    TASK_PRIORITY["HIGH"] = "High";
    TASK_PRIORITY["CRITICAL"] = "Critical";
})(TASK_PRIORITY || (TASK_PRIORITY = {}));
const taskSchema = new Schema({
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
// (taskSchema.query as any).notDeleted = function() {
// return this.where({ deletedAt: null });
// };
export default mongoose.model("Task", taskSchema);
//# sourceMappingURL=Task.js.map