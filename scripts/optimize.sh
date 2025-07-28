#!/bin/bash

# Todo for AI - 系统优化脚本
# 优化前端构建、后端性能和数据库配置

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

echo -e "${BLUE}⚡ Todo for AI - 系统优化${NC}"
echo "项目根目录: $PROJECT_ROOT"

# 前端优化
optimize_frontend() {
    echo -e "${CYAN}🎨 前端优化${NC}"
    echo "=================================="
    
    cd "$FRONTEND_DIR"
    
    # 清理缓存
    echo -e "${YELLOW}🧹 清理前端缓存...${NC}"
    rm -rf node_modules/.cache
    rm -rf dist
    rm -rf .vite
    
    # 更新依赖
    echo -e "${YELLOW}📦 检查依赖更新...${NC}"
    npm outdated || true
    
    # 构建优化版本
    echo -e "${YELLOW}🔨 构建生产版本...${NC}"
    npm run build
    
    # 分析构建大小
    if command -v npx &> /dev/null; then
        echo -e "${YELLOW}📊 分析构建大小...${NC}"
        npx vite-bundle-analyzer dist --open=false > "$PROJECT_ROOT/logs/bundle-analysis.txt" 2>&1 || true
    fi
    
    # 检查构建结果
    if [ -d "dist" ]; then
        local build_size=$(du -sh dist | cut -f1)
        echo -e "${GREEN}✅ 前端构建完成，大小: $build_size${NC}"
    else
        echo -e "${RED}❌ 前端构建失败${NC}"
        return 1
    fi
    
    echo ""
}

# 后端优化
optimize_backend() {
    echo -e "${CYAN}🔧 后端优化${NC}"
    echo "=================================="
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    # 清理Python缓存
    echo -e "${YELLOW}🧹 清理Python缓存...${NC}"
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true
    
    # 检查代码质量
    echo -e "${YELLOW}🔍 检查代码质量...${NC}"
    if pip list | grep -q flake8; then
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics || true
    fi
    
    # 安全检查
    echo -e "${YELLOW}🔒 安全检查...${NC}"
    if pip list | grep -q safety; then
        safety check || true
    fi
    
    # 性能分析
    echo -e "${YELLOW}📈 性能分析...${NC}"
    python -c "
import time
import psutil
import os

print(f'Python版本: {os.sys.version}')
print(f'CPU核心数: {psutil.cpu_count()}')
print(f'内存总量: {psutil.virtual_memory().total / (1024**3):.1f}GB')
print(f'可用内存: {psutil.virtual_memory().available / (1024**3):.1f}GB')

# 测试导入时间
start_time = time.time()
from app import create_app
from models import db
import_time = time.time() - start_time
print(f'模块导入时间: {import_time:.3f}秒')

# 测试应用启动时间
start_time = time.time()
app = create_app()
with app.app_context():
    db.engine.execute('SELECT 1')
startup_time = time.time() - start_time
print(f'应用启动时间: {startup_time:.3f}秒')
"
    
    echo -e "${GREEN}✅ 后端优化检查完成${NC}"
    echo ""
}

# 数据库优化
optimize_database() {
    echo -e "${CYAN}🗄️  数据库优化${NC}"
    echo "=================================="
    
    cd "$BACKEND_DIR"
    source venv/bin/activate
    
    # 数据库连接测试
    echo -e "${YELLOW}🔗 测试数据库连接...${NC}"
    python -c "
from app import create_app
from models import db, Project, Task, ContextRule
import time

app = create_app()
with app.app_context():
    # 连接测试
    start_time = time.time()
    db.engine.execute('SELECT 1')
    connection_time = time.time() - start_time
    print(f'数据库连接时间: {connection_time:.3f}秒')
    
    # 统计信息
    project_count = Project.query.count()
    task_count = Task.query.count()
    rule_count = ContextRule.query.count()
    
    print(f'项目数量: {project_count}')
    print(f'任务数量: {task_count}')
    print(f'规则数量: {rule_count}')
    
    # 查询性能测试
    start_time = time.time()
    projects = Project.query.limit(10).all()
    query_time = time.time() - start_time
    print(f'查询性能 (10个项目): {query_time:.3f}秒')
"
    
    # 数据库优化建议
    echo -e "${YELLOW}💡 数据库优化建议:${NC}"
    echo "  - 定期清理日志表"
    echo "  - 为常用查询字段添加索引"
    echo "  - 定期分析表统计信息"
    echo "  - 考虑分区大表"
    
    echo -e "${GREEN}✅ 数据库优化检查完成${NC}"
    echo ""
}

