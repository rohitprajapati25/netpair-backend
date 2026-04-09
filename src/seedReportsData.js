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
  
  // Seed Attendance (20 records)
  for(let i = 0; i < 20; i++) {
    await new Attendance({
      employee: employees[Math.floor(Math.random()*employees.length)]?._id || new mongoose.Types.ObjectId(),
      date: new Date(Date.now() - Math.random()*30*24*60*60*1000),
      checkIn: `09:${Math.floor(Math.random()*60).toString().padStart(2,'0')}`,
      status: ['Present', 'Late', 'Absent'][Math.floor(Math.random()*3)],
      createdAt: new Date()
    }).save();
  }
  
  // Seed Projects
  await new Project({
    name: 'IMS Reports Dashboard',
    status: 'Active',
    progress: 85,
    department: 'Development'
  }).save();
  
  console.log('✅ SEED DATA ADDED - Reports working!');
  process.exit(0);
};

seedData().catch(console.error);

