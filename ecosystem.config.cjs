/**
 * PM2 Ecosystem Config — Production Load Balancer
 *
 * Usage:
 *   npm install -g pm2
 *   npm run build
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 status
 *   pm2 logs
 *   pm2 stop all
 *   pm2 reload all          ← zero-downtime reload
 */

module.exports = {
  apps: [
    {
      name:         'ims-backend',
      script:       './dist/cluster.js',
      instances:    'max',          // one worker per CPU core
      exec_mode:    'cluster',      // PM2 cluster mode (round-robin LB)
      watch:        false,
      max_memory_restart: '500M',   // restart worker if it leaks past 500 MB

      // ── Environment ────────────────────────────────────────────────────────
      env: {
        NODE_ENV:    'development',
        PORT:        5000,
        RATE_LIMIT:  200,
        RATE_WINDOW: 60000,
      },
      env_production: {
        NODE_ENV:    'production',
        PORT:        5000,
        RATE_LIMIT:  100,
        RATE_WINDOW: 60000,
        // Set REDIS_URL here or in your .env to enable:
        //   - distributed rate limiting across workers
        //   - Socket.io Redis adapter (cross-worker broadcasting)
        // REDIS_URL: 'redis://localhost:6379',
      },

      // ── Reliability ────────────────────────────────────────────────────────
      autorestart:   true,
      restart_delay: 3000,   // wait 3s before restarting a crashed worker
      max_restarts:  10,     // give up after 10 rapid crashes

      // ── Zero-downtime deploys ──────────────────────────────────────────────
      // pm2 reload all  — sends SIGINT, waits for in-flight requests to finish
      kill_timeout:  5000,   // ms to wait for graceful shutdown before SIGKILL
      wait_ready:    true,   // wait for process.send('ready') before routing traffic
      listen_timeout: 8000,  // ms to wait for the app to be ready

      // ── Logs ───────────────────────────────────────────────────────────────
      out_file:        './logs/out.log',
      error_file:      './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs:      true,
    },
  ],
};
