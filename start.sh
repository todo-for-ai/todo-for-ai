#!/bin/bash
#
# Start.sh - 同时启动前端和后端服务 (PM2管理)
#
# 特性:
# - 进程保活 (自动重启)
# - 热加载 (文件变化自动重启)
# - 单实例保证 (启动前杀死已有进程)
# - 统一日志管理
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PM2_HOME="${PROJECT_ROOT}/.pm2"
export PM2_HOME

BACKEND_DIR="${PROJECT_ROOT}/todo-for-ai-api-server"
BACKEND_VENV="${BACKEND_DIR}/.venv"
BACKEND_PYTHON="${BACKEND_VENV}/bin/python"

# 确保PM2_HOME存在
mkdir -p "${PM2_HOME}"

# 进程名称
FRONTEND_NAME="todo-for-ai-web"
BACKEND_NAME="todo-for-ai-api"

# 端口配置 (从环境变量读取或使用项目默认值)
FRONTEND_PORT=${FRONTEND_PORT:-50111}
BACKEND_PORT=${BACKEND_PORT:-50110}

# 热加载模式 (默认开启)
HOT_RELOAD=${HOT_RELOAD:-false}

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查PM2是否安装
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2 未安装，正在安装..."
        npm install -g pm2
    fi
    log_success "PM2 已就绪"
}

# 杀死已有进程 (单实例保证)
kill_existing() {
    log_info "检查并清理已有进程..."

    # 停止并删除前端进程
    if pm2 describe "${FRONTEND_NAME}" &> /dev/null; then
        log_warn "发现已存在的前端进程，正在停止..."
        pm2 stop "${FRONTEND_NAME}" &> /dev/null || true
        pm2 delete "${FRONTEND_NAME}" &> /dev/null || true
        log_success "前端进程已清理"
    fi

    # 停止并删除后端进程
    if pm2 describe "${BACKEND_NAME}" &> /dev/null; then
        log_warn "发现已存在的后端进程，正在停止..."
        pm2 stop "${BACKEND_NAME}" &> /dev/null || true
        pm2 delete "${BACKEND_NAME}" &> /dev/null || true
        log_success "后端进程已清理"
    fi

    # 确保端口未被占用
    if lsof -ti:${FRONTEND_PORT} &> /dev/null; then
        log_warn "端口 ${FRONTEND_PORT} 被占用，正在释放..."
        kill -9 $(lsof -ti:${FRONTEND_PORT}) 2>/dev/null || true
    fi

    if lsof -ti:${BACKEND_PORT} &> /dev/null; then
        log_warn "端口 ${BACKEND_PORT} 被占用，正在释放..."
        kill -9 $(lsof -ti:${BACKEND_PORT}) 2>/dev/null || true
    fi

    sleep 1
}

# 检查依赖
check_dependencies() {
    log_info "检查项目依赖..."

    # 检查前端依赖
    if [ ! -d "${PROJECT_ROOT}/todo-for-ai-webpage/node_modules" ]; then
        log_warn "前端依赖未安装，正在安装..."
        cd "${PROJECT_ROOT}/todo-for-ai-webpage"
        npm install
        log_success "前端依赖安装完成"
    fi

    # 检查后端虚拟环境
    if [ ! -x "${BACKEND_PYTHON}" ]; then
        log_warn "后端虚拟环境不存在，正在创建..."
        python3 -m venv "${BACKEND_VENV}"
    fi

    # 检查后端关键依赖，缺失则统一安装
    if ! "${BACKEND_PYTHON}" -c "import flask, bleach, kubernetes" &> /dev/null; then
        log_warn "后端依赖未就绪，正在安装 requirements.txt..."
        "${BACKEND_PYTHON}" -m pip install -r "${BACKEND_DIR}/requirements.txt"
        log_success "后端依赖安装完成"
    fi

    log_success "依赖检查完成"
}

# 启动前端服务
start_frontend() {
    log_info "启动前端服务 (端口: ${FRONTEND_PORT})..."

    cd "${PROJECT_ROOT}/todo-for-ai-webpage"

    # 热加载配置
    if [ "${HOT_RELOAD}" = "true" ]; then
        WATCH_MODE="--watch"
        IGNORE_WATCH="--ignore-watch node_modules --ignore-watch logs --ignore-watch .pid"
        log_info "前端热加载已启用"
    else
        WATCH_MODE=""
        IGNORE_WATCH=""
        log_info "前端热加载已禁用"
    fi

    # 使用PM2启动前端 (直接使用npx vite，确保端口配置生效)
    pm2 start npx \
        --name "${FRONTEND_NAME}" \
        --cwd "${PROJECT_ROOT}/todo-for-ai-webpage" \
        --restart-delay 2000 \
        --max-restarts 10 \
        --time \
        --env NODE_ENV=development \
        --log-date-format "YYYY-MM-DD HH:mm:ss" \
        --merge-logs \
        --log "${PROJECT_ROOT}/logs/frontend.log" \
        --error "${PROJECT_ROOT}/logs/frontend-error.log" \
        --output "${PROJECT_ROOT}/logs/frontend-out.log" \
        --pid "${PROJECT_ROOT}/.pid/frontend.pid" \
        --kill-timeout 5000 \
        ${WATCH_MODE} ${IGNORE_WATCH} \
        -- vite --host 0.0.0.0 --port ${FRONTEND_PORT}

    log_success "前端服务已启动"
}

