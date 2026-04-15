import mongoose from 'mongoose';
// import connectDb from '../../db/db.js';
await mongoose.connect('mongodb://localhost:27017/ims');
const Attendance = require('../model/Attendance');
const Project = require('../model/Project');
const Leave = require('../model/Leave');
const Task = require('../model/Task');
const Employee = require('../model/Employee');
const Timesheet = require('../model/Timesheet');

const seedWeekData = async () => {
  await connectDb();
  console.log('🌱 Seeding CURRENT WEEK reports data...');

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

  // Get or create employees
  let employees = await Employee.find({ status: 'active' }).select('_id');
  if (employees.length === 0) {
    console.log('No employees - creating 5 test employees');
    employees = await Employee.insertMany([
      { name: 'John Doe', email: 'john@ims.com', department: 'Development', status: 'active' },
      { name: 'Jane Smith', email: 'jane@ims.com', department: 'HR', status: 'active' },
      { name: 'Mike Johnson', email: 'mike@ims.com', department: 'IT', status: 'active' },
      { name: 'Sarah Wilson', email: 'sarah@ims.com', department: 'Finance', status: 'active' },
      { name: 'David Brown', email: 'david@ims.com', department: 'Admin', status: 'active' }
    ]);
  }

  // 🎯 1. ATTENDANCE: 70 records (10/employee across week)
  console.log('📅 Seeding attendance...');
  const statuses = ['Present', 'Late', 'Absent', 'Leave'];
  const records = [];
  
  weekDays.forEach(day => {
    employees.slice(0, 5).forEach(emp => { // 5 employees
      for(let shift = 0; shift < 2; shift++) { // 2 shifts/day
        records.push({
          employee: emp._id,
          date: day,
          checkIn: shift === 0 ? '09:00' : '14:00',
          status: statuses[Math.floor(Math.random() * statuses.length)],
          workingHours: Math.floor(Math.random() * 4 + 6) * 60, // 6-10 hrs
          workMode: ['Office', 'WFH'][Math.floor(Math.random() * 2)],
          createdAt: new Date(day.getTime() + Math.random() * 24 * 60 * 60 * 1000) // Within day
        });
      }
    });
  });
  
await Attendance.deleteMany({ date: { $gte: weekStart, $lt: new Date(weekStart.getTime() + 8*24*60*60*1000) } });
await Attendance.insertMany(records); // Full 70 records
  console.log(`✅ 70 attendance records seeded for current week`);

  // 🎯 2. PROJECTS: 20 records
  console.log('📁 Seeding projects...');
  const projectStatuses = ['Ongoing', 'Active', 'Completed'];
  const projectNames = ['Weekly Sprint', 'Bug Fix', 'UI Update', 'API Dev', 'Testing'];
  
  for(let i = 0; i < 20; i++) {
    const createdDay = weekDays[Math.floor(Math.random() * 7)];
    await new Project({
      name: `${projectNames[Math.floor(Math.random()*5)]} #${i+1}`,
      status: projectStatuses[Math.floor(Math.random()*3)],
      progress: Math.floor(Math.random() * 80) + 10,
      department: ['Development', 'IT', 'HR'][Math.floor(Math.random()*3)],
      createdAt: new Date(createdDay.getTime() + Math.random() * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    }).save();
  }
  console.log('✅ 20 projects seeded');

  // 🎯 3. TASKS: 30 records  
  console.log('📋 Seeding tasks...');
  const taskStatuses = ['Completed', 'InProgress', 'Pending'];
  
  for(let i = 0; i < 30; i++) {
    const createdDay = weekDays[Math.floor(Math.random() * 7)];
    await new Task({
      title: `Week Task ${i+1}`,
      description: `Task for ${createdDay.toLocaleDateString()}`,
      status: taskStatuses[Math.floor(Math.random()*3)],
      priority: ['High', 'Medium', 'Low'][Math.floor(Math.random()*3)],
      assignedTo: employees[Math.floor(Math.random()*employees.length)]._id,
      createdAt: new Date(createdDay.getTime() + Math.random() * 24 * 60 * 60 * 1000)
    }).save();
  }
  console.log('✅ 30 tasks seeded');

  // 🎯 4. LEAVES: 15 records
  console.log('📅 Seeding leaves...');
  const leaveTypes = ['Sick', 'Casual', 'Annual'];
  
  for(let i = 0; i < 15; i++) {
    const startDay = weekDays[Math.floor(Math.random() * 5)]; // Mon-Fri
    await new Leave({
      employee: employees[Math.floor(Math.random()*employees.length)]._id,
      type: leaveTypes[Math.floor(Math.random()*3)],
      startDate: startDay,
      endDate: new Date(startDay.getTime() + 24*60*60*1000),
      status: ['Approved', 'Pending'][Math.floor(Math.random()*2)],
      createdAt: new Date(startDay.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000) // Recent
    }).save();
  }
  console.log('✅ 15 leaves seeded');

  console.log('🎉 ✅ WEEK REPORTS DATA COMPLETE! 135+ records ready.');
  console.log('🔥 Next: Restart backend → Test Reports page → Week filter should work!');
  process.exit(0);
};

seedWeekData().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});