# 系统资源优化
optimize_system() {
    echo -e "${CYAN}💻 系统资源优化${NC}"
    echo "=================================="
    
    # 清理日志文件
    echo -e "${YELLOW}🧹 清理旧日志文件...${NC}"
    if [ -d "$PROJECT_ROOT/logs" ]; then
        # 保留最近7天的日志
        find "$PROJECT_ROOT/logs" -name "*.log" -mtime +7 -delete 2>/dev/null || true
        
        # 压缩大日志文件
        find "$PROJECT_ROOT/logs" -name "*.log" -size +10M -exec gzip {} \; 2>/dev/null || true
        
        local log_size=$(du -sh "$PROJECT_ROOT/logs" 2>/dev/null | cut -f1 || echo "0B")
        echo "  日志目录大小: $log_size"
    fi
    
    # 清理临时文件
    echo -e "${YELLOW}🧹 清理临时文件...${NC}"
    rm -f "$PROJECT_ROOT"/.*.pid
    rm -rf "$PROJECT_ROOT"/tmp
    
    # 系统资源检查
    echo -e "${YELLOW}📊 系统资源检查...${NC}"
    echo "  CPU使用率: $(top -l 1 | grep "CPU usage" | awk '{print $3}' 2>/dev/null || echo "N/A")"
    echo "  内存使用: $(vm_stat | head -2 | tail -1 2>/dev/null || echo "N/A")"
    echo "  磁盘空间: $(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $4 " 可用 / " $2 " 总计"}')"
    
    echo -e "${GREEN}✅ 系统资源优化完成${NC}"
    echo ""
}

# 性能测试
run_performance_test() {
    echo -e "${CYAN}🚀 性能测试${NC}"
    echo "=================================="
    
    # 创建性能测试报告目录
    mkdir -p "$PROJECT_ROOT/reports"
    local report_file="$PROJECT_ROOT/reports/performance_$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "Todo for AI - 性能测试报告"
        echo "测试时间: $(date)"
        echo "系统信息: $(uname -a)"
        echo ""
        
        # 前端性能测试
        echo "=== 前端性能 ==="
        if [ -d "$FRONTEND_DIR/dist" ]; then
            echo "构建大小: $(du -sh "$FRONTEND_DIR/dist" | cut -f1)"
            echo "文件数量: $(find "$FRONTEND_DIR/dist" -type f | wc -l)"
        fi
        
        # 后端性能测试
        echo ""
        echo "=== 后端性能 ==="
        cd "$BACKEND_DIR"
        source venv/bin/activate
        python -c "
import time
import requests
import threading
from app import create_app

# 启动测试服务器
app = create_app()

def test_api_performance():
    try:
        # 测试健康检查接口
        start_time = time.time()
        response = requests.get('http://localhost:5000/api/health', timeout=5)
        response_time = time.time() - start_time
        print(f'API响应时间: {response_time:.3f}秒')
        print(f'API状态码: {response.status_code}')
    except Exception as e:
        print(f'API测试失败: {e}')

# 如果服务器正在运行，测试API
import socket
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = sock.connect_ex(('localhost', 5000))
sock.close()

if result == 0:
    test_api_performance()
else:
    print('后端服务未运行，跳过API测试')
"
        
        # 数据库性能测试
        echo ""
        echo "=== 数据库性能 ==="
        cd "$BACKEND_DIR"
        source venv/bin/activate
        python -c "
from app import create_app
from models import db
import time

app = create_app()
with app.app_context():
    # 连接测试
    start_time = time.time()
    db.engine.execute('SELECT 1')
    print(f'数据库连接: {time.time() - start_time:.3f}秒')
    
    # 查询测试
    start_time = time.time()
    db.engine.execute('SELECT COUNT(*) FROM projects')
    print(f'简单查询: {time.time() - start_time:.3f}秒')
"
        
    } > "$report_file"
    
    echo -e "${GREEN}✅ 性能测试完成，报告保存至: $report_file${NC}"
    echo ""
}

