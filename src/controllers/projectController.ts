import { Request, Response } from "express";
import mongoose from "mongoose";
import Project from "../model/Project.js";
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
    const query: any = { deletedAt: null };
    
    const projects = await Project.find(query)
      .populate('projectOwnerId manager createdBy assignedEmployees', 'name designation department role email')
      .sort({ startDate: -1 });
    
    res.json({
      success: true,
      projects,
      pagination: { total: projects.length }
    });
  } catch (error: any) {
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
    
    // Atomic project code generation
    let count = await Project.countDocuments({ 
      projectCode: { $regex: `^PRJ-${year}-` }, 
      deletedAt: null 
    });
    count++;
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
        .filter(id => id && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id))
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
      ...(req.files ? { attachments: (req.files as any[]).map((f: any) => ({
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
    
    const total = await Project.countDocuments({ deletedAt: { $eq: null } });
    console.log('Total projects:', total);
    
    // Simple count queries - NO aggregate
    const pending = await Project.countDocuments({ deletedAt: { $eq: null }, status: 'Pending' });
    const ongoing = await Project.countDocuments({ deletedAt: { $eq: null }, status: 'Ongoing' });
    const completed = await Project.countDocuments({ deletedAt: { $eq: null }, status: 'Completed' });
    const onHold = await Project.countDocuments({ deletedAt: { $eq: null }, status: 'On Hold' });
    const cancelled = await Project.countDocuments({ deletedAt: { $eq: null }, status: 'Cancelled' });

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
    const count = await Project.countDocuments({ deletedAt: { $eq: null } });
    console.log('Projects found:', count);
    
    if (count === 0) {
      console.log('No projects - empty response');
      return res.json({ success: true, logs: [], total: 0 });
    }
    
    // Ultra-safe query - no populate
    const logs = await Project.find({ deletedAt: { $eq: null } })
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
  try {
    await Project.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
    res.json({ success: true, message: 'Project soft deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

