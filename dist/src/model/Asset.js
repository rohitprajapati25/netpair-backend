import mongoose, { Schema } from "mongoose";
export var ASSET_STATUS;
(function (ASSET_STATUS) {
    ASSET_STATUS["AVAILABLE"] = "Available";
    ASSET_STATUS["ASSIGNED"] = "Assigned";
    ASSET_STATUS["DAMAGED"] = "Damaged";
    ASSET_STATUS["DISPOSED"] = "Disposed";
})(ASSET_STATUS || (ASSET_STATUS = {}));
export var ASSET_CATEGORY;
(function (ASSET_CATEGORY) {
    ASSET_CATEGORY["IT_ASSET"] = "IT Asset";
    ASSET_CATEGORY["FURNITURE"] = "Furniture";
    ASSET_CATEGORY["ELECTRONICS"] = "Electronics";
    ASSET_CATEGORY["OFFICE_SUPPLIES"] = "Office Supplies";
})(ASSET_CATEGORY || (ASSET_CATEGORY = {}));
const assetSchema = new Schema({
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
        required: [true, 'Category is required']
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
assetSchema.query.notDeleted = function () {
    return this.where({ deletedAt: null });
};
export default mongoose.model("Asset", assetSchema);
//# sourceMappingURL=Asset.js.map