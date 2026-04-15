import mongoose from 'mongoose';
import connectDb from './db/db.ts';
import Attendance from './model/Attendance.ts';
import Employee from './model/Employee.ts';

const seedWeekAttendance = async () => {
  try {
    await connectDb();
    console.log('🌱 Seeding CURRENT WEEK attendance data (ESM)...');

    // Clear week data
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    await Attendance.deleteMany({});
    console.log('Cleared old week data');

    // Get or create employees
    let employees = await Employee.find({ status: 'active' }).select('_id');
    if (employees.length === 0) {
      console.log('Creating 5 test employees...');
        employees = await Employee.insertMany([
        { name: 'John Doe', email: 'john@ims.com', phone: '1234567890', designation: 'Developer', role: 'employee', department: 'Development', status: 'active', password: 'password123' },
        { name: 'Jane Smith', email: 'jane@ims.com', phone: '0987654321', designation: 'HR Manager', role: 'hr', department: 'HR', status: 'active', password: 'password123' },
        { name: 'Mike Johnson', email: 'mike@ims.com', phone: '1112223334', designation: 'IT Support', role: 'employee', department: 'IT', status: 'active', password: 'password123' },
        { name: 'Sarah Wilson', email: 'sarah@ims.com', phone: '5556667778', designation: 'Accountant', role: 'employee', department: 'Finance', status: 'active', password: 'password123' },
        { name: 'David Brown', email: 'david@ims.com', phone: '4445556667', designation: 'Admin Assistant', role: 'employee', department: 'Admin', status: 'active', password: 'password123' }
      ]);
    }
    console.log(`Using ${employees.length} employees`);

    // Generate 7 days data (5 emp x 2 shifts x 7 days = 70 records)
    const statuses = ['Present', 'Late', 'Absent', 'Leave'];
    const workModes = ['Office', 'WFH'];
    const records = [];
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + dayOffset);
      day.setHours(0, 0, 0, 0);
      for (let empIdx = 0; empIdx < 5; empIdx++) {
        const emp = employees[empIdx]._id;
        for (let shift = 0; shift < 2; shift++) {
          records.push({
            employee: emp,
            date: day,
            checkIn: shift === 0 ? '09:00' : '14:00',
            status: statuses[Math.floor(Math.random() * statuses.length)],
            workingHours: Math.floor(Math.random() * 4 + 6) * 60,
            workMode: workModes[Math.floor(Math.random() * 2)]
          });
        }
      }
    }

    await Attendance.insertMany(records);
    console.log(`✅ Seeded ${records.length} attendance records for current week (Sun-Sat)`);
    console.log('🔥 Reports page Attendance tab + "week" filter = ~70 records!');
    console.log('Test: Refresh Reports page now.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedWeekAttendance();

