import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import os from 'os';
import AuditLog from '../model/AuditLog.js';
import Employee from '../model/Employee.js';

// Track API response times (simple in-memory ring buffer)
const responseTimeSamples: number[] = [];
export const recordResponseTime = (ms: number) => {
  responseTimeSamples.push(ms);
  if (responseTimeSamples.length > 100) responseTimeSamples.shift();
};

const avgResponseTime = () => {
  if (!responseTimeSamples.length) return 0;
  return Math.round(responseTimeSamples.reduce((a, b) => a + b, 0) / responseTimeSamples.length);
};

// Server start time
const SERVER_START = Date.now();

export const getSystemHealth = async (req: Request, res: Response) => {
  try {
    const now = Date.now();

    // ── 1. Database health ──────────────────────────────────────────────────
    const dbState = mongoose.connection.readyState;
    const dbStatusMap: Record<number, string> = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    const dbStatus = dbStatusMap[dbState] || 'unknown';
    const dbHealthy = dbState === 1;

    // DB ping latency
    let dbLatency = -1;
    if (dbHealthy && mongoose.connection.db) {
      const dbStart = Date.now();
      try {
        const admin = mongoose.connection.db.admin();
        if (admin) {
          await admin.ping();
          dbLatency = Date.now() - dbStart;
        }
      } catch { dbLatency = -1; }
    }

    // ── 2. Memory usage ─────────────────────────────────────────────────────
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem  = os.freemem();
    const usedMem  = totalMem - freeMem;

    const memory = {
      heapUsed:    Math.round(memUsage.heapUsed  / 1024 / 1024),  // MB
      heapTotal:   Math.round(memUsage.heapTotal / 1024 / 1024),  // MB
      rss:         Math.round(memUsage.rss       / 1024 / 1024),  // MB
      systemTotal: Math.round(totalMem / 1024 / 1024),            // MB
      systemUsed:  Math.round(usedMem  / 1024 / 1024),            // MB
      systemFree:  Math.round(freeMem  / 1024 / 1024),            // MB
      heapPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      systemPercent: Math.round((usedMem / totalMem) * 100),
    };

    // ── 3. CPU ──────────────────────────────────────────────────────────────
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || 'Unknown';
    const cpuCount = cpus.length;

    // CPU usage (1-second sample)
    const cpuPercent = await new Promise<number>((resolve) => {
      const start = cpus.map(c => ({ idle: c.times.idle, total: Object.values(c.times).reduce((a, b) => a + b, 0) }));
      setTimeout(() => {
        const end = os.cpus().map(c => ({ idle: c.times.idle, total: Object.values(c.times).reduce((a, b) => a + b, 0) }));
        const usage = start.map((s, i) => {
          const currentCpu = end[i];
          if (!currentCpu) return 0;
          const idleDiff  = currentCpu.idle  - s.idle;
          const totalDiff = currentCpu.total - s.total;
          return totalDiff === 0 ? 0 : Math.round((1 - idleDiff / totalDiff) * 100);
        });
        resolve(Math.round(usage.reduce((a, b) => a + b, 0) / usage.length));
      }, 200);
    });

    // ── 4. Uptime ───────────────────────────────────────────────────────────
    const uptimeMs      = now - SERVER_START;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const uptimeDays    = Math.floor(uptimeSeconds / 86400);
    const uptimeHours   = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptimeMins    = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeStr     = uptimeDays > 0
      ? `${uptimeDays}d ${uptimeHours}h ${uptimeMins}m`
      : uptimeHours > 0
      ? `${uptimeHours}h ${uptimeMins}m`
      : `${uptimeMins}m`;

    // ── 5. Recent errors (last 24h HIGH/WARNING audit logs) ─────────────────
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);
    const [recentErrors, totalErrors] = await Promise.all([
      AuditLog.find({ severity: { $in: ['HIGH', 'WARNING'] }, createdAt: { $gte: yesterday } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('action resource details severity createdAt user.name')
        .lean(),
      AuditLog.countDocuments({ severity: { $in: ['HIGH', 'WARNING'] }, createdAt: { $gte: yesterday } }),
    ]);

    // ── 6. Data stats ───────────────────────────────────────────────────────
    const totalEmployees = await Employee.countDocuments({ deletedAt: null });

    // ── 7. Overall health score ─────────────────────────────────────────────
    let score = 100;
    if (!dbHealthy)           score -= 40;
    if (dbLatency > 500)      score -= 10;
    if (memory.heapPercent > 90) score -= 20;
    if (cpuPercent > 90)      score -= 20;
    if (totalErrors > 10)     score -= 10;
    if (totalErrors > 50)     score -= 20;
    score = Math.max(0, score);

    const healthStatus = score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'critical';

    res.json({
      success: true,
      health: {
        status:    healthStatus,
        score,
        timestamp: new Date().toISOString(),
        uptime:    uptimeStr,
        uptimeMs,

        database: {
          status:  dbStatus,
          healthy: dbHealthy,
          latency: dbLatency,
          name:    mongoose.connection.name || 'ims',
        },

        memory,

        cpu: {
          model:   cpuModel,
          cores:   cpuCount,
          percent: cpuPercent,
        },

        api: {
          avgResponseTime: avgResponseTime(),
          node:            process.version,
          platform:        process.platform,
          pid:             process.pid,
        },

        alerts: {
          total24h: totalErrors,
          recent:   recentErrors.map((e: any) => ({
            action:    e.action,
            resource:  e.resource,
            details:   e.details,
            severity:  e.severity,
            user:      e.user?.name || 'System',
            time:      e.createdAt,
          })),
        },

        data: {
          totalEmployees,
        },
      },
    });
  } catch (err: any) {
    console.error('Health check error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
