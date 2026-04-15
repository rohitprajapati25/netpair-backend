import mongoose from "mongoose";
import Joi from "joi";
import Asset, { ASSET_CATEGORY, ASSET_STATUS } from "../model/Asset.js";
import Employee from "../model/Employee.js";
const generateAssetId = async () => {
    // Find max existing seq and increment
    const maxAsset = await Asset.findOne({ assetId: { $regex: /^AST-\d{3}$/ } })
        .sort({ assetId: -1 })
        .select('assetId');
    let nextSeq = 1;
    if (maxAsset) {
        const match = maxAsset.assetId.match(/AST-(\d{3})/);
        if (match)
            nextSeq = parseInt(match[1]) + 1;
    }
    return `AST-${String(nextSeq).padStart(3, '0')}`;
};
export const getAssets = async (req, res) => {
    try {
        const { search, category, status, assignedTo, page = 1, limit = 20 } = req.query;
        const query = { deletedAt: null };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { assetId: { $regex: search, $options: 'i' } }
            ];
        }
        if (category && category !== 'All')
            query.category = category;
        if (status && status !== 'All')
            query.status = status;
        if (assignedTo)
            query.assignedTo = assignedTo;
        const assets = await Asset.find(query)
            .populate('assignedTo', 'name designation department')
            .populate('createdBy updatedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Asset.countDocuments(query);
        res.json({
            success: true,
            assets,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const createAsset = async (req, res) => {
    try {
        const { name, category, serialNumber, purchaseDate, assignedTo, status, location, notes } = req.body;
        const user = req.user;
        const schema = Joi.object({
            name: Joi.string().trim().min(1).max(100).required(),
            category: Joi.string().allow(...Object.values(ASSET_CATEGORY)).required(),
            status: Joi.string().allow(...Object.values(ASSET_STATUS)).required(),
            serialNumber: Joi.string().trim().max(50).allow(""),
            purchaseDate: Joi.date().max(Date.now()).allow(null),
            assignedTo: Joi.string().allow('').allow(null),
            location: Joi.string().trim().max(100).allow(""),
            notes: Joi.string().trim().max(1000).allow("")
        });
        const { error: validationError } = schema.validate(req.body);
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError.details[0].message
            });
        }
        const assetId = await generateAssetId();
        const assetData = {
            assetId,
            name: name.trim(),
            category,
            serialNumber: serialNumber?.trim() || undefined,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
            assignedTo: assignedTo?.trim() ? new mongoose.Types.ObjectId(assignedTo.trim()) : undefined,
            status: status || 'Available',
            location: location?.trim() || undefined,
            notes: notes?.trim() || undefined,
            createdBy: new mongoose.Types.ObjectId(user.id)
        };
        // Validate assignedTo if provided
        if (assignedTo?.trim()) {
            const employee = await Employee.findById(assignedTo.trim());
            if (!employee) {
                return res.status(400).json({ success: false, message: 'Employee not found' });
            }
        }
        const asset = await Asset.create(assetData);
        const populated = await Asset.findById(asset._id)
            .populate('assignedTo createdBy', 'name designation department');
        res.status(201).json({
            success: true,
            message: 'Asset created successfully',
            asset: populated
        });
    }
    catch (error) {
        console.error('Create asset error:', error);
        if (error.code === 11000 || error.code === 11001) {
            return res.status(409).json({
                success: false,
                message: 'Asset ID conflict detected. Please try again.'
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};
export const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid asset ID' });
        }
        const updates = req.body;
        const user = req.user;
        // Validate assignedTo if changing
        if (updates.assignedTo?.trim()) {
            const employee = await Employee.findById(updates.assignedTo.trim());
            if (!employee)
                return res.status(400).json({ success: false, message: 'Employee not found' });
        }
        const updated = await Asset.findOneAndUpdate({ _id: id, deletedAt: null }, {
            ...updates,
            updatedBy: new mongoose.Types.ObjectId(user.id)
        }, { new: true, runValidators: true }).populate('assignedTo createdBy updatedBy', 'name designation department');
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Asset not found' });
        }
        res.json({
            success: true,
            message: 'Asset updated successfully',
            asset: updated
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid asset ID' });
        }
        await Asset.findByIdAndUpdate(id, { deletedAt: new Date() });
        res.json({ success: true, message: 'Asset soft deleted' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
export const getAssetStats = async (req, res) => {
    try {
        const stats = await Asset.aggregate([
            { $match: { deletedAt: null } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        const result = {
            total: await Asset.countDocuments({ deletedAt: null }),
            available: 0,
            assigned: 0,
            damaged: 0,
            disposed: 0
        };
        stats.forEach((stat) => {
            result[stat._id.toLowerCase()] = stat.count;
        });
        res.json({ success: true, stats: result });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
//# sourceMappingURL=assetController.js.map