#!/bin/bash

# Todo for AI - 停止所有服务脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}🛑 Todo for AI - 停止所有服务${NC}"

# 停止服务函数
stop_service() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${YELLOW}停止 $service_name (PID: $pid)...${NC}"
            kill $pid
            
            # 等待进程结束
            local count=0
            while ps -p $pid > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                count=$((count + 1))
            done
            
            # 如果进程仍在运行，强制杀死
            if ps -p $pid > /dev/null 2>&1; then
                echo -e "${RED}强制停止 $service_name...${NC}"
                kill -9 $pid 2>/dev/null || true
            fi
            
            echo -e "${GREEN}✅ $service_name 已停止${NC}"
        else
            echo -e "${YELLOW}⚠️  $service_name 进程不存在 (PID: $pid)${NC}"
        fi
        
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}⚠️  $service_name PID 文件不存在${NC}"
    fi
}

# 停止通过端口查找的进程
stop_by_port() {
    local port=$1
    local service_name=$2
    
    local pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}发现 $service_name 进程 (端口 $port, PID: $pid)，正在停止...${NC}"
        kill $pid 2>/dev/null || true
        sleep 2
        
        # 检查是否还在运行
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${RED}强制停止 $service_name...${NC}"
            kill -9 $pid 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✅ $service_name 已停止${NC}"
    fi
}

# 主停止逻辑
main() {
    echo "项目根目录: $PROJECT_ROOT"
    echo ""
    
    # 停止通过 PID 文件记录的服务
    stop_service "后端服务" "$PROJECT_ROOT/.todo-for-ai-api-server.pid"
    stop_service "前端服务" "$PROJECT_ROOT/.todo-for-ai-webpage.pid"
    stop_service "MCP服务" "$PROJECT_ROOT/.todo-for-ai-mcp.pid"
    
    echo ""
    echo -e "${YELLOW}🔍 检查端口占用...${NC}"
    
    # 停止可能遗留的进程
    stop_by_port 5000 "后端服务"
    stop_by_port 5173 "前端服务"
    
    # 停止可能的 Python 进程
    echo -e "${YELLOW}🔍 检查相关 Python 进程...${NC}"
    local python_pids=$(ps aux | grep -E "(app\.py)" | grep -v grep | awk '{print $2}' || true)
    if [ ! -z "$python_pids" ]; then
        echo -e "${YELLOW}发现相关 Python 进程，正在停止...${NC}"
        echo "$python_pids" | xargs kill 2>/dev/null || true
        sleep 2

        # 强制杀死仍在运行的进程
        local remaining_pids=$(ps aux | grep -E "(app\.py)" | grep -v grep | awk '{print $2}' || true)
        if [ ! -z "$remaining_pids" ]; then
            echo -e "${RED}强制停止剩余进程...${NC}"
            echo "$remaining_pids" | xargs kill -9 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✅ Python 进程已清理${NC}"
    fi
    
    # 停止可能的 Node.js 进程
    echo -e "${YELLOW}🔍 检查相关 Node.js 进程...${NC}"
    local node_pids=$(ps aux | grep -E "vite.*dev" | grep -v grep | awk '{print $2}' || true)
    if [ ! -z "$node_pids" ]; then
        echo -e "${YELLOW}发现相关 Node.js 进程，正在停止...${NC}"
        echo "$node_pids" | xargs kill 2>/dev/null || true
        sleep 2
        
        # 强制杀死仍在运行的进程
        local remaining_pids=$(ps aux | grep -E "vite.*dev" | grep -v grep | awk '{print $2}' || true)
        if [ ! -z "$remaining_pids" ]; then
            echo -e "${RED}强制停止剩余进程...${NC}"
            echo "$remaining_pids" | xargs kill -9 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✅ Node.js 进程已清理${NC}"
    fi
    
    # 清理临时文件
    echo -e "${YELLOW}🧹 清理临时文件...${NC}"
    rm -f "$PROJECT_ROOT"/.*.pid
    
    echo ""
    echo -e "${GREEN}🎉 所有服务已停止！${NC}"
    
    # 显示端口状态
    echo ""
    echo -e "${BLUE}📊 端口状态检查:${NC}"
    echo "=================================="
    
    if lsof -ti:5000 > /dev/null 2>&1; then
        echo -e "${RED}❌ 端口 5000 仍被占用${NC}"
    else
        echo -e "${GREEN}✅ 端口 5000 已释放${NC}"
    fi
    
    if lsof -ti:5173 > /dev/null 2>&1; then
        echo -e "${RED}❌ 端口 5173 仍被占用${NC}"
    else
        echo -e "${GREEN}✅ 端口 5173 已释放${NC}"
    fi
    
    echo "=================================="
    echo -e "${BLUE}💡 提示: 使用 './scripts/start_all.sh' 重新启动系统${NC}"
}

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0"
    echo ""
    echo "此脚本会停止所有 Todo for AI 相关的服务:"
    echo "  - 后端 Flask 服务 (端口 5000)"
    echo "  - 前端 Vite 服务 (端口 5173)"
    echo "  - MCP 服务"
    echo ""
    echo "选项:"
    echo "  --help, -h    显示此帮助信息"
    exit 0
fi

# 运行主函数
main
