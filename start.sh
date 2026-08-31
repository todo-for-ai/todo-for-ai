#!/bin/bash
#
# start.sh - Todo for AI 服务启动脚本
#
# 用法:
#   ./start.sh              # 启动所有服务
#   ./start.sh stop         # 停止所有服务
#   ./start.sh restart      # 重启
#   ./start.sh status       # 查看状态
#   ./start.sh logs         # 查看日志
#   ./start.sh --fg         # 前台运行
#
# 注意: 此脚本必须直接运行 (./start.sh)，不要用 pm2 start start.sh

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# PM2 隔离目录 — 与全局 ~/.pm2 完全独立
PM2_HOME="${PROJECT_ROOT}/.todo-for-ai-pm2"
export PM2_HOME

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# 确保目录存在
mkdir -p "${PM2_HOME}" "${PROJECT_ROOT}/logs" "${PROJECT_ROOT}/.pid"

# 服务配置
FRONTEND_DIR="${PROJECT_ROOT}/todo-for-ai-webpage"
BACKEND_DIR="${PROJECT_ROOT}/todo-for-ai-api-server"
BACKEND_VENV="${BACKEND_DIR}/.venv"
BACKEND_PYTHON="${BACKEND_VENV}/bin/python"

FRONTEND_NAME="todo-for-ai-web"
BACKEND_NAME="todo-for-ai-api"

FRONTEND_PORT=${FRONTEND_PORT:-50111}
BACKEND_PORT=${BACKEND_PORT:-50110}

# ============================================================
# 检查 PM2
# ============================================================
check_pm2() {
    if ! command -v pm2 &>/dev/null; then
        log_error "PM2 未安装，请运行: npm install -g pm2"
        exit 1
    fi

    # 确保 PM2 daemon 在我们的隔离目录启动
    # pm2 ping 会启动 daemon (如果未运行)
    pm2 ping &>/dev/null || true
}

# ============================================================
# 检查依赖
# ============================================================
check_dependencies() {
    log_info "检查依赖..."

    # 前端 node_modules
    if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
        log_warn "前端依赖未安装，正在安装..."
        (cd "${FRONTEND_DIR}" && npm install) || {
            log_error "前端依赖安装失败"
            return 1
        }
    fi

    # 后端 venv
    if [ ! -x "${BACKEND_PYTHON}" ]; then
        log_warn "后端虚拟环境不存在，正在创建..."
        python3 -m venv "${BACKEND_VENV}" || {
            log_error "创建虚拟环境失败"
            return 1
        }
    fi

    # 后端关键依赖
    if ! "${BACKEND_PYTHON}" -c "import flask, bleach" &>/dev/null; then
        log_warn "后端依赖未就绪，正在安装..."
        "${BACKEND_PYTHON}" -m pip install -r "${BACKEND_DIR}/requirements.txt" || {
            log_error "后端依赖安装失败"
            return 1
        }
    fi

    log_success "依赖检查通过"
}

# ============================================================
# 清理已有进程
# ============================================================
kill_existing() {
    log_info "清理已有进程..."

    # 通过 PM2 名称删除
    pm2 delete "${FRONTEND_NAME}" &>/dev/null || true
    pm2 delete "${BACKEND_NAME}" &>/dev/null || true

    # 强制释放端口 (兜底)
    local pids
    for port in "${FRONTEND_PORT}" "${BACKEND_PORT}"; do
        pids=$(lsof -ti:${port} 2>/dev/null) || true
        if [ -n "${pids}" ]; then
            log_warn "端口 ${port} 被占用 (pid: ${pids})，正在释放..."
            echo "${pids}" | xargs kill -9 2>/dev/null || true
        fi
    done

    sleep 1
}

# ============================================================
# 启动后端
# ============================================================
start_backend() {
    log_info "启动后端 (端口: ${BACKEND_PORT})..."

    pm2 start "${BACKEND_PYTHON}" \
        --name "${BACKEND_NAME}" \
        --cwd "${BACKEND_DIR}" \
        --restart-delay 3000 \
        --max-restarts 30 \
        --max-memory-restart 500M \
        --time \
        --kill-timeout 8000 \
        --listen-timeout 10000 \
        --log "${PROJECT_ROOT}/logs/backend.log" \
        --error "${PROJECT_ROOT}/logs/backend-error.log" \
        --output "${PROJECT_ROOT}/logs/backend-out.log" \
        --pid "${PROJECT_ROOT}/.pid/backend.pid" \
        --env PORT="${BACKEND_PORT}" \
        -- app.py

    log_success "后端进程已注册"
}

