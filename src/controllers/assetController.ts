import { Request, Response } from "express";
import mongoose from "mongoose";
import Asset, { IAsset } from "../model/Asset.js";
import Employee from "../model/Employee.js";

const generateAssetId = async (): Promise<string> => {
  const count = await Asset.countDocuments({ deletedAt: null });
  return `AST-${String(count + 1).padStart(3, '0')}`;
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

    const assetId = await generateAssetId();

    const assetData: Partial<IAsset> = {
      assetId,
      name: name.trim(),
      category,
      serialNumber: serialNumber?.trim() || undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined,
      status: status as any || 'Available',
      location: location?.trim() || undefined,
      notes: notes?.trim() || undefined,
      createdBy: new mongoose.Types.ObjectId(user.id)
    };

    // Validate assignedTo if provided
    if (assignedTo) {
      const employee = await Employee.findById(assignedTo);
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
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const user = (req as any).user;

    // Validate assignedTo if changing
    if (updates.assignedTo) {
      const employee = await Employee.findById(updates.assignedTo);
      if (!employee) return res.status(400).json({ success: false, message: 'Employee not found' });
    }

    const updated = await Asset.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        ...updates,
        updatedBy: new mongoose.Types.ObjectId(user.id)
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

