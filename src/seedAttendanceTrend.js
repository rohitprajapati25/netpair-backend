import mongoose from 'mongoose';
import connectDb from './src/db/db.js';
import Attendance from './src/model/Attendance.js';

const seedMonthlyTrend = async () => {
  await connectDb();

  // 12 months data Jan-Dec 2024
  const months = [
    '2024-01-15', '2024-02-15', '2024-03-15', '2024-04-15', '2024-05-15', 
    '2024-06-15', '2024-07-15', '2024-08-15', '2024-09-15', '2024-10-15', 
    '2024-11-15', '2024-12-15'
  ];

  const frequencies = [24, 28, 32, 26, 30, 34, 28, 32, 36, 30, 34, 38]; // Monthly counts

  const records = [];

  months.forEach((monthDate, index) => {
    // Create frequency records for each month
    for (let i = 0; i < frequencies[index]; i++) {
      records.push({
        employee: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Sample employee
        date: monthDate,
        status: ['Present', 'Late', 'Absent'][Math.floor(Math.random() * 3)],
        checkIn: '09:00',
        workingHours: 480,
        workMode: 'Office'
      });
    }
  });

  await Attendance.insertMany(records);
  console.log(`✅ Seeded ${records.length} monthly trend records (12 months)`);
  process.exit(0);
};

seedMonthlyTrend();

