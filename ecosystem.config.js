module.exports = {
  apps: [
    {
      name: 'todo-for-ai-backend',
      cwd: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server',
      script: '/usr/bin/python3',
      args: 'app.py',
      env: {
        NODE_ENV: 'development',
        FLASK_ENV: 'development',
        PORT: '50110'
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
      min_uptime: '10s',
      time: true,
      log_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/backend.log',
      out_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/backend-out.log',
      error_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'todo-for-ai-frontend',
      cwd: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage',
      script: 'npm',
      args: 'run preview',
      env: {
        NODE_ENV: 'production',
        PREVIEW_PORT: '50112'
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
      min_uptime: '10s',
      time: true,
      log_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/frontend.log',
      out_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/frontend-out.log',
      error_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'todo-for-ai-notification-dispatcher',
      cwd: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server',
      script: '/usr/bin/python3',
      args: 'scripts/run_notification_dispatcher.py',
      env: {
        NODE_ENV: 'development',
        FLASK_ENV: 'development',
        PYTHONPATH: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server'
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      min_uptime: '10s',
      time: true,
      log_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/notification-dispatcher.log',
      out_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/notification-dispatcher-out.log',
      error_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/notification-dispatcher-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'todo-for-ai-openclaw-mock',
      cwd: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/agent-runtime',
      script: '/usr/bin/python3',
      args: 'scripts/mock_openclaw_server.py',
      env: {
        NODE_ENV: 'development',
        MOCK_OPENCLAW_PORT: '18790',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      log_date_format: 'YYYY-MM-DDTHH:mm:ss',
      out_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/openclaw-mock-out.log',
      error_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/openclaw-mock-error.log',
      merge_logs: true,
    },
    {
      name: 'todo-for-ai-agent-runtime',
      cwd: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/agent-runtime',
      script: '/usr/bin/python3',
      args: 'scripts/run_local.py',
      env: {
        NODE_ENV: 'development',
        PYTHONPATH: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/agent-runtime/src',
        WS_ENABLED: 'false'
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      min_uptime: '10s',
      time: true,
      log_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/agent-runtime.log',
      out_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/agent-runtime-out.log',
      error_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/agent-runtime-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
