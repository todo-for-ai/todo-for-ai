module.exports = {
  apps: [
    {
      name: 'todo-for-ai-backend',
      cwd: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server',
      script: './venv/bin/python',
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
    }
  ]
};
