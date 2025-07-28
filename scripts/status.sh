#!/bin/bash

# Todo for AI - 系统状态检查脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${BLUE}📊 Todo for AI - 系统状态检查${NC}"
echo "项目根目录: $PROJECT_ROOT"
echo "检查时间: $(date)"
echo ""

# 检查服务状态
check_service_status() {
    echo -e "${CYAN}🔍 服务状态检查${NC}"
    echo "=================================="
    
    # 检查后端服务
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端服务: 运行中 (http://localhost:5000)${NC}"
        
        # 获取后端版本信息
        local backend_info=$(curl -s http://localhost:5000/api/health 2>/dev/null || echo '{}')
        if [ "$backend_info" != '{}' ]; then
            echo "   详情: $backend_info"
        fi
    else
        echo -e "${RED}❌ 后端服务: 未运行${NC}"
    fi
    
    # 检查前端服务
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 前端服务: 运行中 (http://localhost:5173)${NC}"
    else
        echo -e "${RED}❌ 前端服务: 未运行${NC}"
    fi
    
    # 检查 MCP 服务
    if [ -f "$PROJECT_ROOT/.mcp.pid" ]; then
        local mcp_pid=$(cat "$PROJECT_ROOT/.mcp.pid")
        if ps -p $mcp_pid > /dev/null 2>&1; then
            echo -e "${GREEN}✅ MCP服务: 运行中 (PID: $mcp_pid)${NC}"
        else
            echo -e "${RED}❌ MCP服务: PID文件存在但进程未运行${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  MCP服务: 未启动${NC}"
    fi
    
    echo ""
}

# 检查端口占用
check_ports() {
    echo -e "${CYAN}🌐 端口占用检查${NC}"
    echo "=================================="
    
    local ports=(5000 5173 3306)
    local port_names=("后端API" "前端开发服务" "MySQL数据库")
    
    for i in "${!ports[@]}"; do
        local port=${ports[$i]}
        local name=${port_names[$i]}
        
        if lsof -ti:$port > /dev/null 2>&1; then
            local pid=$(lsof -ti:$port)
            local process=$(ps -p $pid -o comm= 2>/dev/null || echo "未知")
            echo -e "${GREEN}✅ 端口 $port ($name): 被占用 - PID: $pid ($process)${NC}"
        else
            echo -e "${RED}❌ 端口 $port ($name): 未被占用${NC}"
        fi
    done
    
    echo ""
}

# 检查数据库连接
check_database() {
    echo -e "${CYAN}🗄️  数据库连接检查${NC}"
    echo "=================================="
    
    cd "$BACKEND_DIR"
    
    if [ -d "venv" ]; then
        source venv/bin/activate
        
        # 检查数据库连接
        python -c "
import sys
sys.path.append('.')
try:
    from app import create_app
    from models import db, Project, Task, ContextRule
    
    app = create_app()
    with app.app_context():
        # 测试数据库连接
        db.engine.execute('SELECT 1')
        
        # 获取统计信息
        project_count = Project.query.count()
        task_count = Task.query.count()
        rule_count = ContextRule.query.count()
        
        print(f'✅ 数据库连接: 正常')
        print(f'   项目数量: {project_count}')
        print(f'   任务数量: {task_count}')
        print(f'   上下文规则: {rule_count}')
        
except Exception as e:
    print(f'❌ 数据库连接: 失败')
    print(f'   错误信息: {e}')
    sys.exit(1)
" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}数据库状态检查完成${NC}"
        else
            echo -e "${RED}数据库状态检查失败${NC}"
        fi
    else
        echo -e "${RED}❌ 后端虚拟环境不存在${NC}"
    fi
    
    echo ""
}

# 检查系统资源
check_system_resources() {
    echo -e "${CYAN}💻 系统资源检查${NC}"
    echo "=================================="
    
    # CPU 使用率
    local cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//' 2>/dev/null || echo "N/A")
    echo -e "CPU 使用率: ${cpu_usage}%"
    
    # 内存使用情况
    local memory_info=$(vm_stat 2>/dev/null | head -4 | tail -3 || echo "内存信息获取失败")
    echo "内存使用情况:"
    echo "$memory_info" | sed 's/^/  /'
    
    # 磁盘空间
    echo "磁盘空间:"
    df -h "$PROJECT_ROOT" | tail -1 | awk '{print "  使用: " $3 "/" $2 " (" $5 ")"}'
    
    echo ""
}

# 检查日志文件
check_logs() {
    echo -e "${CYAN}📋 日志文件检查${NC}"
    echo "=================================="
    
    local log_dir="$PROJECT_ROOT/logs"
    
    if [ -d "$log_dir" ]; then
        echo "日志目录: $log_dir"
        
        local log_files=("backend.log" "frontend.log" "mcp.log")
        
        for log_file in "${log_files[@]}"; do
            local log_path="$log_dir/$log_file"
            if [ -f "$log_path" ]; then
                local size=$(du -h "$log_path" | cut -f1)
                local lines=$(wc -l < "$log_path")
                local modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$log_path" 2>/dev/null || date)
                echo -e "${GREEN}✅ $log_file: $size, $lines 行, 修改时间: $modified${NC}"
                
                # 显示最后几行错误日志
                local errors=$(tail -50 "$log_path" | grep -i "error\|exception\|failed" | tail -3 || true)
                if [ ! -z "$errors" ]; then
                    echo -e "${YELLOW}   最近错误:${NC}"
                    echo "$errors" | sed 's/^/     /'
                fi
            else
                echo -e "${RED}❌ $log_file: 不存在${NC}"
            fi
        done
    else
        echo -e "${YELLOW}⚠️  日志目录不存在: $log_dir${NC}"
    fi
    
    echo ""
}

# 检查依赖版本
check_dependencies() {
    echo -e "${CYAN}📦 依赖版本检查${NC}"
    echo "=================================="
    
    # Node.js 版本
    if command -v node &> /dev/null; then
        echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
    else
        echo -e "${RED}❌ Node.js: 未安装${NC}"
    fi
    
    # Python 版本
    if command -v python3 &> /dev/null; then
        echo -e "${GREEN}✅ Python3: $(python3 --version)${NC}"
    else
        echo -e "${RED}❌ Python3: 未安装${NC}"
    fi
    
    # MySQL 版本
    if command -v mysql &> /dev/null; then
        local mysql_version=$(mysql --version 2>/dev/null | awk '{print $3}' || echo "未知")
        echo -e "${GREEN}✅ MySQL: $mysql_version${NC}"
    else
        echo -e "${YELLOW}⚠️  MySQL 命令行工具: 未安装${NC}"
    fi
    
    # Git 版本
    if command -v git &> /dev/null; then
        echo -e "${GREEN}✅ Git: $(git --version | awk '{print $3}')${NC}"
    else
        echo -e "${YELLOW}⚠️  Git: 未安装${NC}"
    fi
    
    echo ""
}

# 生成状态报告
generate_report() {
    echo -e "${CYAN}📄 状态报告${NC}"
    echo "=================================="
    
    local report_file="$PROJECT_ROOT/system_status_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Todo for AI - 系统状态报告"
        echo "生成时间: $(date)"
        echo "项目路径: $PROJECT_ROOT"
        echo ""
        echo "=== 服务状态 ==="
        curl -s http://localhost:5000/api/health > /dev/null 2>&1 && echo "后端服务: 运行中" || echo "后端服务: 未运行"
        curl -s http://localhost:5173 > /dev/null 2>&1 && echo "前端服务: 运行中" || echo "前端服务: 未运行"
        [ -f "$PROJECT_ROOT/.mcp.pid" ] && echo "MCP服务: 已配置" || echo "MCP服务: 未配置"
        echo ""
        echo "=== 端口占用 ==="
        lsof -ti:5000 > /dev/null 2>&1 && echo "端口 5000: 占用" || echo "端口 5000: 空闲"
        lsof -ti:5173 > /dev/null 2>&1 && echo "端口 5173: 占用" || echo "端口 5173: 空闲"
        lsof -ti:3306 > /dev/null 2>&1 && echo "端口 3306: 占用" || echo "端口 3306: 空闲"
        echo ""
        echo "=== 系统信息 ==="
        echo "操作系统: $(uname -s)"
        echo "架构: $(uname -m)"
        echo "内核版本: $(uname -r)"
        echo ""
        echo "=== 依赖版本 ==="
        command -v node &> /dev/null && echo "Node.js: $(node --version)" || echo "Node.js: 未安装"
        command -v python3 &> /dev/null && echo "Python3: $(python3 --version)" || echo "Python3: 未安装"
        command -v mysql &> /dev/null && echo "MySQL: $(mysql --version | awk '{print $3}')" || echo "MySQL: 未安装"
    } > "$report_file"
    
    echo "状态报告已生成: $report_file"
    echo ""
}

# 主函数
main() {
    check_service_status
    check_ports
    check_database
    check_system_resources
    check_logs
    check_dependencies
    
    if [ "$1" = "--report" ]; then
        generate_report
    fi
    
    echo -e "${GREEN}🎉 系统状态检查完成！${NC}"
    echo ""
    echo -e "${BLUE}💡 使用提示:${NC}"
    echo "  - 启动系统: ./scripts/start_all.sh"
    echo "  - 停止系统: ./scripts/stop_all.sh"
    echo "  - 开发模式: ./scripts/dev.sh"
    echo "  - 生成报告: ./scripts/status.sh --report"
}

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [选项]"
    echo ""
    echo "检查 Todo for AI 系统的运行状态，包括:"
    echo "  - 服务运行状态"
    echo "  - 端口占用情况"
    echo "  - 数据库连接"
    echo "  - 系统资源使用"
    echo "  - 日志文件状态"
    echo "  - 依赖版本信息"
    echo ""
    echo "选项:"
    echo "  --report      生成详细的状态报告文件"
    echo "  --help, -h    显示此帮助信息"
    exit 0
fi

# 运行主函数
main "$1"
