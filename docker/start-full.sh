#!/bin/bash

# Todo for AI - 完整应用启动脚本
# 使用supervisor管理多个服务

set -e

echo "🚀 启动 Todo for AI 完整应用..."

# 创建必要的目录
mkdir -p /app/uploads /app/logs /var/log/supervisor

# 设置权限
chown -R appuser:appuser /app/uploads /app/logs
chown -R mcpuser:mcpuser /app/logs

# 启动supervisor
echo "📋 启动服务管理器..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
