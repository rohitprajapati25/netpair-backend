import mongoose, { Document } from "mongoose";

export interface IEmployee extends Document {
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  joiningDate: Date;
  status: "active" | "inactive";
  createdBy: mongoose.Types.ObjectId;
}

const employeeSchema = new mongoose.Schema<IEmployee>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  department: { type: String, required: true },
  position: { type: String, required: true },
  joiningDate: { type: Date, required: true, default: Date.now },
  status: { 
    type: String, 
    enum: ["active", "inactive"], 
    default: "active" 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  }
}, { timestamps: true });

export default mongoose.model<IEmployee>("Employee", employeeSchema);


