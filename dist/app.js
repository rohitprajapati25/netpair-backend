import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import http from 'http';
import cluster from 'cluster';
import { initSocket } from './socket.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/auth.routes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import hrRoutes from './routes/hrRoutes.js';
import adminRoleRoutes from './routes/adminRoleRoutes.js';
import { recordResponseTime } from './controllers/healthController.js';
const app = express();
const server = http.createServer(app);
// Trust proxy — required for correct req.ip behind nginx/load balancer
app.set("trust proxy", true);
// ── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(hpp());
// ── Gzip Compression ─────────────────────────────────────────────────────────
// Compresses all JSON/text responses > 1 KB — typically 60-80% size reduction.
app.use(compression({
    level: 6, // balanced speed vs ratio
    threshold: 1024, // skip tiny responses
    filter: (req, res) => {
        if (req.headers['accept'] === 'text/event-stream')
            return false;
        return compression.filter(req, res);
    },
}));
// ── MongoDB injection sanitizer (Express 5 compatible) ───────────────────────
// express-mongo-sanitize v2 tries to overwrite req.query which is read-only in
// Express 5, so we sanitize req.body and req.params manually instead.
app.use((req, _res, next) => {
    const sanitize = (obj) => {
        if (!obj || typeof obj !== 'object')
            return obj;
        for (const key of Object.keys(obj)) {
            if (key.startsWith('\x24') || key.includes('.')) {
                delete obj[key];
            }
            else if (typeof obj[key] === 'object') {
                sanitize(obj[key]);
            }
        }
        return obj;
    };
    if (req.body)
        sanitize(req.body);
    if (req.params)
        sanitize(req.params);
    next();
});
// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin))
            return callback(null, true);
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
}));
// ── Distributed Rate Limiter ──────────────────────────────────────────────────
// Uses Redis when REDIS_URL is set — shared state across all cluster workers.
// Falls back to per-worker in-memory map when Redis is unavailable.
const RATE_LIMIT = parseInt(process.env.RATE_LIMIT || '100');
const RATE_WINDOW = parseInt(process.env.RATE_WINDOW || '60000');
let redisRateLimiter = null;
if (process.env.REDIS_URL) {
    (async () => {
        try {
            const { createClient } = await import('redis');
            const redisClient = createClient({ url: process.env.REDIS_URL });
            await redisClient.connect();
            const wid = cluster.worker?.id ?? 'standalone';
            console.log(`[W${wid}] 🔴 Redis rate limiter connected`);
            redisRateLimiter = async (ip) => {
                const key = `rl:${ip}`;
                const count = await redisClient.incr(key);
                if (count === 1)
                    await redisClient.pExpire(key, RATE_WINDOW);
                return count > RATE_LIMIT;
            };
        }
        catch (err) {
            console.warn('⚠️  Redis unavailable — using in-memory rate limiter:', err);
        }
    })();
}
// In-memory fallback (per-worker)
const rateLimitMap = new Map();
app.use(async (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || 'unknown';
    if (redisRateLimiter) {
        const exceeded = await redisRateLimiter(ip);
        if (exceeded) {
            return res.status(429).json({ success: false, message: 'Too many requests — please slow down.' });
        }
        return next();
    }
    // In-memory fallback
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
        return next();
    }
    entry.count++;
    if (entry.count > RATE_LIMIT) {
        return res.status(429).json({
            success: false,
            message: 'Too many requests — please slow down.',
            retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        });
    }
    next();
});
// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// ── Response time tracker ─────────────────────────────────────────────────────
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => recordResponseTime(Date.now() - start));
    next();
});
// ── Request logger (dev only) ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
        const wid = cluster.worker?.id ?? 'standalone';
        console.log(`[W${wid}] ${req.method} ${req.path}`);
        next();
    });
}
// ── Socket.io ────────────────────────────────────────────────────────────────
initSocket(server);
// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server healthy',
        workerId: cluster.worker?.id ?? 'standalone',
        pid: process.pid,
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
    });
});
// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/admins', adminRoleRoutes);
// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
// ── Global error handler ─────────────────────────────────────────────────────
app.use(((err, _req, res, _next) => {
    console.error(`[W${cluster.worker?.id ?? 'standalone'}] Error:`, err.message);
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
}));
export { app, server };
//# sourceMappingURL=app.js.map