# ============================================================
# 启动前端
# ============================================================
start_frontend() {
    log_info "启动前端 (端口: ${FRONTEND_PORT})..."

    pm2 start npx \
        --name "${FRONTEND_NAME}" \
        --cwd "${FRONTEND_DIR}" \
        --restart-delay 3000 \
        --max-restarts 30 \
        --max-memory-restart 500M \
        --time \
        --kill-timeout 5000 \
        --listen-timeout 10000 \
        --log "${PROJECT_ROOT}/logs/frontend.log" \
        --error "${PROJECT_ROOT}/logs/frontend-error.log" \
        --output "${PROJECT_ROOT}/logs/frontend-out.log" \
        --pid "${PROJECT_ROOT}/.pid/frontend.pid" \
        -- vite --host 0.0.0.0 --port "${FRONTEND_PORT}"

    log_success "前端进程已注册"
}

# ============================================================
# 健康检查
# ============================================================
wait_for_services() {
    log_info "等待服务就绪..."
    local max_attempts=40
    local attempt=1
    local backend_ok=false
    local frontend_ok=false

    while [ "${attempt}" -le "${max_attempts}" ]; do
        if [ "${backend_ok}" = "false" ]; then
            if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/todo-for-ai/api/v1/health" >/dev/null 2>&1; then
                backend_ok=true
                log_success "后端就绪 (attempt=${attempt})"
            fi
        fi

        if [ "${frontend_ok}" = "false" ]; then
            if curl -fsS "http://127.0.0.1:${FRONTEND_PORT}/" >/dev/null 2>&1; then
                frontend_ok=true
                log_success "前端就绪 (attempt=${attempt})"
            fi
        fi

        if [ "${backend_ok}" = "true" ] && [ "${frontend_ok}" = "true" ]; then
            log_success "所有服务就绪!"
            return 0
        fi

        sleep 1
        attempt=$((attempt + 1))
    done

    log_error "健康检查超时!"
    echo ""
    echo "=== 后端日志 (最近 30 行) ==="
    pm2 logs "${BACKEND_NAME}" --lines 30 --nostream 2>/dev/null || true
    echo ""
    echo "=== 前端日志 (最近 30 行) ==="
    pm2 logs "${FRONTEND_NAME}" --lines 30 --nostream 2>/dev/null || true
    return 1
}

# ============================================================
# 显示状态
# ============================================================
show_status() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Todo for AI${NC}"
    echo "=========================================="
    pm2 list
    echo ""
    echo -e "  前端: ${BLUE}http://localhost:${FRONTEND_PORT}${NC}"
    echo -e "  后端: ${BLUE}http://localhost:${BACKEND_PORT}${NC}"
    echo ""
    echo "  日志:  ./start.sh logs"
    echo "  停止:  ./start.sh stop"
    echo "  重启:  ./start.sh restart"
    echo "  状态:  ./start.sh status"
    echo ""
}

# ============================================================
# 信号处理
# ============================================================
cleanup() {
    log_warn "收到终止信号..."
    pm2 stop all &>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# ============================================================
# 主入口
# ============================================================
case "${1:-}" in
    stop)
        log_info "停止服务..."
        pm2 stop all || true
        pm2 save --force || true
        log_success "服务已停止"
        ;;
    restart)
        log_info "重启服务..."
        pm2 restart all || true
        pm2 save --force || true
        log_success "服务已重启"
        show_status
        ;;
    delete|kill)
        log_info "删除所有进程..."
        pm2 delete all || true
        pm2 save --force || true
        log_success "进程已清理"
        ;;
    logs)
        pm2 logs
        ;;
    status)
        pm2 list
        ;;
    frontend|fe)
        pm2 logs "${FRONTEND_NAME}"
        ;;
    backend|be)
        pm2 logs "${BACKEND_NAME}"
        ;;
    --help|-h)
        echo "Usage: ./start.sh [command]"
        echo ""
        echo "Commands:"
        echo "  (空)     启动所有服务"
        echo "  stop     停止"
        echo "  restart  重启"
        echo "  delete   删除所有 PM2 进程"
        echo "  logs     查看日志"
        echo "  status   查看状态"
        echo "  fe       前端日志"
        echo "  be       后端日志"
        echo "  --fg     前台运行"
        echo ""
        echo "Environment:"
        echo "  FRONTEND_PORT  前端端口 (默认: 50111)"
        echo "  BACKEND_PORT   后端端口 (默认: 50110)"
        echo "  PM2_HOME       PM2 隔离目录"
        ;;
    *)
        echo "=========================================="
        echo -e "${GREEN}Todo for AI - 启动服务${NC}"
        echo "=========================================="
        echo ""

        check_pm2
        check_dependencies
        kill_existing
        start_backend
        start_frontend
        wait_for_services
        pm2 save --force || true
        show_status

        if [ "${1:-}" = "--fg" ]; then
            log_info "前台模式，Ctrl+C 停止..."
            pm2 logs
        fi
        ;;
esac
