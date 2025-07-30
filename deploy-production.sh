#!/bin/bash

# Todo for AI 生产环境部署脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_requirements() {
    log_info "检查部署要求..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "所有要求已满足"
}

# 创建生产环境配置
create_production_env() {
    log_info "创建生产环境配置..."
    
    if [ ! -f ".env.production" ]; then
        log_warning ".env.production 文件不存在，创建模板..."
        cat > .env.production << EOF
# 生产环境配置

# 域名配置
DOMAIN=your-production-domain.com

# 数据库配置
MYSQL_ROOT_PASSWORD=your-strong-root-password
MYSQL_USER=todouser
MYSQL_PASSWORD=your-strong-password

# Flask配置
SECRET_KEY=your-very-long-and-random-secret-key
JWT_SECRET_KEY=your-jwt-secret-key

# Auth0配置
AUTH0_DOMAIN=dev-3ilx0p4c0g1fhisz.us.auth0.com
AUTH0_CLIENT_ID=mSJB3yqxTv4LCxTFQaFAUEHAEANYNLGC
AUTH0_CLIENT_SECRET=your-auth0-client-secret
EOF
        log_warning "请编辑 .env.production 文件，填入正确的配置值"
        log_warning "特别注意：请将 DOMAIN 替换为你的实际域名"
        exit 1
    fi
    
    log_success "生产环境配置已准备"
}

# 构建和部署
deploy() {
    log_info "开始部署到生产环境..."
    
    # 停止现有服务
    log_info "停止现有服务..."
    docker-compose -f docker-compose.production.yml --env-file .env.production down
    
    # 构建镜像
    log_info "构建Docker镜像..."
    docker-compose -f docker-compose.production.yml --env-file .env.production build --no-cache
    
    # 启动服务
    log_info "启动生产服务..."
    docker-compose -f docker-compose.production.yml --env-file .env.production up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 检查服务状态
    log_info "检查服务状态..."
    docker-compose -f docker-compose.production.yml --env-file .env.production ps
    
    log_success "部署完成！"
}

# 显示部署信息
show_deployment_info() {
    source .env.production
    
    log_info "部署信息："
    echo "=================================="
    echo "前端访问地址: https://${DOMAIN}"
    echo "API地址: https://${DOMAIN}/todo-for-ai/api/v1"
    echo "=================================="
    echo ""
    echo "Auth0配置已更新，支持以下URL："
    echo "- 回调URL: https://${DOMAIN}/todo-for-ai/api/v1/auth/callback"
    echo "- 登出URL: https://${DOMAIN}/todo-for-ai/pages/login"
    echo "- Web Origins: https://${DOMAIN}"
    echo ""
    echo "请确保："
    echo "1. 域名DNS已正确配置"
    echo "2. SSL证书已正确安装"
    echo "3. 防火墙已开放80和443端口"
}

# 主函数
main() {
    log_info "Todo for AI 生产环境部署开始..."
    
    check_requirements
    create_production_env
    deploy
    show_deployment_info
    
    log_success "部署完成！请访问你的域名查看应用"
}

# 运行主函数
main "$@"
