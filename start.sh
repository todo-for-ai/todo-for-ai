#!/bin/bash

# Todo for AI - 一键启动脚本
# 自动杀死之前的实例并启动前后端服务

set -e

# 检查是否在Service模式下运行
if [ "${TODOFORAI_SERVICE_MODE}" = "daemon" ]; then
    echo "检测到Service模式，使用专用启动脚本..."
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    exec "$SCRIPT_DIR/start-service.sh" "$@"
fi

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/todo-for-ai-api-server"
FRONTEND_DIR="$PROJECT_ROOT/todo-for-ai-webpage"

# 端口配置
BACKEND_PORT=50110
FRONTEND_PORT=50111
PREVIEW_PORT=50112

echo -e "${BLUE}🚀 Todo for AI - 一键启动脚本${NC}"
echo "项目根目录: $PROJECT_ROOT"
echo "后端端口: $BACKEND_PORT"
echo "前端端口: $FRONTEND_PORT"
echo "预览端口: $PREVIEW_PORT"
echo ""

# 杀死之前的进程
kill_previous_processes() {
    echo -e "${YELLOW}🔪 杀死之前的进程...${NC}"
    
    # 杀死占用端口的进程
    local ports=($BACKEND_PORT $FRONTEND_PORT $PREVIEW_PORT)
    
    for port in "${ports[@]}"; do
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            echo "  杀死端口 $port 上的进程: $pids"
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    done
    
    # 杀死可能的Python和Node进程
    echo "  杀死相关的Python进程..."
    pkill -f "python.*app.py" 2>/dev/null || true
    pkill -f "python.*simple_mcp_server.py" 2>/dev/null || true
    
    echo "  杀死相关的Node进程..."
    pkill -f "vite.*dev" 2>/dev/null || true
    pkill -f "node.*vite" 2>/dev/null || true
    
    # 等待进程完全退出
    sleep 2
    
    echo -e "${GREEN}✅ 进程清理完成${NC}"
}

# 检查依赖
check_dependencies() {
    echo -e "${YELLOW}📋 检查依赖...${NC}"
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    
    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python3 未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Python3: $(python3 --version)${NC}"
    
    # 检查 MySQL
    if ! command -v mysql &> /dev/null; then
        echo -e "${YELLOW}⚠️  MySQL 命令行工具未找到，请确保 MySQL 服务正在运行${NC}"
    else
        echo -e "${GREEN}✅ MySQL 命令行工具已安装${NC}"
    fi
}

# 初始化后端
init_backend() {
    echo -e "${CYAN}🔧 初始化后端环境...${NC}"
    cd "$BACKEND_DIR"
    
    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        echo "创建 Python 虚拟环境..."
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 安装依赖
    echo "检查 Python 依赖..."
    if ! pip install -r requirements.txt; then
        echo -e "${RED}❌ Python依赖安装失败${NC}"
        exit 1
    fi
    
    # 检查数据库连接
    echo "跳过数据库检查（将在启动时自动创建表）..."
    
    echo -e "${GREEN}✅ 后端环境初始化完成${NC}"
}

# 初始化前端
init_frontend() {
    echo -e "${CYAN}🎨 初始化前端环境...${NC}"
    cd "$FRONTEND_DIR"
    
    # 检查依赖
    if [ ! -d "node_modules" ]; then
        echo "安装前端依赖..."
        if ! npm install; then
            echo -e "${RED}❌ 前端依赖安装失败${NC}"
            exit 1
        fi
    else
        echo "前端依赖已安装，跳过..."
    fi
    
    echo -e "${GREEN}✅ 前端环境初始化完成${NC}"
}

# 启动后端服务
start_backend() {
    echo -e "${CYAN}🔧 启动后端服务...${NC}"
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    # 设置环境变量
    export PORT=$BACKEND_PORT
    export HOST=0.0.0.0
    export FLASK_ENV=development
    export FLASK_DEBUG=1
    
    # 后台启动
    nohup python app.py > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    
    # 保存PID
    echo $BACKEND_PID > "$PROJECT_ROOT/.backend.pid"
    
    echo "后端服务 PID: $BACKEND_PID"
    
    # 等待服务启动
    echo "等待后端服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 后端服务启动成功 (http://localhost:$BACKEND_PORT)${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}❌ 后端服务启动失败${NC}"
    return 1
}

