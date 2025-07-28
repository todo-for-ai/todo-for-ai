#!/bin/bash

# Todo for AI - 一键启动脚本
# 启动前端、后端和MCP服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${BLUE}🚀 Todo for AI - 系统启动中...${NC}"
echo "项目根目录: $PROJECT_ROOT"

# 检查依赖
check_dependencies() {
    echo -e "${YELLOW}📋 检查系统依赖...${NC}"
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js 未安装，请先安装 Node.js${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    
    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python3 未安装，请先安装 Python3${NC}"
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
    echo -e "${YELLOW}🔧 初始化后端环境...${NC}"
    cd "$BACKEND_DIR"
    
    # 创建虚拟环境（如果不存在）
    if [ ! -d "venv" ]; then
        echo "创建 Python 虚拟环境..."
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 安装依赖
    echo "安装 Python 依赖..."
    pip install -r requirements.txt
    
    # 检查数据库连接
    echo "检查数据库连接..."
    python -c "
from app import create_app
from models import db
try:
    app = create_app()
    with app.app_context():
        db.create_all()
    print('✅ 数据库连接成功')
except Exception as e:
    print(f'❌ 数据库连接失败: {e}')
    print('请确保 MySQL 服务正在运行，并且数据库配置正确')
    exit(1)
"
    
    echo -e "${GREEN}✅ 后端环境初始化完成${NC}"
}

# 初始化前端
init_frontend() {
    echo -e "${YELLOW}🔧 初始化前端环境...${NC}"
    cd "$FRONTEND_DIR"
    
    # 安装依赖
    if [ ! -d "node_modules" ]; then
        echo "安装前端依赖..."
        npm install
    else
        echo "前端依赖已安装，跳过..."
    fi
    
    echo -e "${GREEN}✅ 前端环境初始化完成${NC}"
}

# 启动服务
start_services() {
    echo -e "${YELLOW}🚀 启动服务...${NC}"
    
    # 创建日志目录
    mkdir -p "$PROJECT_ROOT/logs"
    
    # 启动后端服务
    echo "启动后端服务..."
    cd "$BACKEND_DIR"
    source venv/bin/activate
    nohup python app.py > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo "后端服务 PID: $BACKEND_PID"
    
    # 等待后端启动
    sleep 3
    
    # 检查后端是否启动成功
    if curl -s http://localhost:5000/api/health > /dev/null; then
        echo -e "${GREEN}✅ 后端服务启动成功 (http://localhost:5000)${NC}"
    else
        echo -e "${RED}❌ 后端服务启动失败${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # 启动前端服务
    echo "启动前端服务..."
    cd "$FRONTEND_DIR"
    nohup npm run dev > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo "前端服务 PID: $FRONTEND_PID"
    
    # 等待前端启动
    sleep 5
    
    # 检查前端是否启动成功
    if curl -s http://localhost:5173 > /dev/null; then
        echo -e "${GREEN}✅ 前端服务启动成功 (http://localhost:5173)${NC}"
    else
        echo -e "${YELLOW}⚠️  前端服务可能还在启动中...${NC}"
    fi
    
    # 启动 MCP 服务（可选）
    if [ "$1" = "--with-mcp" ]; then
        echo "启动 MCP 服务..."
        cd "$BACKEND_DIR"
        source venv/bin/activate
        nohup python simple_mcp_server.py > "$PROJECT_ROOT/logs/mcp.log" 2>&1 &
        MCP_PID=$!
        echo "MCP 服务 PID: $MCP_PID"
        echo -e "${GREEN}✅ MCP 服务启动成功${NC}"
    fi
    
    # 保存 PID 到文件
    echo "$BACKEND_PID" > "$PROJECT_ROOT/.backend.pid"
    echo "$FRONTEND_PID" > "$PROJECT_ROOT/.frontend.pid"
    if [ ! -z "$MCP_PID" ]; then
        echo "$MCP_PID" > "$PROJECT_ROOT/.mcp.pid"
    fi
}

# 显示服务状态
show_status() {
    echo -e "${BLUE}📊 服务状态:${NC}"
    echo "=================================="
    echo -e "${GREEN}🌐 前端服务: http://localhost:5173${NC}"
    echo -e "${GREEN}🔧 后端API: http://localhost:5000${NC}"
    echo -e "${GREEN}📚 API文档: http://localhost:5000/api/docs${NC}"
    
    if [ -f "$PROJECT_ROOT/.mcp.pid" ]; then
        echo -e "${GREEN}🤖 MCP服务: 已启动${NC}"
    fi
    
    echo "=================================="
    echo -e "${YELLOW}📝 日志文件:${NC}"
    echo "  后端日志: $PROJECT_ROOT/logs/backend.log"
    echo "  前端日志: $PROJECT_ROOT/logs/frontend.log"
    if [ -f "$PROJECT_ROOT/.mcp.pid" ]; then
        echo "  MCP日志: $PROJECT_ROOT/logs/mcp.log"
    fi
    echo "=================================="
    echo -e "${BLUE}💡 使用提示:${NC}"
    echo "  - 使用 './scripts/stop_all.sh' 停止所有服务"
    echo "  - 使用 './scripts/dev.sh' 进入开发模式"
    echo "  - 查看日志: tail -f logs/backend.log"
    echo "=================================="
}

# 主函数
main() {
    echo -e "${BLUE}Todo for AI - 完整任务管理系统${NC}"
    echo "版本: 1.0.0"
    echo "作者: AI Assistant"
    echo ""
    
    check_dependencies
    init_backend
    init_frontend
    start_services "$1"
    
    echo ""
    echo -e "${GREEN}🎉 系统启动完成！${NC}"
    echo ""
    show_status
    
    # 等待用户输入
    echo ""
    echo -e "${YELLOW}按 Ctrl+C 停止所有服务，或按 Enter 查看实时日志...${NC}"
    read -r
    
    # 显示实时日志
    echo -e "${BLUE}📋 实时日志 (Ctrl+C 退出):${NC}"
    tail -f "$PROJECT_ROOT/logs/backend.log" "$PROJECT_ROOT/logs/frontend.log" 2>/dev/null || true
}

# 处理中断信号
cleanup() {
    echo -e "\n${YELLOW}🛑 正在停止服务...${NC}"
    
    # 停止所有服务
    if [ -f "$PROJECT_ROOT/.backend.pid" ]; then
        kill $(cat "$PROJECT_ROOT/.backend.pid") 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.backend.pid"
    fi
    
    if [ -f "$PROJECT_ROOT/.frontend.pid" ]; then
        kill $(cat "$PROJECT_ROOT/.frontend.pid") 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.frontend.pid"
    fi
    
    if [ -f "$PROJECT_ROOT/.mcp.pid" ]; then
        kill $(cat "$PROJECT_ROOT/.mcp.pid") 2>/dev/null || true
        rm -f "$PROJECT_ROOT/.mcp.pid"
    fi
    
    echo -e "${GREEN}✅ 所有服务已停止${NC}"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --with-mcp    同时启动 MCP 服务"
    echo "  --help, -h    显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0              # 启动前端和后端"
    echo "  $0 --with-mcp   # 启动前端、后端和MCP服务"
    exit 0
fi

# 运行主函数
main "$1"
