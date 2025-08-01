#!/bin/bash

# Todo for AI - Docker Run 启动脚本
# 此脚本提供与 docker-compose 相同的功能，但使用 docker run 命令

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 默认配置
CONTAINER_NAME="todo-for-ai-app"
IMAGE_NAME="todo-for-ai:latest"
NETWORK_MODE="bridge"  # 使用bridge网络而不是host网络

# 检查是否已有同名容器运行
if docker ps -a --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    print_warning "容器 ${CONTAINER_NAME} 已存在，正在停止并删除..."
    docker stop ${CONTAINER_NAME} >/dev/null 2>&1 || true
    docker rm ${CONTAINER_NAME} >/dev/null 2>&1 || true
fi

# 创建必要的目录
print_info "创建必要的目录..."
mkdir -p ./uploads ./logs

print_info "启动 Todo for AI 容器..."

# 运行容器
docker run -d \
    --name ${CONTAINER_NAME} \
    --restart unless-stopped \
    \
    `# 端口映射` \
    -p 50111:80 \
    -p 50110:50110 \
    \
    `# 网络配置` \
    --add-host=host.docker.internal:host-gateway \
    \
    `# 卷挂载` \
    -v "$(pwd)/uploads:/app/uploads" \
    -v "$(pwd)/logs:/app/logs" \
    \
    `# ==================== 基础 Flask 配置 ====================` \
    -e FLASK_APP="app.py" \
    -e FLASK_ENV="production" \
    -e FLASK_DEBUG="0" \
    -e PORT="50110" \
    -e HOST="0.0.0.0" \
    -e DOCKER_ENV="true" \
    \
    `# ==================== 应用运行配置 ====================` \
    -e DEBUG="False" \
    -e TESTING="False" \
    \
    `# ==================== 数据库配置 ====================` \
    `# 请修改数据库密码` \
    -e DATABASE_URL="mysql+pymysql://root:YOUR_DB_PASSWORD@host.docker.internal:3306/todo_for_ai" \
    \
    `# ==================== 安全配置 ====================` \
    `# 生产环境请修改这些密钥` \
    -e SECRET_KEY="CHANGE-THIS-SECRET-KEY-IN-PRODUCTION-2024" \
    -e JWT_SECRET_KEY="CHANGE-THIS-JWT-SECRET-KEY-IN-PRODUCTION-2024" \
    \
    `# ==================== OAuth 第三方登录配置 ====================` \
    `# GitHub OAuth (可选)` \
    -e GITHUB_CLIENT_ID="YOUR_GITHUB_CLIENT_ID_HERE" \
    -e GITHUB_CLIENT_SECRET="YOUR_GITHUB_CLIENT_SECRET_HERE" \
    -e GITHUB_REDIRECT_URI="http://localhost:50110/todo-for-ai/api/v1/auth/github/callback" \
    \
    `# Google OAuth (可选)` \
    -e GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com" \
    -e GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET_HERE" \
    \
    `# ==================== CORS 跨域配置 ====================` \
    -e CORS_ORIGINS="http://localhost:5173,http://localhost:50111,http://localhost:50112,http://localhost:8080" \
    \
    `# ==================== 文件上传配置 ====================` \
    -e UPLOAD_FOLDER="/app/uploads" \
    -e MAX_CONTENT_LENGTH="16777216" \
    \
    `# ==================== 日志配置 ====================` \
    -e LOG_LEVEL="INFO" \
    -e LOG_FILE="/app/logs/app.log" \
    \
    `# ==================== SSL/TLS 配置 ====================` \
    -e PYTHONHTTPSVERIFY="0" \
    -e REQUESTS_CA_BUNDLE="" \
    \
    `# 镜像名称` \
    ${IMAGE_NAME}

# 检查容器是否启动成功
if docker ps --format "table {{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    print_success "容器启动成功！"
    print_info "容器名称: ${CONTAINER_NAME}"
    print_info "前端访问: http://localhost:50111"
    print_info "API访问: http://localhost:50110"
    print_info ""
    print_info "查看日志: docker logs ${CONTAINER_NAME}"
    print_info "停止容器: docker stop ${CONTAINER_NAME}"
    print_info "删除容器: docker rm ${CONTAINER_NAME}"
else
    print_error "容器启动失败！"
    print_info "查看错误日志: docker logs ${CONTAINER_NAME}"
    exit 1
fi