# 启动后端服务
start_backend() {
    log_info "启动后端服务 (端口: ${BACKEND_PORT})..."

    cd "${PROJECT_ROOT}/todo-for-ai-api-server"

    # 热加载配置
    if [ "${HOT_RELOAD}" = "true" ]; then
        WATCH_MODE="--watch"
        IGNORE_WATCH="--ignore-watch __pycache__ --ignore-watch .pytest_cache --ignore-watch logs --ignore-watch test-results"
        log_info "后端热加载已启用 (Python文件变更自动重启)"
    else
        WATCH_MODE=""
        IGNORE_WATCH=""
        log_info "后端热加载已禁用"
    fi

    # 使用PM2启动后端 (通过Python直接运行)
    pm2 start "${BACKEND_PYTHON}" \
        --name "${BACKEND_NAME}" \
        --cwd "${BACKEND_DIR}" \
        --restart-delay 3000 \
        --max-restarts 10 \
        --time \
        --log-date-format "YYYY-MM-DD HH:mm:ss" \
        --merge-logs \
        --log "${PROJECT_ROOT}/logs/backend.log" \
        --error "${PROJECT_ROOT}/logs/backend-error.log" \
        --output "${PROJECT_ROOT}/logs/backend-out.log" \
        --pid "${PROJECT_ROOT}/.pid/backend.pid" \
        --kill-timeout 5000 \
        ${WATCH_MODE} ${IGNORE_WATCH} \
        -- app.py

    log_success "后端服务已启动"
}

# 等待服务健康检查
wait_for_services() {
    log_info "验证前后端健康状态..."
    local max_attempts=40
    local attempt=1

    while [ "${attempt}" -le "${max_attempts}" ]; do
        if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/todo-for-ai/api/v1/health" >/dev/null 2>&1 && \
           curl -fsS "http://127.0.0.1:${FRONTEND_PORT}/" >/dev/null 2>&1; then
            log_success "健康检查通过 (attempt=${attempt})"
            return 0
        fi

        sleep 1
        attempt=$((attempt + 1))
    done

    log_error "健康检查失败: 服务未在预期时间内就绪"
    pm2 status || true
    echo "----- backend logs -----"
    pm2 logs "${BACKEND_NAME}" --lines 80 --nostream || true
    echo "----- frontend logs -----"
    pm2 logs "${FRONTEND_NAME}" --lines 80 --nostream || true
    return 1
}

# 创建日志目录
create_log_dirs() {
    mkdir -p "${PROJECT_ROOT}/logs"
    mkdir -p "${PROJECT_ROOT}/.pid"
    mkdir -p "${PM2_HOME}"
}

# 保存PM2配置
save_pm2_config() {
    log_info "保存PM2配置..."
    pm2 save --force
    log_success "PM2配置已保存"
}

# 显示状态
show_status() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}服务启动完成${NC}"
    echo "=========================================="
    echo ""
    pm2 list
    echo ""
    echo -e "${BLUE}前端地址:${NC} http://localhost:${FRONTEND_PORT}"
    echo -e "${BLUE}后端地址:${NC} http://localhost:${BACKEND_PORT}"
    echo ""
    echo -e "${YELLOW}常用命令:${NC}"
    echo "  查看日志:  pm2 logs"
    echo "  停止服务:  pm2 stop all"
    echo "  重启服务:  pm2 restart all"
    echo "  查看状态:  pm2 status"
    echo ""
    echo -e "${GREEN}热加载状态: ${HOT_RELOAD}${NC}"
    echo "=========================================="
}

# 设置信号处理 (优雅退出)
cleanup() {
    log_warn "接收到终止信号，正在优雅停止服务..."
    pm2 stop all
    exit 0
}

trap cleanup SIGINT SIGTERM

# 主函数
main() {
    echo "=========================================="
    echo -e "${GREEN}Todo for AI - 服务启动脚本${NC}"
    echo "=========================================="
    echo ""
    # 执行启动流程
    check_pm2
    create_log_dirs
    check_dependencies
    kill_existing
    start_frontend
    start_backend
    wait_for_services
    save_pm2_config
    show_status

    # 保持运行 (如果是直接运行)
    if [ "$1" = "--fg" ] || [ "$1" = "--foreground" ]; then
        log_info "前台模式运行，按 Ctrl+C 停止服务..."
        pm2 logs
    else
        log_success "服务已在后台运行，使用 'pm2 logs' 查看日志"
    fi
}

# 子命令处理
case "${1:-}" in
    stop)
        log_info "停止所有服务..."
        pm2 stop all
        log_success "服务已停止"
        ;;
    restart)
        log_info "重启所有服务..."
        pm2 restart all
        log_success "服务已重启"
        ;;
    delete|kill)
        log_info "删除所有PM2进程..."
        pm2 delete all
        log_success "进程已删除"
        ;;
    logs)
        pm2 logs
        ;;
    status)
        pm2 status
        ;;
    frontend|fe)
        pm2 logs "${FRONTEND_NAME}"
        ;;
    backend|be)
        pm2 logs "${BACKEND_NAME}"
        ;;
    hot-reload|reload)
        log_info "重新加载热加载配置..."
        pm2 restart all
        log_success "热加载配置已应用"
        ;;
    --help|-h)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (empty)       启动所有服务 (默认)"
        echo "  stop          停止所有服务"
        echo "  restart       重启所有服务"
        echo "  delete        删除所有PM2进程"
        echo "  logs          查看所有日志"
        echo "  status        查看服务状态"
        echo "  frontend      查看前端日志"
        echo "  backend       查看后端日志"
        echo "  hot-reload    重启并应用热加载"
        echo "  --fg          前台模式运行 (带日志)"
        echo ""
        echo "Environment Variables:"
        echo "  FRONTEND_PORT   前端端口 (默认: 50111)"
        echo "  BACKEND_PORT    后端端口 (默认: 50110)"
        echo "  HOT_RELOAD      热加载开关 (默认: false)"
        echo "  PM2_HOME        PM2配置目录"
        ;;
    *)
        main "$@"
        ;;
esac
