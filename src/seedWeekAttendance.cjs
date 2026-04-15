const mongoose = require('mongoose');
const connectDb = (await import('./db/db.js')).default;
const Attendance = require('./model/Attendance');
const Employee = require('./model/Employee');

const seedWeekAttendance = async () => {
  try {
    await connectDb();
    console.log('🌱 Seeding CURRENT WEEK attendance data (CJS)...');

    // Clear week data
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    await Attendance.deleteMany({ date: { $gte: weekStart } });
    console.log('Cleared old week data');

    // Get or create employees
    let employees = await Employee.find({ status: 'active' }).select('_id');
    if (employees.length === 0) {
      console.log('Creating 5 test employees...');
      employees = await Employee.insertMany([
        { name: 'John Doe', email: 'john@ims.com', department: 'Development', status: 'active' },
        { name: 'Jane Smith', email: 'jane@ims.com', department: 'HR', status: 'active' },
        { name: 'Mike Johnson', email: 'mike@ims.com', department: 'IT', status: 'active' },
        { name: 'Sarah Wilson', email: 'sarah@ims.com', department: 'Finance', status: 'active' },
        { name: 'David Brown', email: 'david@ims.com', department: 'Admin', status: 'active' }
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
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedWeekAttendance();

