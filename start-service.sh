#!/bin/bash

# Todo for AI - Service 模式启动脚本
# 专门用于 macOS LaunchDaemon 环境

set -e

# 颜色定义（Service模式下不显示颜色）
if [ "${TODOFORAI_SERVICE_MODE}" = "daemon" ]; then
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    CYAN=''
    NC=''
else
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    NC='\033[0m'
fi

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# 端口配置
BACKEND_PORT=50110
FRONTEND_PORT=50111
PREVIEW_PORT=50112

# 日志函数
log_info() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1"
}

log_error() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >&2
}

log_warn() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1"
}

log_info "Todo for AI Service 启动中..."
log_info "项目根目录: $PROJECT_ROOT"
log_info "后端端口: $BACKEND_PORT"
log_info "前端端口: $FRONTEND_PORT"
log_info "Service模式: ${TODOFORAI_SERVICE_MODE:-normal}"

# 设置环境变量
setup_environment() {
    log_info "设置环境变量..."

    # 确保PATH包含必要的路径，包括Homebrew路径
    export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

    # Node.js 环境
    if [ -d "/opt/homebrew/bin" ]; then
        export PATH="/opt/homebrew/bin:$PATH"
    fi
    if [ -d "/usr/local/bin" ]; then
        export PATH="/usr/local/bin:$PATH"
    fi
    
    # Python 环境
    export PYTHONPATH="$BACKEND_DIR:$PYTHONPATH"
    export FLASK_ENV=production
    export FLASK_DEBUG=0
    
    # 服务配置
    export PORT=$BACKEND_PORT
    export HOST=0.0.0.0
    
    log_info "环境变量设置完成"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装或不在PATH中"
        return 1
    fi
    log_info "Node.js: $(node --version)"
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装或不在PATH中"
        return 1
    fi
    log_info "npm: $(npm --version)"
    
    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 未安装或不在PATH中"
        return 1
    fi
    log_info "Python3: $(python3 --version)"
    
    # 检查 pip
    if ! command -v pip3 &> /dev/null; then
        log_error "pip3 未安装或不在PATH中"
        return 1
    fi
    
    log_info "依赖检查完成"
}

# 初始化后端
init_backend() {
    log_info "初始化后端环境..."
    cd "$BACKEND_DIR"

    # 创建必要的目录
    mkdir -p logs
    mkdir -p uploads

    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        log_info "创建 Python 虚拟环境..."
        python3 -m venv venv
    fi

    # 激活虚拟环境
    source venv/bin/activate

    # 安装依赖
    log_info "检查 Python 依赖..."
    pip install -r requirements.txt

    log_info "后端环境初始化完成"
}

# 初始化前端
init_frontend() {
    log_info "初始化前端环境..."
    cd "$FRONTEND_DIR"
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        log_info "安装前端依赖..."
        npm install
    else
        log_info "前端依赖已安装，跳过..."
    fi
    
    log_info "前端环境初始化完成"
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务..."
    cd "$BACKEND_DIR"
    source venv/bin/activate

    # 设置环境变量
    export PORT=$BACKEND_PORT
    export HOST=0.0.0.0
    export FLASK_ENV=production
    export FLASK_DEBUG=0

    # 检查端口是否被占用
    if lsof -i :$BACKEND_PORT > /dev/null 2>&1; then
        log_warn "端口 $BACKEND_PORT 已被占用，尝试清理..."
        local pids=$(lsof -ti:$BACKEND_PORT 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
            sleep 2
        fi
    fi

    # 启动后端（前台运行，让Service管理）
    log_info "启动 Flask 应用..."
    python app.py &
    BACKEND_PID=$!

    log_info "后端服务 PID: $BACKEND_PID"

    # 等待服务启动
    log_info "等待后端服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
            log_info "后端服务启动成功 (http://localhost:$BACKEND_PORT)"
            return 0
        fi
        sleep 1
    done

    log_error "后端服务启动失败"
    return 1
}

# 启动前端服务
start_frontend() {
    log_info "启动前端服务..."
    cd "$FRONTEND_DIR"
    
    # 启动前端（前台运行，让Service管理）
    log_info "启动 Vite 开发服务器..."
    npm run dev &
    FRONTEND_PID=$!
    
    log_info "前端服务 PID: $FRONTEND_PID"
    
    # 等待服务启动
    log_info "等待前端服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
            log_info "前端服务启动成功 (http://localhost:$FRONTEND_PORT)"
            return 0
        fi
        sleep 1
    done
    
    log_warn "前端服务可能还在启动中..."
    return 0
}

# 显示服务状态
show_status() {
    log_info "服务状态:"
    log_info "前端服务: http://localhost:$FRONTEND_PORT"
    log_info "后端API: http://localhost:$BACKEND_PORT"
    log_info "API文档: http://localhost:$BACKEND_PORT/api/docs"
    log_info "健康检查: http://localhost:$BACKEND_PORT/health"
}

# 清理函数
cleanup() {
    log_info "正在停止服务..."
    
    # 杀死子进程
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    # 杀死端口占用的进程
    local ports=($BACKEND_PORT $FRONTEND_PORT $PREVIEW_PORT)
    for port in "${ports[@]}"; do
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            log_info "杀死端口 $port 上的进程: $pids"
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    done
    
    log_info "服务已停止"
    exit 0
}

# 主函数
main() {
    # 创建日志目录
    mkdir -p "$PROJECT_ROOT/logs"
    
    # 设置信号处理
    trap cleanup SIGINT SIGTERM
    
    # 执行启动流程
    setup_environment
    check_dependencies
    init_backend
    init_frontend
    
    if start_backend && start_frontend; then
        log_info "系统启动完成！"
        show_status
        
        # Service模式下保持运行
        if [ "${TODOFORAI_SERVICE_MODE}" = "daemon" ]; then
            log_info "Service模式：保持运行状态..."
            # 等待子进程
            wait
        else
            log_info "开发模式：按 Ctrl+C 停止服务..."
            # 等待信号
            while true; do
                sleep 1
            done
        fi
    else
        log_error "系统启动失败"
        exit 1
    fi
}

# 运行主函数
main "$@"
