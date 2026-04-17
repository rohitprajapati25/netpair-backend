import { Request, Response } from 'express';
import User from '../model/User.js';
import Employee from '../model/Employee.js';
import bcrypt from 'bcrypt';

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { name, phone, designation, department } = req.body;
    const userId = (req as any).user.id;
    const role   = (req as any).user.role;

    const updateFields: any = {};
    if (name)        updateFields.name        = name;
    if (phone)       updateFields.phone       = phone;
    if (designation) updateFields.designation = designation;
    if (department)  updateFields.department  = department;

    // Always update User collection (auth record)
    let updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    // Also sync role-specific collection
    if (!updatedUser) {
      // Superadmin lives only in User — if not found try Employee
      updatedUser = await Employee.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true }
      ).select('-password');
    } else {
      // Sync role collection by email
      if (role === 'employee') {
        await Employee.findOneAndUpdate(
          { email: updatedUser.email },
          { $set: updateFields }
        );
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedUser,
      user: updatedUser,
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

    // Search all models — User first (covers superadmin/admin/hr/employee)
    let user: any = await User.findById(userId).select('-password');
    if (!user) user = await Employee.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.json({ success: true, profile: user, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

