# Todo for AI - Dockerfile
# 支持前端、后端和MCP服务

# 构建参数
ARG NODE_VERSION=20
ARG PYTHON_VERSION=3.11
ARG VITE_APP_TITLE="Todo for AI"
ARG VITE_APP_VERSION="1.0.0"

# ================================
# 前端构建阶段
# ================================
FROM node:${NODE_VERSION}-alpine AS frontend-builder

WORKDIR /app/todo-for-ai-webpage

# 复制前端package文件
COPY todo-for-ai-webpage/package*.json ./

# 安装依赖
RUN npm ci

# 复制前端源代码
COPY todo-for-ai-webpage/ ./

# 设置构建环境变量
ARG VITE_APP_TITLE
ARG VITE_APP_VERSION
ARG VITE_BUILD_TIME
ARG VITE_API_BASE_URL=/todo-for-ai/api/v1
ARG VITE_MCP_SERVER_URL=

ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_BUILD_TIME=$VITE_BUILD_TIME
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_MCP_SERVER_URL=$VITE_MCP_SERVER_URL

# 构建前端
RUN npm run build:no-check

# ================================
# Python基础镜像
# ================================
FROM python:${PYTHON_VERSION}-slim AS python-base

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# ================================
# 最终镜像
# ================================
FROM python-base

WORKDIR /app

# 复制后端代码和依赖
COPY todo-for-ai-api-server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码，排除敏感文件
COPY todo-for-ai-api-server/*.py ./
COPY todo-for-ai-api-server/api/ ./api/
COPY todo-for-ai-api-server/core/ ./core/
COPY todo-for-ai-api-server/models/ ./models/
COPY todo-for-ai-api-server/migrations/ ./migrations/
COPY todo-for-ai-api-server/scripts/ ./scripts/

# 复制前端构建结果
COPY --from=frontend-builder /app/todo-for-ai-webpage/dist /var/www/html

# 复制配置文件
COPY todo-for-ai-webpage/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/start-full.sh /start.sh

# 创建必要目录
RUN mkdir -p uploads logs /var/log/supervisor /app/config

# 设置权限
RUN chmod +x app.py /start.sh

# 创建非root用户
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app/uploads /app/logs /app/config

# 设置默认环境变量
ENV FLASK_APP=app.py \
    FLASK_ENV=production \
    PORT=50110 \
    HOST=0.0.0.0 \
    CONFIG_DIR=/app/config

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/todo-for-ai/api/v1/health || exit 1

# 暴露端口
EXPOSE 50111 50110

# 启动所有服务
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