# 启动前端服务
start_frontend() {
    echo -e "${CYAN}🎨 启动前端服务...${NC}"
    cd "$FRONTEND_DIR"
    
    # 后台启动
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    # 保存PID
    echo $FRONTEND_PID > "$PROJECT_ROOT/.frontend.pid"
    
    echo "前端服务 PID: $FRONTEND_PID"
    
    # 等待服务启动
    echo "等待前端服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 前端服务启动成功 (http://localhost:$FRONTEND_PORT)${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${YELLOW}⚠️  前端服务可能还在启动中...${NC}"
    return 0
}

# 显示服务状态
show_status() {
    echo ""
    echo -e "${BLUE}📊 服务状态:${NC}"
    echo "=================================="
    echo -e "${GREEN}🌐 前端服务: http://localhost:$FRONTEND_PORT${NC}"
    echo -e "${GREEN}🔧 后端API: http://localhost:$BACKEND_PORT${NC}"
    echo -e "${GREEN}📚 API文档: http://localhost:$BACKEND_PORT/api/docs${NC}"
    echo -e "${GREEN}🏥 健康检查: http://localhost:$BACKEND_PORT/health${NC}"
    echo "=================================="
    echo -e "${YELLOW}📝 日志文件:${NC}"
    echo "  后端日志: $PROJECT_ROOT/logs/backend.log"
    echo "  前端日志: $PROJECT_ROOT/logs/frontend.log"
    echo "=================================="
    echo -e "${BLUE}💡 使用提示:${NC}"
    echo "  - 查看后端日志: tail -f logs/backend.log"
    echo "  - 查看前端日志: tail -f logs/frontend.log"
    echo "  - 停止服务: ./scripts/stop_all.sh"
    echo "  - 检查状态: ./scripts/status.sh"
    echo "=================================="
}

# 主函数
main() {
    # 创建日志目录
    mkdir -p "$PROJECT_ROOT/logs"
    
    # 执行启动流程
    kill_previous_processes
    check_dependencies
    init_backend
    init_frontend
    
    if start_backend && start_frontend; then
        echo ""
        echo -e "${GREEN}🎉 系统启动完成！${NC}"
        show_status

        # 直接显示实时日志
        echo ""
        echo -e "${BLUE}📋 实时日志 (Ctrl+C 退出):${NC}"
        tail -f "$PROJECT_ROOT/logs/backend.log" "$PROJECT_ROOT/logs/frontend.log" 2>/dev/null || true
    else
        echo -e "${RED}❌ 系统启动失败${NC}"
        exit 1
    fi
}

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}🛑 正在停止服务...${NC}"
    
    # 停止服务
    if [ -f "$PROJECT_ROOT/.backend.pid" ]; then
        kill $(cat "$PROJECT_ROOT/.backend.pid") 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.backend.pid"
    fi
    
    if [ -f "$PROJECT_ROOT/.frontend.pid" ]; then
        kill $(cat "$PROJECT_ROOT/.frontend.pid") 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.frontend.pid"
    fi
    
    echo -e "${GREEN}✅ 服务已停止${NC}"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [选项]"
    echo ""
    echo "Todo for AI 一键启动脚本"
    echo ""
    echo "选项:"
    echo "  --help, -h    显示此帮助信息"
    echo ""
    echo "功能:"
    echo "  - 自动杀死之前的进程实例"
    echo "  - 检查和安装依赖"
    echo "  - 启动后端服务 (端口 $BACKEND_PORT)"
    echo "  - 启动前端服务 (端口 $FRONTEND_PORT)"
    echo "  - 显示服务状态和日志"
    exit 0
fi

# 运行主函数
main
