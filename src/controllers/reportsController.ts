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
    
    const match: any = { deletedAt: null };
    if (department !== 'All') match.department = department;
    
    // Dynamic date filter
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
    
    match.$or = [
      { createdAt: dateFilter },
      { updatedAt: dateFilter },
      { date: dateFilter }
    ];

    // Safe stats with allSettled
    const statsResults = await Promise.allSettled([
      Employee.countDocuments({ status: 'active' }),
      Attendance.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Asset.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Project.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Leave.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Timesheet.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }])
    ]);

    const unifiedStats = {
      totalEmployees: (statsResults[0] as any).status === 'fulfilled' ? (statsResults[0] as any).value : 0,
statsResults[1].status === 'fulfilled' ? (statsResults[1].value as any[]).find((s: any) => s._id?.toLowerCase() === 'present')?.count || 0 : 0
      totalAssets: (statsResults[2] as any[]).reduce((sum: number, s: any) => sum + (s.count || 0), 0),
statsResults[3].status === 'fulfilled' ? (statsResults[3].value as any[]).find((s: any) => s._id?.toLowerCase() === 'ongoing')?.count || 0 : 0,
      pendingLeaves: (statsResults[4] as any[]).find((s: any) => s._id?.toLowerCase() === 'pending')?.count || 0,
      tasksCompleted: (statsResults[5] as any[]).find((s: any) => s._id?.toLowerCase() === 'completed')?.count || 0,
      timesheetsPending: (statsResults[6] as any[]).find((s: any) => s._id?.toLowerCase() === 'pending')?.count || 0
    };

    // Tab data + full count (no populate)
    let data: any[] = [];
    let totalCount = 0;
    const limit = 50;
    try {
      if (tab === 'attendance') {
        data = await Attendance.find(match).sort({ date: -1 }).limit(limit).lean();
        totalCount = await Attendance.countDocuments(match);
      } else if (tab === 'projects') {
        data = await Project.find(match).sort({ createdAt: -1 }).limit(limit).lean();
        totalCount = await Project.countDocuments(match);
      } else if (tab === 'leaves') {
        data = await Leave.find(match).sort({ createdAt: -1 }).limit(limit).lean();
        totalCount = await Leave.countDocuments(match);
      } else if (tab === 'tasks') {
        data = await Task.find(match).sort({ createdAt: -1 }).limit(limit).lean();
        totalCount = await Task.countDocuments(match);
      } else if (tab === 'timesheet') {
        data = await Timesheet.find(match).sort({ createdAt: -1 }).limit(limit).lean();
        totalCount = await Timesheet.countDocuments(match);
      }
    } catch (e) {
      console.error('Tab data error:', e);
    }

    // Chart data for frontend
    const chartData = data.reduce((acc: any, record: any) => {
      const status = record.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const transformedChartData = Object.entries(chartData).map(([name, value]) => ({ name, value: Number(value) }));

    res.json({
      success: true,
      data,
      stats: unifiedStats,
      totalRecords: totalCount,
      chartData: transformedChartData,
      filters: { tab, dateRange, department }
    });

  } catch (error: any) {
    console.error('Reports error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

