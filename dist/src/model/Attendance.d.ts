import mongoose, { Document } from "mongoose";
import { IUser } from "../model/User.js";
export declare enum ATTENDANCE_STATUS {
    PRESENT = "Present",
    ABSENT = "Absent",
    LATE = "Late",
    LEAVE = "Leave",
    HALF_DAY = "Half Day"
}
export declare enum WORK_MODE {
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
    workingHours?: number;
    notes?: string;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId | IUser;
}
declare const _default: mongoose.Model<IAttendance, {}, {}, {}, mongoose.Document<unknown, {}, IAttendance, {}, mongoose.DefaultSchemaOptions> & IAttendance & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAttendance>;
export default _default;
//# sourceMappingURL=Attendance.d.ts.map