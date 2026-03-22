// import dotenv from 'dotenv'
// dotenv.config();
// import app from './app.js'
// import connectDb from './db/db.js'
// import { superAdmin } from "./utils/superAdmin.js";
// import authRoutes from "./routes/auth.routes.js";
// import adminRoutes from "./routes/adminRoutes.js";

// connectDb()
//   .then(() => {
//     superAdmin();

//     app.use("/api/auth", authRoutes);
//     app.use("/api/admin", adminRoutes);

//     app.listen(5000, () => {
//       console.log("http://localhost:5000");
//     });
//   })
//   .catch((err) => {
//     console.error("Failed to start server due to DB error", err);
//     process.exit(1);
//   });