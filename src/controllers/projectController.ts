import { Request, Response } from "express";
import mongoose from "mongoose";
import Project from "../model/Project.js";
import Task from "../model/Task.js";
import Timesheet from "../model/Timesheet.js";
import Employee from "../model/Employee.js";

const sanitizeObjectId = (value: any): mongoose.Types.ObjectId | undefined => {
  if (!value || value === '' || value === 'null' || value === null || value === undefined) {
    return undefined;
  }
  try {
    return new mongoose.Types.ObjectId(value);
  } catch {
    return undefined;
  }
};

export const getProjects = async (req: Request, res: Response) => {
  try {
    console.log('📋 GET PROJECTS - Request received, user:', (req as any).user);
    const query: any = { deletedAt: null };
    
    // Handle filters from query params
    const { search, status, priority, project_type, department, createdBy, page = 1, limit = 1000 } = req.query;
    
    if (search && search.toString().trim()) {
      query.name = { $regex: search.toString().trim(), $options: 'i' };
    }
    
    if (status && status !== 'All') {
      query.status = status;
    }
    
    if (priority && priority !== 'All') {
      query.priority = priority;
    }
    
    if (project_type && project_type !== 'All') {
      query.project_type = project_type;
    }
    
    if (department && department.toString().trim()) {
      query.company = { $regex: department.toString().trim(), $options: 'i' };
    }
    
    if (createdBy && createdBy !== 'All') {
      query.createdBy = createdBy;
    }
    
    console.log('📋 Query filters:', query);
    
    const projects = await Project.find(query)
      .populate('projectOwnerId manager createdBy assignedEmployees', 'name designation department role email')
      .sort({ startDate: -1 })
      .limit(parseInt(limit.toString()))
      .skip((parseInt(page.toString()) - 1) * parseInt(limit.toString()));
    
    console.log('📋 Found projects:', projects.length);
    console.log('📋 First project sample:', projects[0] ? { name: projects[0].name, _id: projects[0]._id } : 'No projects');
    
    res.json({
      success: true,
      projects,
      pagination: { total: projects.length, page: parseInt(page.toString()), limit: parseInt(limit.toString()) }
    });
  } catch (error: any) {
    console.error('❌ Get projects error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const createProject = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const year = new Date().getFullYear();
    
    // Safe project code generation - find the highest number used
    const lastProject = await Project.findOne({ 
      projectCode: { $regex: `^PRJ-${year}-` } 
    }).sort({ projectCode: -1 });
    
    let count = 1;
    if (lastProject) {
      const parts = lastProject.projectCode.split('-');
      const lastNum = parts.length >= 3 ? parseInt(parts[2] || '0') : 0;
      count = lastNum + 1;
    }
    let projectCode = `PRJ-${year}-${String(count).padStart(4, '0000')}`;
    
    // Backup loop
    let attempts = 0;
    while (await Project.countDocuments({ projectCode, deletedAt: null }) > 0 && attempts < 10) {
      count++;
      projectCode = `PRJ-${year}-${String(count).padStart(4, '0000')}`;
      attempts++;
    }

const bodyData = req.body;
    // Ultra-safe assignedEmployees parsing - fix CastError
    let assignedEmployeesFinal: mongoose.Types.ObjectId[] = [];
    const assignedRaw = bodyData.assignedEmployees;
    
    if (assignedRaw) {
      let parsedIds = [];
      
      if (typeof assignedRaw === 'string') {
        try {
          let cleanStr = assignedRaw.trim();
          if (cleanStr === '[]' || cleanStr === '' || cleanStr === '[\"\"]') {
            parsedIds = [];
          } else if (cleanStr.startsWith('[') && cleanStr.endsWith(']')) {
            parsedIds = JSON.parse(cleanStr);
          } else {
            parsedIds = JSON.parse(cleanStr.replace(/^"|"$/g, ''));
          }
        } catch (parseErr) {
          console.error('assignedEmployees parse error:', parseErr, assignedRaw);
          parsedIds = [];
        }
      } else if (Array.isArray(assignedRaw)) {
        parsedIds = assignedRaw;
      }
      
      // Filter + sanitize valid ObjectIds only
      assignedEmployeesFinal = parsedIds
        .filter((id: any) => id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
        .map((id: any) => new mongoose.Types.ObjectId(id))
        .slice(0, 100); // Sanity limit
      
      console.log('Parsed assignedEmployees:', assignedEmployeesFinal.length);
    }

    const projectData = {
      ...bodyData,
      assignedEmployees: assignedEmployeesFinal,
      projectOwnerId: sanitizeObjectId(bodyData.projectOwnerId),
      manager: sanitizeObjectId(bodyData.manager),
      projectCode,
      createdBy: user.id,
      ...( (req as any).files ? { attachments: ((req as any).files as any[]).map((f: any) => ({
        filename: f.originalname,
        path: f.path
      })) } : {})
    };

    const project = await Project.create(projectData);
    
    const populated = await Project.findById(project._id)
      .populate('projectOwnerId manager createdBy', 'name designation department');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: populated
    });
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getProjectStats = async (req: Request, res: Response) => {
  try {
    console.log('🟢 📈 getProjectStats HIT');
    
    // Build query with same filters as getProjects
    const query: any = { deletedAt: null };
    const { search, status, priority, project_type, department, createdBy } = req.query;
    
    if (search && search.toString().trim()) {
      query.name = { $regex: search.toString().trim(), $options: 'i' };
    }
    
    if (status && status !== 'All') {
      query.status = status;
    }
    
    if (priority && priority !== 'All') {
      query.priority = priority;
    }
    
    if (project_type && project_type !== 'All') {
      query.project_type = project_type;
    }
    
    if (department && department.toString().trim()) {
      query.company = { $regex: department.toString().trim(), $options: 'i' };
    }
    
    if (createdBy && createdBy !== 'All') {
      query.createdBy = createdBy;
    }
    
    console.log('Stats query:', query);
    
    const total = await Project.countDocuments(query);
    console.log('Total projects:', total);
    
    // Simple count queries - NO aggregate
    const pending = await Project.countDocuments({ ...query, status: 'Pending' });
    const ongoing = await Project.countDocuments({ ...query, status: 'Ongoing' });
    const completed = await Project.countDocuments({ ...query, status: 'Completed' });
    const onHold = await Project.countDocuments({ ...query, status: 'On Hold' });
    const cancelled = await Project.countDocuments({ ...query, status: 'Cancelled' });

    const stats = {
      total,
      pending,
      ongoing,
      completed,
      onHold,
      cancelled
    };

    console.log('🟢 Stats SUCCESS:', stats);
    res.json({ success: true, stats });
    
  } catch (error: any) {
    console.error('💥 getProjectStats ERROR:', error);
    res.json({ 
      success: true, 
      stats: { total: 0, pending: 0, ongoing: 0, completed: 0, onHold: 0, cancelled: 0 }
    });
  }
};

export const getProjectLogs = async (req: Request, res: Response) => {
  try {
    console.log('🟢 🔍 getProjectLogs HIT - superadmin');
    
    // Raw count first
    const count = await Project.countDocuments({ deletedAt: null });
    console.log('Projects found:', count);
    
    if (count === 0) {
      console.log('No projects - empty response');
      return res.json({ success: true, logs: [], total: 0 });
    }
    
    // Ultra-safe query - no populate
    const logs = await Project.find({ deletedAt: null })
      .select('name projectCode status progress createdBy updatedBy createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
    
    // Transform with safe refs
    const transformedLogs = logs.map(log => ({
      ...log,
      createdByUser: log.createdBy ? { id: log.createdBy, name: 'User', role: 'unknown' } : null,
      updatedByUser: log.updatedBy ? { id: log.updatedBy, name: 'User', role: 'unknown' } : null,
    }));
    
    console.log('🟢 Logs SUCCESS:', logs.length);
    res.json({ success: true, logs: transformedLogs, total: count });
  } catch (error: any) {
    console.error('💥 getProjectLogs ERROR:', error);
    res.status(500).json({ success: false, message: 'Logs temporarily unavailable' });
  }
};

export const updateProject = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const updates = req.body;
    
    // Ultra-safe assignedEmployees for UPDATE too
    let assignedEmployeesFinal: mongoose.Types.ObjectId[] = [];
    const assignedRaw = updates.assignedEmployees;
    
    if (assignedRaw) {
      let parsedIds: string[] = [];
      if (typeof assignedRaw === 'string') {
        try {
          let cleanStr = assignedRaw.trim();
          if (cleanStr === '[]' || cleanStr === '' || cleanStr === '[\"\"]') {
            parsedIds = [];
          } else if (cleanStr.startsWith('[') && cleanStr.endsWith(']')) {
            parsedIds = JSON.parse(cleanStr);
          }
        } catch (parseErr) {
          console.error('Update assignedEmployees parse:', parseErr);
        }
      } else if (Array.isArray(assignedRaw)) {
        parsedIds = assignedRaw;
      }
      
      // Same validation
      assignedEmployeesFinal = parsedIds
        .filter(id => id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id))
        .slice(0, 100);
    }
    
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { 
        ...updates, 
        assignedEmployees: assignedEmployeesFinal,
        updatedBy: user.id 
      },
      { new: true, runValidators: true }
    );
    
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    res.json({ success: true, project });
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProject = async (req: Request, res: Response) => {
  console.log('🗑️ DELETE PROJECT - Request received for ID:', req.params.id);
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const projectId = req.params.id;
    console.log('🔍 Looking for project:', projectId);
    
    // Validate project exists and not already deleted
    const project = await Project.findOne({ _id: projectId, deletedAt: null }).session(session);
    console.log('📋 Project found:', project ? project.name : 'NOT FOUND');
    
    if (!project) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found or already deleted' 
      });
    }

    // Cascade soft delete Tasks
    console.log('🗂️ Deleting associated tasks...');
    const taskResult = await Task.updateMany(
      { project_id: projectId, deletedAt: null }, 
      { deletedAt: new Date() },
      { session }
    );
    console.log('✅ Tasks deleted:', taskResult.modifiedCount);

    // Cascade soft delete Timesheets  
    console.log('⏰ Deleting associated timesheets...');
    const timesheetResult = await Timesheet.updateMany(
      { project_id: projectId, deletedAt: null },
      { deletedAt: new Date() },
      { session }
    );
    console.log('✅ Timesheets deleted:', timesheetResult.modifiedCount);

    // Soft delete Project
    console.log('📁 Deleting project...');
    const projectResult = await Project.findByIdAndUpdate(
      projectId, 
      { deletedAt: new Date() },
      { session, new: true }
    );
    console.log('✅ Project deleted:', projectResult ? 'SUCCESS' : 'FAILED');

    await session.commitTransaction();
    session.endSession();

    // Count affected records for accurate message
    const taskCount = await Task.countDocuments({ project_id: projectId, deletedAt: new Date(new Date().getTime() - 60000) }); // Recent deletes
    const timesheetCount = await Timesheet.countDocuments({ project_id: projectId, deletedAt: new Date(new Date().getTime() - 60000) });
    
    res.json({ 
      success: true, 
      message: `Project "${project.name}" and ${taskCount} tasks/${timesheetCount} timesheets soft deleted successfully`,
      deleted: { project: 1, tasks: taskCount, timesheets: timesheetCount }
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Delete project error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Delete failed: ' + error.message 
    });
  }
};

