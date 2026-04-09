import type { Request, Response } from 'express';
import Employee from '../model/Employee.js';
import Attendance from '../model/Attendance.js';
import Asset from '../model/Asset.js';
import Project from '../model/Project.js';
import Leave from '../model/Leave.js';
import Task from '../model/Task.js';
import Timesheet from '../model/Timesheet.js';

export const getUnifiedReports = async (req: Request, res: Response) => {
  try {
    const { tab = 'overview', dateRange = 'today', department = 'All' } = req.query;
    
    // Build common match conditions
    const matchConditions: any = { deletedAt: null };
    if (department !== 'All') matchConditions.department = department;
    
    // Dynamic date filtering for ALL tabs
    const now = new Date();
    let dateFilter = {};
    
    if (dateRange === 'today') {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateFilter = { $gte: today, $lt: tomorrow };
    } else if (dateRange === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      dateFilter = { $gte: weekStart, $lt: weekEnd };
    } else if (dateRange === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      dateFilter = { $gte: monthStart, $lte: monthEnd };
    }
    
    // Apply to relevant fields
    matchConditions.$or = [
      { createdAt: dateFilter },
      { updatedAt: dateFilter },
      { date: dateFilter }  // Attendance/Leave/Timesheet specific
    ];

    // Parallel stats aggregation for performance
    const [
      totalEmployees,
      attendanceStats,
      assetStats,
      projectStats,
      leaveStats,
      taskStats
    ] = await Promise.all([
      // Total active employees
      Employee.countDocuments({ status: 'active', deletedAt: null }),
      
      // Attendance stats (today by default)
      Attendance.aggregate([
        { $match: { 
          ...matchConditions,
          date: { $eq: new Date().toISOString().split('T')[0] }
        }},
        { $group: { 
          _id: '$status', 
          count: { $sum: 1 },
          employees: { $push: '$employee.name' }
        }}
      ]),

      // Asset stats
      Asset.aggregate([
        { $match: { deletedAt: null }},
        { $group: { 
          _id: '$status', 
          count: { $sum: 1 },
          totalValue: { $sum: '$purchaseValue' }
        }}
      ]),

      // Project stats
      Project.aggregate([
        { $match: matchConditions },
        { $group: { 
          _id: '$status', 
          count: { $sum: 1 },
          totalBudget: { $sum: '$budget' }
        }}
      ]),

      // Leave stats
      Leave.aggregate([
        { $match: matchConditions },
        { $group: { 
          _id: '$status', 
          count: { $sum: 1 }
        }}
      ]),

      // Task stats
      Task.aggregate([
        { $match: matchConditions },
        { $group: { 
          _id: '$status', 
          count: { $sum: 1 },
          completed: { 
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }}
      ])
    ]);

    // Transform stats to simple objects
    const todayAttendance = attendanceStats.reduce((acc: any, stat: any) => {
      acc[stat._id.toLowerCase()] = stat.count;
      return acc;
    }, { present: 0, absent: 0, late: 0 });

    const assetsByStatus = assetStats.reduce((acc: any, stat: any) => {
      acc[stat._id.toLowerCase()] = stat.count;
      return acc;
    }, { total: 0, available: 0, assigned: 0 });

    const projectsByStatus = projectStats.reduce((acc: any, stat: any) => {
      acc[stat._id.toLowerCase()] = stat.count;
      return acc;
    }, { ongoing: 0, completed: 0 });

    const leavesByStatus = leaveStats.reduce((acc: any, stat: any) => {
      acc[stat._id.toLowerCase()] = stat.count;
      return acc;
    }, { pending: 0, approved: 0 });

    const taskStatsObj = taskStats.reduce((acc: any, stat: any) => {
      acc[stat._id.toLowerCase()] = stat.count;
      return acc;
    }, { completed: 0, 'in progress': 0 });

    // Unified stats for cards
    const unifiedStats = {
      totalEmployees,
      presentToday: todayAttendance.present || 0,
      totalAssets: assetsByStatus.total || 0,
      activeProjects: projectsByStatus.ongoing || 0,
      pendingLeaves: leavesByStatus.pending || 0,
      tasksCompleted: taskStatsObj.completed || 0
    };

    // Tab-specific data (paginated)
    let tabData = [];
    if (tab === 'attendance') {
      tabData = await Attendance.find(matchConditions)
        .populate('employee', 'name department designation')
        .limit(10)
        .sort({ createdAt: -1 });
    } else if (tab === 'projects') {
      tabData = await Project.find(matchConditions)
        .populate('assignedEmployees', 'name')
        .limit(10)
        .sort({ createdAt: -1 });
    } else if (tab === 'leaves') {
      tabData = await Leave.find(matchConditions)
        .populate('employee', 'name')
        .limit(10)
        .sort({ createdAt: -1 });
    } else if (tab === 'tasks') {
      tabData = await Task.find(matchConditions)
        .populate('assignee', 'name')
        .limit(10)
        .sort({ createdAt: -1 });
    }

    // Transform for charts
    let chartData = [];
    if (tab === 'attendance') {
      const statusStats = tabData.reduce((acc, record) => {
        const status = record.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      chartData = Object.entries(statusStats).map(([name, value]) => ({ name, value: Number(value) }));
    } else if (tab === 'tasks') {
      const statusStats = tabData.reduce((acc, record) => {
        const status = record.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      chartData = Object.entries(statusStats).map(([name, value]) => ({ name, value: Number(value) }));
    }
    
    res.json({
      success: true,
      stats: unifiedStats,
      data: tabData,
      chartData,
      filters: { tab, dateRange, department },
      totalRecords: tabData.length
    });

  } catch (error: any) {
    console.error('Reports aggregation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate reports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