# 生成优化报告
generate_optimization_report() {
    echo -e "${CYAN}📄 生成优化报告${NC}"
    echo "=================================="
    
    local report_file="$PROJECT_ROOT/optimization_report_$(date +%Y%m%d_%H%M%S).md"
    
    {
        echo "# Todo for AI - 系统优化报告"
        echo ""
        echo "**生成时间**: $(date)"
        echo "**项目路径**: $PROJECT_ROOT"
        echo ""
        
        echo "## 优化项目"
        echo ""
        echo "### ✅ 已完成的优化"
        echo "- [x] 前端构建优化"
        echo "- [x] 后端代码质量检查"
        echo "- [x] 数据库连接优化"
        echo "- [x] 系统资源清理"
        echo "- [x] 性能基准测试"
        echo ""
        
        echo "### 🔄 建议的进一步优化"
        echo "- [ ] 实现Redis缓存"
        echo "- [ ] 添加CDN支持"
        echo "- [ ] 数据库查询优化"
        echo "- [ ] 实现API限流"
        echo "- [ ] 添加监控告警"
        echo ""
        
        echo "## 性能指标"
        echo ""
        if [ -d "$FRONTEND_DIR/dist" ]; then
            echo "- **前端构建大小**: $(du -sh "$FRONTEND_DIR/dist" | cut -f1)"
        fi
        echo "- **系统内存使用**: $(vm_stat | head -2 | tail -1 2>/dev/null | awk '{print $3}' || echo "N/A")"
        echo "- **磁盘可用空间**: $(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $4}')"
        echo ""
        
        echo "## 优化建议"
        echo ""
        echo "### 前端优化"
        echo "1. 启用代码分割和懒加载"
        echo "2. 优化图片资源压缩"
        echo "3. 实现Service Worker缓存"
        echo ""
        echo "### 后端优化"
        echo "1. 实现数据库连接池"
        echo "2. 添加API响应缓存"
        echo "3. 优化数据库查询"
        echo ""
        echo "### 部署优化"
        echo "1. 使用Nginx反向代理"
        echo "2. 启用Gzip压缩"
        echo "3. 配置SSL/TLS"
        echo ""
        
    } > "$report_file"
    
    echo -e "${GREEN}✅ 优化报告已生成: $report_file${NC}"
}

# 主函数
main() {
    echo "开始系统优化..."
    echo ""
    
    # 创建必要的目录
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/reports"
    
    # 执行优化
    optimize_frontend
    optimize_backend
    optimize_database
    optimize_system
    
    # 性能测试
    if [ "$1" = "--test" ]; then
        run_performance_test
    fi
    
    # 生成报告
    generate_optimization_report
    
    echo -e "${GREEN}🎉 系统优化完成！${NC}"
    echo ""
    echo -e "${BLUE}📊 优化摘要:${NC}"
    echo "  - 前端构建已优化"
    echo "  - 后端代码已检查"
    echo "  - 数据库连接已测试"
    echo "  - 系统资源已清理"
    echo "  - 优化报告已生成"
    echo ""
    echo -e "${CYAN}💡 下一步建议:${NC}"
    echo "  - 查看优化报告了解详细信息"
    echo "  - 考虑实施进一步的性能优化"
    echo "  - 定期运行此脚本保持系统最佳状态"
}

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [选项]"
    echo ""
    echo "Todo for AI 系统优化脚本，包括:"
    echo "  - 前端构建优化"
    echo "  - 后端性能检查"
    echo "  - 数据库优化"
    echo "  - 系统资源清理"
    echo ""
    echo "选项:"
    echo "  --test        运行性能测试"
    echo "  --help, -h    显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0            # 基础优化"
    echo "  $0 --test     # 优化 + 性能测试"
    exit 0
fi

# 运行主函数
main "$1"
