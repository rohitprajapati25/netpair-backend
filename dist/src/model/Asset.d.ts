import mongoose, { Document } from "mongoose";
export declare enum ASSET_STATUS {
    AVAILABLE = "Available",
    ASSIGNED = "Assigned",
    DAMAGED = "Damaged",
    DISPOSED = "Disposed"
}
export declare enum ASSET_CATEGORY {
    IT_ASSET = "IT Asset",
    FURNITURE = "Furniture",
    ELECTRONICS = "Electronics",
    OFFICE_SUPPLIES = "Office Supplies"
}
export interface IAsset extends Document {
    assetId: string;
    name: string;
    category: ASSET_CATEGORY;
    serialNumber?: string;
    purchaseDate?: Date;
    assignedTo?: mongoose.Types.ObjectId;
    status: ASSET_STATUS;
    location?: string;
    notes?: string;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    deletedAt?: Date;
}
declare const _default: mongoose.Model<IAsset, {}, {}, {}, mongoose.Document<unknown, {}, IAsset, {}, mongoose.DefaultSchemaOptions> & IAsset & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAsset>;
export default _default;
//# sourceMappingURL=Asset.d.ts.map