import mongoose from 'mongoose'
import cluster from 'cluster'
import os from 'os';

const connectDb = async () => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ims';
    if (!uri) {
        console.error("MONGO_URI not set in environment");
        throw new Error("Missing MONGO_URI");
    }

    // ── Connection Pool Sizing ────────────────────────────────────────────────
    // Each worker gets its own pool. Keep it small so total connections
    // (maxPoolSize × NUM_WORKERS) stay well under MongoDB's 100-connection default.
    // Formula: floor(100 / NUM_WORKERS) capped at 10, minimum 2.
    const numWorkers = parseInt(process.env.WORKERS || "") || os.cpus().length;
    const maxPoolSize = Math.max(2, Math.min(10, Math.floor(80 / numWorkers)));

    const wid = cluster.worker?.id ?? "standalone";

    try {
        await mongoose.connect(uri, {
            maxPoolSize,          // per-worker connection pool
            minPoolSize: 1,       // keep at least 1 connection warm
            serverSelectionTimeoutMS: 5000,   // fail fast if MongoDB unreachable
            socketTimeoutMS: 45000,           // drop idle sockets after 45s
            connectTimeoutMS: 10000,          // initial connection timeout
            heartbeatFrequencyMS: 10000,      // check server health every 10s
            retryWrites: true,
            retryReads: true,
        });
        console.log(`[W${wid}] ✅ MongoDB connected (pool: ${maxPoolSize} connections)`);
    } catch (err) {
        console.error(`[W${wid}] ❌ MongoDB connection error:`, err);
        throw err;
    }
};

export default connectDb;


//use rolewise login using context api and 
