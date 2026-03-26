import dotenv from 'dotenv';
dotenv.config();

import { app, server } from './app.js';
import connectDb from './db/db.js';
import { superAdmin } from "./utils/superAdmin.js";

connectDb()
  .then(() => {
    superAdmin();

    server.listen(5000, () => {
      console.log("🚀 Server + WebSocket running on http://localhost:5000");
      console.log("⚡ Real-time employee updates enabled!");
    });
  })
  .catch((err) => {
    console.error("Failed to start server due to DB error", err);
    process.exit(1);
  });

