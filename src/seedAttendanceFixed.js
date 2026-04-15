import mongoose from 'mongoose';
import connectDb from './db/db.js';
import Attendance from './model/Attendance.js';
import Employee from '../src/model/Employee.js';

const seedAttendanceFixed = async () => {
  try {
    await connectDb();

    // Clear existing
    await Attendance.deleteMany({});

    // Get employees
    const employees = await Employee.find({ status: 'active' }).select('_id');
    if (employees.length === 0) {
      console.log('No employees found - create employees first');
      process.exit(0);
    }

    const statuses = ['Present', 'Late', 'Absent', 'Leave'];
    const days = ['2024-12-16', '2024-12-17', '2024-12-18', '2024-12-19', '2024-12-20']; // Mon-Fri

    const attendanceRecords = [];

    days.forEach(day => {
      employees.slice(0, 5).forEach((emp) => { // Limit to 5 employees for testing
        attendanceRecords.push({
          employee: emp._id,
          date: day,
          checkIn: ['09:00', '09:15', '08:45', '10:30', ''][Math.floor(Math.random() * 5)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          workingHours: Math.floor(Math.random() * 8 + 4) * 60, // 4-12 hours
          workMode: ['Office', 'WFH'][Math.floor(Math.random() * 2)]
        });
      });
    });

    await Attendance.insertMany(attendanceRecords);
    console.log(`✅ Seeded ${attendanceRecords.length} attendance records for 5 employees across 5 days`);
    console.log('Days:', days);
    console.log('Test query: GET /api/admin/attendance?dateFrom=2024-12-16&dateTo=2024-12-20');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedAttendanceFixed();

