import mongoose, { Schema } from "mongoose";
const HolidaySchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    date: { type: Date, required: true },
    type: { type: String, enum: ["national", "optional", "restricted", "company"], default: "national" },
    description: { type: String, trim: true, maxlength: 500 },
    isRecurring: { type: Boolean, default: true },
    createdBy: {
        id: { type: Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        role: { type: String, required: true },
    },
}, { timestamps: true, versionKey: false });
HolidaySchema.index({ date: 1 });
export default mongoose.model("Holiday", HolidaySchema);
//# sourceMappingURL=Holiday.js.map