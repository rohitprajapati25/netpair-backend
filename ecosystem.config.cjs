/**
 * PM2 Ecosystem Config — Production Load Balancer
 *
 * Usage:
 *   npm install -g pm2
 *   npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 status
 *   pm2 logs
 *   pm2 stop all
 */

module.exports = {
  apps: [
    {
      name:         "ims-backend",
      script:       "./dist/cluster.js",   // compiled output
      instances:    "max",                  // one per CPU core
      exec_mode:    "cluster",              // PM2 cluster mode
      watch:        false,
      max_memory_restart: "500M",

      env: {
        NODE_ENV:     "development",
        PORT:         5000,
        RATE_LIMIT:   200,
        RATE_WINDOW:  60000,
      },
      env_production: {
        NODE_ENV:     "production",
        PORT:         5000,
        RATE_LIMIT:   100,
        RATE_WINDOW:  60000,
      },

      // Auto-restart on crash
      autorestart:  true,
      restart_delay: 3000,
      max_restarts:  10,

      // Logs
      out_file:  "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
