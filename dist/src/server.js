import dotenv from 'dotenv';
dotenv.config();
import cluster from 'cluster';
import { server } from './app.js';
import connectDb from './db/db.js';
import { superAdmin } from "./utils/superAdmin.js";
const PORT = parseInt(process.env.PORT || "5000");
const WORKER_ID = cluster.worker?.id ?? "standalone";
connectDb()
    .then(() => {
    // Only seed superAdmin from worker 1 (or standalone) to avoid duplicate seeding
    if (WORKER_ID === 1 || WORKER_ID === "standalone") {
        superAdmin();
    }
    server.listen(PORT, () => {
        console.log(`🚀 Worker [${WORKER_ID}] running on http://localhost:${PORT}`);
    });
})
    .catch((err) => {
    console.error(`❌ Worker [${WORKER_ID}] failed to start:`, err);
    process.exit(1);
});
// Graceful shutdown for this worker
process.on("SIGTERM", () => {
    console.log(`🛑 Worker [${WORKER_ID}] shutting down gracefully...`);
    server.close(() => {
        console.log(`✅ Worker [${WORKER_ID}] closed all connections`);
        process.exit(0);
    });
});
//# sourceMappingURL=server.js.map