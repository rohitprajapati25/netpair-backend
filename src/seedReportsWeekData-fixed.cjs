const mongoose = await import('mongoose');
const connectDb = (await import('./db/db.js')).default;
const Attendance = require('./model/Attendance.js');
const Project = require('./model/Project.js');
const Leave = require('./model/Leave.js');
const Task = require('./model/Task.js');
const Employee = require('./model/Employee.js');
const Timesheet = require('./model/Timesheet.js');

const seedWeekData = async () => {
  await connectDb();
  console.log('🌱 Seeding CURRENT WEEK reports data (CJS)...');

  // Get current week (Monday start)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  weekStart.setHours(0, 0, 0, 0);
  
  const weekDays = [];
  for(let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    weekDays.push(day);
  }

  // Get or create 5 employees
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
  console.log(`Found ${employees.length} employees`);

  // 🎯 ATTENDANCE: 70 records (2 shifts x 5 emp x 7 days)
  console.log('📅 Seeding attendance...');
  const statuses = ['Present', 'Late', 'Absent', 'Leave'];
  const attendanceRecords = [];
  
  weekDays.forEach(day => {
    for(let empIdx = 0; empIdx < 5; empIdx++) {
      const emp = employees[empIdx]._id;
      for(let shift = 0; shift < 2; shift++) {
        attendanceRecords.push({
          employee: emp,
          date: day,
          checkIn: shift === 0 ? '09:00' : '14:00',
          status: statuses[Math.floor(Math.random() * statuses.length)],
          workingHours: Math.floor(Math.random() * 4 + 6) * 60,
          workMode: ['Office', 'WFH'][Math.floor(Math.random() * 2)],
          createdAt: new Date(day.getTime() + Math.random() * 24 * 60 * 60 * 1000)
        });
      }
    }
  });
  
  // Clear old week data
  await Attendance.deleteMany({ date: { $gte: weekStart } });
  await Attendance.insertMany(attendanceRecords);
  console.log(`✅ 70 attendance records seeded`);

  // 🎯 PROJECTS: 20
  console.log('📁 Seeding projects...');
  const projectStatuses = ['Active', 'Ongoing', 'Completed'];
  await Project.deleteMany({ createdAt: { $gte: weekStart } });
  for(let i = 0; i < 20; i++) {
    const day = weekDays[Math.floor(Math.random() * 7)];
    await new Project({
      name: `Week Project ${i+1}`,
      status: projectStatuses[Math.floor(Math.random()*3)],
      progress: Math.floor(Math.random() * 80) + 10,
      department: ['Development', 'IT', 'HR'][Math.floor(Math.random()*3)],
      createdAt: new Date(day.getTime() + Math.random() * 24 * 60 * 60 * 1000)
    }).save();
  }

  // 🎯 TASKS: 30
  console.log('📋 Seeding tasks...');
  await Task.deleteMany({ createdAt: { $gte: weekStart } });
  for(let i = 0; i < 30; i++) {
    const day = weekDays[Math.floor(Math.random() * 7)];
    await new Task({
      title: `Week Task ${i+1}`,
      status: ['Completed', 'InProgress', 'Pending'][Math.floor(Math.random()*3)],
      assignedTo: employees[Math.floor(Math.random()*5)]._id,
      createdAt: new Date(day.getTime() + Math.random() * 24 * 60 * 60 * 1000)
    }).save();
  }

  // 🎯 LEAVES: 15
  console.log('📅 Seeding leaves...');
  await Leave.deleteMany({ startDate: { $gte: weekStart } });
  for(let i = 0; i < 15; i++) {
    const day = weekDays[Math.floor(Math.random() * 5)];
    await new Leave({
      employee: employees[Math.floor(Math.random()*5)]._id,
      type: ['Sick', 'Casual', 'Annual'][Math.floor(Math.random()*3)],
      startDate: day,
      status: ['Approved', 'Pending'][Math.floor(Math.random()*2)],
      createdAt: new Date(day)
    }).save();
  }

  console.log('🎉 ✅ FIXED SEED COMPLETE - 135 records!');
  console.log('🔥 Run `npm run dev` → Reports Week = FULL DATA');
  process.exit(0);
};

seedWeekData().catch(err => console.error('❌ Seed error:', err));

