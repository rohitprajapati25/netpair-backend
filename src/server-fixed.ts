import dotenv from 'dotenv'
dotenv.config();

import connectDb from './db/db.js';
import { superAdmin } from "./utils/superAdmin.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/adminRoutes.js";
import app from './app.js';

const startServer = async () => {
  try {
    await connectDb();
    console.log("✅ MongoDB Connected!");

    await superAdmin();
    console.log("✅ SuperAdmin Ready!");

    // Mount routes AFTER DB connection
    app.use("/api/auth", authRoutes);
    app.use("/api/admin", adminRoutes);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('💥 Startup Error:', error);
    process.exit(1);
  }
};

startServer();

