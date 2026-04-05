import mongoose, { Document, Schema } from "mongoose";

export enum ASSET_STATUS {
  AVAILABLE = "Available",
  ASSIGNED = "Assigned",
  DAMAGED = "Damaged",
  DISPOSED = "Disposed"
}

export enum ASSET_CATEGORY {
  IT_ASSET = "IT Asset",
  FURNITURE = "Furniture",
  ELECTRONICS = "Electronics",
  OFFICE_SUPPLIES = "Office Supplies"
}

export interface IAsset extends Document {
  assetId: string; // AST-001
  name: string;
  category: ASSET_CATEGORY;
  serialNumber?: string;
  purchaseDate?: Date;
  assignedTo?: mongoose.Types.ObjectId; // Employee ref
  status: ASSET_STATUS;
  location?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  deletedAt?: Date;
}

const assetSchema = new Schema<IAsset>({
  assetId: {
    type: String,
    required: [true, "Asset ID required"],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, "Asset name required"],
    trim: true,
    maxlength: [100, "Name too long"]
  },
  category: {
    type: String,
    enum: Object.values(ASSET_CATEGORY),
    required: true
  },
  serialNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  purchaseDate: Date,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    index: true
  },
  status: {
    type: String,
    enum: Object.values(ASSET_STATUS),
    default: ASSET_STATUS.AVAILABLE
  },
  location: {
    type: String,
    maxlength: [100]
  },
  notes: {
    type: String,
    maxlength: [1000]
  },
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

assetSchema.index({ category: 1, status: 1 });


(assetSchema.query as any).notDeleted = function() {
  return this.where({ deletedAt: null });
};

export default mongoose.model<IAsset>("Asset", assetSchema);

