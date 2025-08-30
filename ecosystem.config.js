module.exports = {
  apps: [
    {
      name: 'trading-viewer-server',
      script: './apps/server/dist/index.js',
      cwd: '/Users/tomo/github.com/yuru-sha/works',
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 8000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
      // Graceful shutdown settings
      kill_timeout: 30000, // 30 seconds for graceful shutdown
      listen_timeout: 3000,
      shutdown_with_message: true,
      wait_ready: true,
      // Log configuration
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // Restart policies
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      restart_delay: 5000,
      // Health check
      health_check: {
        interval: 30000,
        url: 'http://localhost:8000/health',
        max_consecutive_failures: 3,
      },
    },
  ],
}
