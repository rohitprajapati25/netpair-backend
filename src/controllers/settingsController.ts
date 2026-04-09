import { Request, Response } from 'express';
import User from '../model/User.js';
import Employee from '../model/Employee.js';
import bcrypt from 'bcrypt';

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, phone } = req.body;
    const userId = (req as any).user.id;

    // Multi-model update
    let updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { name, phone } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      updatedUser = await Employee.findByIdAndUpdate(
        userId,
        { $set: { name, phone } },
        { new: true }
      ).select('-password');
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user.id;

    let user = await User.findById(userId).select('+password');
    if (!user) user = await Employee.findById(userId).select('+password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(userId, { password: hashedPassword });
    await Employee.findByIdAndUpdate(userId, { password: hashedPassword }, { upsert: true });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    let user = await User.findById(userId).select('-password');
    if (!user) user = await Employee.findById(userId).select('-password');

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

