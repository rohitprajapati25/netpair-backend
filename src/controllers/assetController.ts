import { Request, Response } from "express";
import mongoose from "mongoose";
import Joi from "joi";
import Asset, { IAsset, ASSET_CATEGORY, ASSET_STATUS } from "../model/Asset.js";
import Employee from "../model/Employee.js";

const generateAssetId = async (): Promise<string> => {
  // Find max existing seq and increment
  const maxAsset = await Asset.findOne({ assetId: { $regex: /^AST-\d{3}$/ } })
    .sort({ assetId: -1 })
    .select('assetId');
    
  let nextSeq = 1;
  if (maxAsset && maxAsset.assetId) {
    const match = (maxAsset.assetId as string).match(/AST-(\d{3})/);
    if (match && match[1]) nextSeq = parseInt(match[1]) + 1;
  }
  
  return `AST-${String(nextSeq).padStart(3, '0')}`;
};



export const getAssets = async (req: Request, res: Response) => {
  try {
    const { search, category, status, assignedTo, page = 1, limit = 20 } = req.query;
    const query: any = { deletedAt: null };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assetId: { $regex: search, $options: 'i' } }
      ];
    }
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAsset = async (req: Request, res: Response) => {
  try {
    const { name, category, serialNumber, purchaseDate, assignedTo, status, location, notes } = req.body;
    const user = (req as any).user;

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
        message: validationError.details[0]?.message || 'Validation error'
      });
    }

    const assetId = await generateAssetId();

    const assetData: Partial<IAsset> = {
      assetId,
      name: (name as string).trim(),
      category,
      serialNumber: (serialNumber as string)?.trim() || undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate as string) : undefined,
      assignedTo: (assignedTo as string)?.trim() ? new mongoose.Types.ObjectId((assignedTo as string).trim()) : undefined,
      status: (status as any) || 'Available',
      location: (location as string)?.trim() || undefined,
      notes: (notes as string)?.trim() || undefined,
      createdBy: new mongoose.Types.ObjectId(user?.id ? String(user.id) : undefined)
    };

    // Validate assignedTo if provided
    if ((assignedTo as string)?.trim()) {
      const employee = await Employee.findById((assignedTo as string).trim());
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
  } catch (error: any) {
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

export const updateAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res.status(400).json({ success: false, message: 'Invalid asset ID' });
    }
    const updates = req.body;
    const user = (req as any).user;

    // Validate assignedTo if changing
    if ((updates.assignedTo as string)?.trim()) {
      const employee = await Employee.findById((updates.assignedTo as string).trim());
      if (!employee) return res.status(400).json({ success: false, message: 'Employee not found' });
    }

    const updated = await Asset.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        ...updates,
        updatedBy: new mongoose.Types.ObjectId(user.id as string)
      },
      { new: true, runValidators: true }
    ).populate('assignedTo createdBy updatedBy', 'name designation department');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Asset not found' });
    }

    res.json({
      success: true,
      message: 'Asset updated successfully',
      asset: updated
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      return res.status(400).json({ success: false, message: 'Invalid asset ID' });
    }
    await Asset.findByIdAndUpdate(id, { deletedAt: new Date() });
    res.json({ success: true, message: 'Asset soft deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAssetStats = async (req: Request, res: Response) => {
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

    stats.forEach((stat: any) => {
      (result as any)[stat._id.toLowerCase()] = stat.count;
    });

    res.json({ success: true, stats: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

