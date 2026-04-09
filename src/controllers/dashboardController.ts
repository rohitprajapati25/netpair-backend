import type { Request, Response } from 'express';
import Employee from '../model/Employee.js';
import Attendance from '../model/Attendance.js';
import Task from '../model/Task.js';
import Timesheet from '../model/Timesheet.js';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [totalEmployees, presentToday, activeTasks, pendingTimesheets] = await Promise.all([
      Employee.countDocuments({ status: 'active', deletedAt: null }),
      Attendance.countDocuments({ 
        date: today, 
        status: 'Present',
        deletedAt: null 
      }),
      Task.countDocuments({ status: { $in: ['In Progress', 'Active'] }, deletedAt: null }),
      Timesheet.countDocuments({ 
        status: 'Submitted',
        deletedAt: null 
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalEmployees,
        presentToday,
        activeTasks,
        pendingTimesheets
      }
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Stats fetch failed' });
  }
};

export const getDashboardActivity = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const recentActivities = await Promise.all([
      Attendance.find({ 
        createdAt: { $gte: today },
        deletedAt: null 
      }).populate('employee', 'name').limit(10).sort({ createdAt: -1 }),
      Task.find({ 
        createdAt: { $gte: today },
        deletedAt: null 
      }).populate('assignee', 'name').limit(5).sort({ createdAt: -1 })
    ]);

    const activity = [
      ...recentActivities[0].map(att => ({
        type: 'attendance',
        action: `${att.employee.name} marked ${att.status}`,
        time: att.createdAt,
        icon: 'ri-calendar-check-line'
      })),
      ...recentActivities[1].map(task => ({
        type: 'task',
        action: `New task "${task.title}" assigned`,
        time: task.createdAt,
        icon: 'ri-task-line'
      }))
    ].slice(0, 10).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({
      success: true,
      activity
    });
  } catch (error: any) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ success: false, message: 'Activity fetch failed' });
  }
};

