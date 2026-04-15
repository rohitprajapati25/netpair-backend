/**
 * cluster.ts — Node.js Cluster Load Balancer
 *
 * Uses Node's built-in cluster module to fork one worker per CPU core.
 * The master process distributes incoming connections across all workers
 * using round-robin (default on Linux/Mac) or OS-level balancing (Windows).
 *
 * Socket.io sticky sessions are handled via the 'sticky-session' approach:
 * each worker shares the same Redis adapter so events broadcast correctly.
 */
import cluster from "cluster";
import os from "os";
import dotenv from "dotenv";
dotenv.config();
const NUM_WORKERS = parseInt(process.env.WORKERS || "") || os.cpus().length;
if (cluster.isPrimary) {
    console.log(`\n🔧 Master PID ${process.pid} — spawning ${NUM_WORKERS} workers`);
    console.log(`💻 CPU cores available: ${os.cpus().length}`);
    // Fork one worker per CPU core
    for (let i = 0; i < NUM_WORKERS; i++) {
        const worker = cluster.fork();
        console.log(`  ✅ Worker ${worker.id} (PID ${worker.process.pid}) started`);
    }
    // Auto-restart crashed workers
    cluster.on("exit", (worker, code, signal) => {
        console.warn(`⚠️  Worker ${worker.id} (PID ${worker.process.pid}) died` +
            ` [code: ${code}, signal: ${signal}] — restarting...`);
        const newWorker = cluster.fork();
        console.log(`  ✅ Replacement worker ${newWorker.id} (PID ${newWorker.process.pid}) started`);
    });
    // Graceful shutdown on SIGTERM / SIGINT
    const shutdown = (signal) => {
        console.log(`\n🛑 ${signal} received — shutting down all workers gracefully...`);
        for (const id in cluster.workers) {
            cluster.workers[id]?.kill("SIGTERM");
        }
        setTimeout(() => process.exit(0), 5000);
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
else {
    // Worker process — start the actual Express server
    import("./server.js");
    console.log(`  🚀 Worker ${cluster.worker?.id} (PID ${process.pid}) listening`);
}
//# sourceMappingURL=cluster.js.map