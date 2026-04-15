import mongoose, { Document } from "mongoose";
export type HolidayType = "national" | "optional" | "restricted" | "company";
export interface IHoliday extends Document {
    name: string;
    date: Date;
    type: HolidayType;
    description?: string;
    isRecurring: boolean;
    createdBy: {
        id: mongoose.Types.ObjectId;
        name: string;
        role: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IHoliday, {}, {}, {}, mongoose.Document<unknown, {}, IHoliday, {}, mongoose.DefaultSchemaOptions> & IHoliday & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IHoliday>;
export default _default;
//# sourceMappingURL=Holiday.d.ts.map