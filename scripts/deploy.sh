#!/bin/bash

# Todo for AI - 部署脚本

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

echo -e "${BLUE}🚀 Todo for AI - 部署脚本${NC}"
echo "项目根目录: $PROJECT_ROOT"

# 检查部署环境
check_deployment_env() {
    echo -e "${CYAN}🔍 检查部署环境${NC}"
    echo "=================================="
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose 未安装${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Docker Compose: $(docker-compose --version)${NC}"
    
    # 检查必要文件
    local required_files=(
        "docker-compose.yml"
        "backend/Dockerfile"
        "frontend/Dockerfile"
        "backend/requirements.txt"
        "frontend/package.json"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$PROJECT_ROOT/$file" ]; then
            echo -e "${RED}❌ 缺少必要文件: $file${NC}"
            exit 1
        fi
    done
    echo -e "${GREEN}✅ 所有必要文件存在${NC}"
    
    echo ""
}

# 构建镜像
build_images() {
    echo -e "${CYAN}🔨 构建 Docker 镜像${NC}"
    echo "=================================="
    
    cd "$PROJECT_ROOT"
    
    # 构建所有服务
    echo -e "${YELLOW}构建所有服务镜像...${NC}"
    docker-compose build --no-cache
    
    # 检查构建结果
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 镜像构建成功${NC}"
    else
        echo -e "${RED}❌ 镜像构建失败${NC}"
        exit 1
    fi
    
    echo ""
}

# 部署服务
deploy_services() {
    echo -e "${CYAN}🚀 部署服务${NC}"
    echo "=================================="
    
    cd "$PROJECT_ROOT"
    
    # 停止现有服务
    echo -e "${YELLOW}停止现有服务...${NC}"
    docker-compose down --remove-orphans
    
    # 启动服务
    echo -e "${YELLOW}启动服务...${NC}"
    docker-compose up -d
    
    # 等待服务启动
    echo -e "${YELLOW}等待服务启动...${NC}"
    sleep 30
    
    # 检查服务状态
    echo -e "${YELLOW}检查服务状态...${NC}"
    docker-compose ps
    
    echo ""
}

# 健康检查
health_check() {
    echo -e "${CYAN}🏥 健康检查${NC}"
    echo "=================================="
    
    local max_attempts=10
    local attempt=1
    
    # 检查后端服务
    echo -e "${YELLOW}检查后端服务...${NC}"
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:5000/api/health > /dev/null; then
            echo -e "${GREEN}✅ 后端服务健康${NC}"
            break
        else
            echo "  尝试 $attempt/$max_attempts - 等待后端服务启动..."
            sleep 5
            attempt=$((attempt + 1))
        fi
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo -e "${RED}❌ 后端服务健康检查失败${NC}"
        return 1
    fi
    
    # 检查前端服务
    echo -e "${YELLOW}检查前端服务...${NC}"
    if curl -s http://localhost:3000 > /dev/null; then
        echo -e "${GREEN}✅ 前端服务健康${NC}"
    else
        echo -e "${RED}❌ 前端服务健康检查失败${NC}"
        return 1
    fi
    
    # 检查数据库连接
    echo -e "${YELLOW}检查数据库连接...${NC}"
    if docker-compose exec -T mysql mysqladmin ping -h localhost --silent; then
        echo -e "${GREEN}✅ 数据库连接正常${NC}"
    else
        echo -e "${RED}❌ 数据库连接失败${NC}"
        return 1
    fi
    
    echo ""
}

# 数据库初始化
init_database() {
    echo -e "${CYAN}🗄️  数据库初始化${NC}"
    echo "=================================="
    
    # 等待数据库启动
    echo -e "${YELLOW}等待数据库启动...${NC}"
    sleep 10
    
    # 运行数据库迁移
    echo -e "${YELLOW}运行数据库迁移...${NC}"
    docker-compose exec backend python -c "
from app import create_app
from models import db
app = create_app()
with app.app_context():
    db.create_all()
    print('数据库表创建完成')
"
    
    # 插入初始数据
    echo -e "${YELLOW}插入初始数据...${NC}"
    docker-compose exec backend python -c "
from app import create_app
from models import db, Project, ContextRule
from datetime import datetime

app = create_app()
with app.app_context():
    # 检查是否已有数据
    if Project.query.count() == 0:
        # 创建示例项目
        project = Project(
            name='示例项目',
            description='这是一个示例项目，展示系统功能',
            color='#1890ff',
            created_by='system'
        )
        db.session.add(project)
        
        # 创建全局上下文规则
        global_rule = ContextRule(
            name='全局执行规则',
            description='适用于所有项目的全局规则',
            content='# 全局执行规则\n\n## 基本原则\n- 保持代码简洁\n- 注重用户体验\n- 确保数据安全',
            rule_type='global',
            priority=100,
            is_active=True,
            created_by='system'
        )
        db.session.add(global_rule)
        
        db.session.commit()
        print('初始数据插入完成')
    else:
        print('数据库已有数据，跳过初始化')
"
    
    echo -e "${GREEN}✅ 数据库初始化完成${NC}"
    echo ""
}

# 显示部署信息
show_deployment_info() {
    echo -e "${CYAN}📊 部署信息${NC}"
    echo "=================================="
    echo -e "${GREEN}🌐 服务地址:${NC}"
    echo "  前端应用: http://localhost:3000"
    echo "  后端API: http://localhost:5000"
    echo "  API文档: http://localhost:5000/api/docs"
    echo "  MCP服务: http://localhost:8080"
    echo ""
    echo -e "${GREEN}🗄️  数据库:${NC}"
    echo "  MySQL: localhost:3306"
    echo "  数据库名: todo_for_ai"
    echo "  用户名: todo_user"
    echo ""
    echo -e "${GREEN}📋 管理命令:${NC}"
    echo "  查看日志: docker-compose logs -f [service]"
    echo "  重启服务: docker-compose restart [service]"
    echo "  停止服务: docker-compose down"
    echo "  查看状态: docker-compose ps"
    echo ""
    echo -e "${GREEN}🔧 开发命令:${NC}"
    echo "  进入容器: docker-compose exec [service] bash"
    echo "  查看数据库: docker-compose exec mysql mysql -u todo_user -p todo_for_ai"
    echo ""
}

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}🧹 清理部署环境...${NC}"
    
    if [ "$1" = "--full" ]; then
        echo "完全清理（包括数据卷）..."
        docker-compose down -v --remove-orphans
        docker system prune -f
    else
        echo "标准清理..."
        docker-compose down --remove-orphans
    fi
    
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 主函数
main() {
    local deployment_type="$1"
    
    case $deployment_type in
        "production"|"prod")
            echo "🏭 生产环境部署"
            export COMPOSE_FILE="docker-compose.yml:docker-compose.prod.yml"
            ;;
        "development"|"dev")
            echo "🔧 开发环境部署"
            export COMPOSE_FILE="docker-compose.yml:docker-compose.dev.yml"
            ;;
        *)
            echo "📦 标准部署"
            ;;
    esac
    
    check_deployment_env
    build_images
    deploy_services
    init_database
    
    if health_check; then
        echo -e "${GREEN}🎉 部署成功！${NC}"
        show_deployment_info
    else
        echo -e "${RED}❌ 部署失败，请检查日志${NC}"
        echo "查看日志: docker-compose logs"
        exit 1
    fi
}

# 信号处理
trap 'cleanup' SIGINT SIGTERM

# 检查参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [部署类型] [选项]"
    echo ""
    echo "部署类型:"
    echo "  production, prod    生产环境部署"
    echo "  development, dev    开发环境部署"
    echo "  (默认)              标准部署"
    echo ""
    echo "选项:"
    echo "  --cleanup           清理部署环境"
    echo "  --cleanup --full    完全清理（包括数据）"
    echo "  --help, -h          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                  # 标准部署"
    echo "  $0 production       # 生产环境部署"
    echo "  $0 --cleanup        # 清理环境"
    exit 0
fi

if [ "$1" = "--cleanup" ]; then
    cleanup "$2"
    exit 0
fi

# 运行主函数
main "$1"
