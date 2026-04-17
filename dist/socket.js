/**
 * socket.ts — Socket.io with Redis Adapter for multi-worker broadcasting
 *
 * In a clustered setup each worker runs its own Socket.io instance.
 * Without a shared adapter, events emitted in Worker A won't reach
 * clients connected to Worker B.  The Redis adapter solves this by
 * using Redis pub/sub as the message bus between workers.
 *
 * Redis adapter is optional — if REDIS_URL is not set the server falls
 * back to the default in-memory adapter (fine for single-worker / dev).
 */
import { Server } from 'socket.io';
import cluster from 'cluster';
import jwt from 'jsonwebtoken';
let io;
// ── Allowed origins (mirrors app.ts CORS list) ────────────────────────────────
const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
].filter(Boolean);
export const initSocket = async (server) => {
    const wid = cluster.worker?.id ?? 'standalone';
    io = new Server(server, {
        cors: {
            origin: ALLOWED_ORIGINS,
            methods: ["GET", "POST"],
            credentials: true,
        },
        // ── Transport & performance tuning ────────────────────────────────────────
        transports: ["websocket", "polling"], // prefer WS, fall back to polling
        pingTimeout: 20000, // 20s before declaring client dead
        pingInterval: 25000, // heartbeat every 25s
        upgradeTimeout: 10000, // time allowed to upgrade from polling → WS
        maxHttpBufferSize: 1e6, // 1 MB max message size
        connectTimeout: 45000,
    });
    // ── Redis Adapter (optional — enables cross-worker broadcasting) ──────────
    if (process.env.REDIS_URL) {
        try {
            const { createClient } = await import('redis');
            const { createAdapter } = await import('@socket.io/redis-adapter');
            const pubClient = createClient({ url: process.env.REDIS_URL });
            const subClient = pubClient.duplicate();
            await Promise.all([pubClient.connect(), subClient.connect()]);
            io.adapter(createAdapter(pubClient, subClient));
            console.log(`[W${wid}] 🔴 Socket.io Redis adapter connected`);
        }
        catch (err) {
            console.warn(`[W${wid}] ⚠️  Redis adapter unavailable — falling back to in-memory:`, err);
        }
    }
    else {
        console.log(`[W${wid}] ℹ️  Socket.io using in-memory adapter (set REDIS_URL for clustering)`);
    }
    // ── JWT Authentication middleware ─────────────────────────────────────────
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token ||
            socket.handshake.headers.authorization?.split(' ')[1];
        if (!token) {
            // Allow unauthenticated connections in dev; reject in production
            if (process.env.NODE_ENV === 'production') {
                return next(new Error('Authentication required'));
            }
            return next();
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = { id: decoded.id, role: decoded.role };
            next();
        }
        catch {
            next(new Error('Invalid or expired token'));
        }
    });
    // ── Connection handler ────────────────────────────────────────────────────
    io.on('connection', (socket) => {
        const user = socket.user;
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[W${wid}] ✅ Socket connected: ${socket.id}${user ? ` (${user.role})` : ''}`);
        }
        // Join a personal room so we can send targeted messages
        if (user?.id) {
            socket.join(`user:${user.id}`);
        }
        socket.on('error', (err) => {
            console.error(`[W${wid}] Socket error (${socket.id}):`, err.message);
        });
        socket.on('disconnect', (reason) => {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[W${wid}] ❌ Socket disconnected: ${socket.id} — ${reason}`);
            }
        });
    });
    return io;
};
// ── Emit helpers ──────────────────────────────────────────────────────────────
export const emitEmployeeUpdate = (data) => {
    io?.emit('employeeUpdate', data);
};
export const emitEmployeeDelete = (employeeId) => {
    io?.emit('employeeDelete', { id: employeeId });
};
/** Send a notification to a specific user (works across workers via Redis) */
export const emitToUser = (userId, event, data) => {
    io?.to(`user:${userId}`).emit(event, data);
};
export const getIO = () => io;
export default io;
//# sourceMappingURL=socket.js.map