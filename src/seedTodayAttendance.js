import mongoose from 'mongoose';
import connectDb from '../db/db.js';
import Attendance from './model/Attendance.js';
import Employee from './model/Employee.js';

const seedTodayAttendance = async () => {
  try {
    await connectDb();
    console.log('✅ MongoDB connected for seeding');

    // Clear existing attendance
    await Attendance.deleteMany({});
    console.log('🗑️ Cleared old attendance data');

    // Get some employees
    const employees = await Employee.find({}, '_id name department employeeId');
    if (employees.length === 0) {
      console.log('❌ No employees found. Create employees first.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Generate 20 today's attendance records
    const todayAttendance = [];
    const statuses = ['Present', 'Late', 'Absent', 'Half Day', 'Work From Home'];

    for (let i = 0; i < Math.min(20, employees.length); i++) {
      const emp = employees[i];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const checkIn = new Date(today.getTime() + Math.random() * 6 * 60 * 60 * 1000); // 6AM to midnight

      todayAttendance.push({
        employee: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        date: today,
        status,
        checkIn: status === 'Absent' ? null : checkIn,
        checkOut: status === 'Absent' ? null : new Date(checkIn.getTime() + (8 + Math.random() * 2) * 60 * 60 * 1000),
        hours_worked: status === 'Absent' ? 0 : 8 + Math.random() * 2,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await Attendance.insertMany(todayAttendance);
    console.log(`✅ Seeded ${todayAttendance.length} today's attendance records (${today.toDateString()})`);

    console.log('🎉 Today\'s attendance seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedTodayAttendance();
