import connectDb from './db/db.js';
import mongoose from 'mongoose';

const createIndexes = async () => {
  await connectDb();
  console.log('🔥 Creating Reports Indexes...');

  // Attendance indexes
  await mongoose.connection.db.collection('attendances').createIndexes([
    { key: { date: 1, status: 1 }, name: 'attendance_date_status' },
    { key: { 'employee.department': 1 }, name: 'attendance_dept' },
    { key: { createdAt: 1 }, name: 'attendance_created' }
  ]);
  console.log('✅ Attendance indexes created');

  // Projects indexes
  await mongoose.connection.db.collection('projects').createIndexes([
    { key: { createdAt: 1, status: 1 }, name: 'project_created_status' },
    { key: { department: 1 }, name: 'project_dept' }
  ]);
  console.log('✅ Projects indexes created');

  // Tasks indexes
  await mongoose.connection.db.collection('tasks').createIndexes([
    { key: { createdAt: 1, status: 1 }, name: 'task_created_status' },
    { key: { assignedTo: 1 }, name: 'task_assigned' }
  ]);
  console.log('✅ Tasks indexes created');

  console.log('🎉 All indexes created! Restart server.');
  process.exit(0);
};

createIndexes().catch(console.error);

