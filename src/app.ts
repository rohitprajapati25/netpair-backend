import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
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
// Also fixes ::ffff:127.0.0.1 → 127.0.0.1 on localhost
app.set("trust proxy", true);

// ── Socket.io ────────────────────────────────────────────────────────────────
initSocket(server);

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Response time tracker ─────────────────────────────────────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => recordResponseTime(Date.now() - start));
  next();
});

// ── Simple in-memory rate limiter (per IP, per worker) ───────────────────────
// For production use Redis-based rate limiting across all workers
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT    = parseInt(process.env.RATE_LIMIT    || "100");  // requests
const RATE_WINDOW   = parseInt(process.env.RATE_WINDOW   || "60000"); // ms (1 min)

app.use((req: Request, res: Response, next: NextFunction) => {
  const ip  = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || 'unknown';
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

// ── Request logger (shows which worker handled the request) ──────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const wid = cluster.worker?.id ?? 'standalone';
    console.log(`[W${wid}] ${req.method} ${req.path}`);
    next();
  });
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success:   true,
    message:   'Server healthy',
    workerId:  cluster.worker?.id ?? 'standalone',
    pid:       process.pid,
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/admin',     adminRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/hr',        hrRoutes);
app.use('/api/admins',    adminRoleRoutes);

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use(((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[W${cluster.worker?.id ?? 'standalone'}] Error:`, err.message);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}) as ErrorRequestHandler);

export { app, server };


