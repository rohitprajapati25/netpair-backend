import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './model/user.model.ts';
import Admin from './model/Admin.ts';
import Employee from './model/Employee.ts';
import dotenv from 'dotenv';

dotenv.config();

const seedAuthUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ims');
    console.log('✅ MongoDB connected');

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password = await bcrypt.hash('password123', salt);

    // Test Admin User (Admin collection)
    const adminExists = await Admin.countDocuments({ email: 'admin@test.com' });
    if (!adminExists) {
      await Admin.create({
        name: 'Test Admin',
        email: 'admin@test.com',
        password,
        role: 'ADMIN',
        status: 'active',  // ✅ ACTIVE status
        department: 'IT',
        designation: 'Administrator'
      });
      console.log('✅ Test Admin created: admin@test.com / password123');
    } else {
      console.log('⚠️ Test Admin already exists');
    }

    // Test Super Admin (User collection)
    const superAdminExists = await User.countDocuments({ email: 'super@test.com' });
    if (!superAdminExists) {
      await User.create({
        name: 'Super Admin',
        email: 'super@test.com',
        password,
        role: 'SUPER_ADMIN',
        status: 'active',
        department: 'Management'
      });
      console.log('✅ Super Admin created: super@test.com / password123');
    } else {
      console.log('⚠️ Super Admin already exists');
    }

    // Test Employee (Employee collection)
    const empExists = await Employee.countDocuments({ email: 'employee@test.com' });
    if (!empExists) {
      await Employee.create({
        name: 'Test Employee',
        email: 'employee@test.com',
        password,
        role: 'EMPLOYEE',
        status: 'active',
        department: 'Engineering',
        designation: 'Software Engineer'
      });
      console.log('✅ Employee created: employee@test.com / password123');
    } else {
      console.log('⚠️ Employee already exists');
    }

    console.log('\n🎉 All test users created! Login credentials:');
    console.log('Admin: admin@test.com / password123');
    console.log('Super Admin: super@test.com / password123');
    console.log('Employee: employee@test.com / password123');
    console.log('\nTest API: curl -X POST -H "Content-Type: application/json" -d \'{"email":"admin@test.com","password":"password123"}\' http://localhost:5000/api/auth/login');
    
  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

seedAuthUsers();

