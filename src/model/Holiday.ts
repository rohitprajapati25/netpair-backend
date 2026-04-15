import mongoose, { Schema, Document } from "mongoose";

export type HolidayType = "national" | "optional" | "restricted" | "company";

export interface IHoliday extends Document {
  name:        string;
  date:        Date;
  type:        HolidayType;
  description?: string;
  isRecurring: boolean;   // repeat every year on same date
  createdBy: {
    id:   mongoose.Types.ObjectId;
    name: string;
    role: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    name:        { type: String, required: true, trim: true, maxlength: 100 },
    date:        { type: Date,   required: true },
    type:        { type: String, enum: ["national", "optional", "restricted", "company"], default: "national" },
    description: { type: String, trim: true, maxlength: 500 },
    isRecurring: { type: Boolean, default: true },
    createdBy: {
      id:   { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
    },
  },
  { timestamps: true, versionKey: false }
);

HolidaySchema.index({ date: 1 });

export default mongoose.model<IHoliday>("Holiday", HolidaySchema);
