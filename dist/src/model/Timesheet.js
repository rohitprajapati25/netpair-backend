import mongoose, { Schema } from "mongoose";
export var TIMESHEET_STATUS;
(function (TIMESHEET_STATUS) {
    TIMESHEET_STATUS["SUBMITTED"] = "Submitted";
    TIMESHEET_STATUS["APPROVED"] = "Approved";
    TIMESHEET_STATUS["REJECTED"] = "Rejected";
})(TIMESHEET_STATUS || (TIMESHEET_STATUS = {}));
const timesheetSchema = new Schema({
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
        maxlength: [2000, "Work description too long"]
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
// (timesheetSchema.query as any).notDeleted = function() {
// return this.where({ deletedAt: null });
// };
export default mongoose.model("Timesheet", timesheetSchema);
//# sourceMappingURL=Timesheet.js.map