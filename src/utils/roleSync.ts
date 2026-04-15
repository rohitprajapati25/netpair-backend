import mongoose, { Types } from 'mongoose';
import Employee from '../model/Employee.js';
import HR from '../model/HR.js';
import Admin from '../model/Admin.js';
import User from '../model/User.js';
import { ROLES } from '../constants/roles.js';

type RoleType = 'employee' | 'hr' | 'admin';
type RoleModels = {
  [K in RoleType]: mongoose.Model<any>;
};

const RoleModels: RoleModels = {
  employee: Employee,
  hr: HR,
  admin: Admin
};

/**
 * Update Role + User collections atomically
 * @param roleDocId - Role document ID (same as User ID)
 * @param updateData - Fields to sync (name, status, department, etc.)
 * @param role - 'employee' | 'hr' | 'admin'
 */
export const syncRoleUserUpdate = async (roleDocId: Types.ObjectId, updateData: any, role: RoleType) => {
  const RoleModel = RoleModels[role];
  if (!RoleModel) throw new Error(`Invalid role: ${role}`);

  // 1. Update Role Collection
  const roleDoc = await RoleModel.findByIdAndUpdate(
    roleDocId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-password');

  if (!roleDoc) throw new Error('Role document not found');

  // 2. Sync User Collection (same ID)
  const userDoc = await User.findByIdAndUpdate(
    roleDocId,
    { $set: updateData },
    { new: true }
  ).select('-password');

  return {
    roleDoc,
    userDoc,
    synced: true
  };
};

/**
 * Soft delete Role + User collections
 */
export const syncRoleUserDelete = async (roleDocId: Types.ObjectId, role: RoleType) => {
  const RoleModel = RoleModels[role];
  if (!RoleModel) throw new Error(`Invalid role: ${role}`);

  // 1. Soft delete Role Collection
  const roleDoc = await RoleModel.findByIdAndUpdate(
    roleDocId,
    { 
      $set: { 
        status: 'inactive', 
        deletedAt: new Date() 
      } 
    },
    { new: true }
  );

  if (!roleDoc) throw new Error('Role document not found');

  // 2. Sync User Collection
  await User.findByIdAndUpdate(
    roleDocId,
    { 
      $set: { 
        status: 'inactive', 
        deletedAt: new Date() 
      } 
    }
  );

  return {
    roleDocId,
    role,
    softDeleted: true
  };
};

export const syncRoleUserStatus = async (roleDocId: Types.ObjectId, newStatus: string, role: RoleType) => {
  const RoleModel = RoleModels[role];
  if (!RoleModel) throw new Error(`Invalid role: ${role}`);

  // Update Role status
  await RoleModel.findByIdAndUpdate(roleDocId, { $set: { status: newStatus } });
  
  // Sync User status
  await User.findByIdAndUpdate(roleDocId, { $set: { status: newStatus } });

  return { synced: true, status: newStatus };
};

export const getLinkedUserByRoleId = async (roleDocId: Types.ObjectId, role: RoleType) => {
  const user = await User.findById(roleDocId).select('-password');
  return user;
};
