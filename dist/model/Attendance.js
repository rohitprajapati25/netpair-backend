import mongoose from "mongoose";
export var ATTENDANCE_STATUS;
(function (ATTENDANCE_STATUS) {
    ATTENDANCE_STATUS["PRESENT"] = "Present";
    ATTENDANCE_STATUS["ABSENT"] = "Absent";
    ATTENDANCE_STATUS["LATE"] = "Late";
    ATTENDANCE_STATUS["LEAVE"] = "Leave";
    ATTENDANCE_STATUS["HALF_DAY"] = "Half Day";
})(ATTENDANCE_STATUS || (ATTENDANCE_STATUS = {}));
export var WORK_MODE;
(function (WORK_MODE) {
    WORK_MODE["OFFICE"] = "Office";
    WORK_MODE["WFH"] = "WFH";
    WORK_MODE["REMOTE"] = "Remote";
    WORK_MODE["OFFLINE"] = "Offline";
})(WORK_MODE || (WORK_MODE = {}));
const options = { timestamps: true };
const attendanceSchema = new mongoose.Schema({
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
export default mongoose.model("attendances", attendanceSchema);
//# sourceMappingURL=Attendance.js.map