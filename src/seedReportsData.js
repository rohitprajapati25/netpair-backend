import mongoose from 'mongoose';
import connectDb from '../db/db.js';
import Attendance from '../model/Attendance.js';
import Project from '../model/Project.js';
import Leave from '../model/Leave.js';
import Task from '../model/Task.js';
import Employee from '../model/Employee.js';

const seedData = async () => {
  await connectDb();
  
  // Sample employees
  const employees = await Employee.find({ status: 'active' });
  if (employees.length === 0) {
    console.log('No employees, seeding basic...');
  }
  
  // Seed Attendance (30 records)
  for(let i = 0; i < 30; i++) {
    await new Attendance({
      employee: employees[Math.floor(Math.random()*employees.length)]?._id || new mongoose.Types.ObjectId(),
      date: new Date(Date.now() - Math.random()*30*24*60*60*1000),
      checkIn: `09:${Math.floor(Math.random()*60).toString().padStart(2,'0')}`,
      status: ['Present', 'Late', 'Absent', 'Leave'][Math.floor(Math.random()*4)],
      createdAt: new Date()
    }).save();
  }
  
  // Seed Projects (25 records)
  const projectStatuses = ['Ongoing', 'Completed', 'Pending', 'Delayed'];
  for(let i = 0; i < 25; i++) {
    await new Project({
      name: `Project ${i+1}`,
      status: projectStatuses[Math.floor(Math.random()*4)],
      progress: Math.floor(Math.random()*100),
      department: ['Development', 'HR', 'IT', 'Finance'][Math.floor(Math.random()*4)]
    }).save();
  }
  
  // Seed Leaves (15 records)
  for(let i = 0; i < 15; i++) {
    await new Leave({
      employee: employees[Math.floor(Math.random()*employees.length)]?._id || new mongoose.Types.ObjectId(),
      type: ['Sick', 'Casual', 'Annual'][Math.floor(Math.random()*3)],
      startDate: new Date(Date.now() - Math.random()*60*24*60*60*1000),
      endDate: new Date(Date.now() - Math.random()*30*24*60*60*1000),
      status: ['Approved', 'Pending', 'Rejected'][Math.floor(Math.random()*3)],
      createdAt: new Date()
    }).save();
  }
  
  // Seed Tasks (40 records)
  for(let i = 0; i < 40; i++) {
    await new Task({
      title: `Task ${i+1}`,
      description: 'Live task description',
      status: ['Completed', 'InProgress', 'Pending', 'Overdue'][Math.floor(Math.random()*4)],
      priority: ['High', 'Medium', 'Low'][Math.floor(Math.random()*3)],
      assignedTo: employees[Math.floor(Math.random()*employees.length)]?._id || new mongoose.Types.ObjectId(),
      createdAt: new Date()
    }).save();
  }
  
  console.log('✅ LIVE REPORTS DATA SEEDED - All tabs full!');
  process.exit(0);
};

seedData().catch(console.error);

