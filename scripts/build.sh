#!/bin/bash

# Todo for AI - 构建脚本

set -e

echo "🏗️ 构建 Todo for AI 项目..."

# 检查是否在项目根目录
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 构建前端
build_frontend() {
    echo "⚛️ 构建前端项目..."
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        echo "❌ 前端依赖未安装，请先运行 scripts/setup.sh"
        exit 1
    fi
    
    # 运行构建
    echo "运行 Vite 构建..."
    npm run build
    
    # 检查构建结果
    if [ -d "dist" ]; then
        echo "✅ 前端构建成功，输出目录: frontend/dist"
        echo "📊 构建统计:"
        du -sh dist
        find dist -name "*.js" -o -name "*.css" | wc -l | xargs echo "文件数量:"
    else
        echo "❌ 前端构建失败"
        exit 1
    fi
    
    cd ..
}

# 准备后端部署
prepare_backend() {
    echo "🐍 准备后端部署..."
    cd backend
    
    if [ ! -d "venv" ]; then
        echo "❌ 后端虚拟环境不存在，请先运行 scripts/setup.sh"
        exit 1
    fi
    
    source venv/bin/activate
    
    # 生成 requirements.txt（包含所有已安装的包）
    echo "生成完整的 requirements.txt..."
    pip freeze > requirements-freeze.txt
    
    # 检查关键文件
    if [ ! -f "app.py" ]; then
        echo "⚠️  app.py 文件不存在，请确保后端应用已实现"
    fi
    
    echo "✅ 后端部署准备完成"
    echo "📋 部署文件:"
    echo "  - requirements.txt (开发依赖)"
    echo "  - requirements-freeze.txt (完整依赖)"
    echo "  - app.py (应用入口)"
    
    cd ..
}

# 创建部署包
create_deployment_package() {
    echo "📦 创建部署包..."
    
    # 创建部署目录
    DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$DEPLOY_DIR"
    
    # 复制后端文件
    echo "复制后端文件..."
    cp -r backend "$DEPLOY_DIR/"
    
    # 复制前端构建文件
    if [ -d "frontend/dist" ]; then
        echo "复制前端构建文件..."
        cp -r frontend/dist "$DEPLOY_DIR/static"
    fi
    
    # 复制配置文件
    echo "复制配置文件..."
    cp README.md "$DEPLOY_DIR/"
    cp -r scripts "$DEPLOY_DIR/"
    
    # 创建部署说明
    cat > "$DEPLOY_DIR/DEPLOY.md" << EOF
# Todo for AI 部署说明

## 部署时间
$(date)

## 部署内容
- 后端应用 (backend/)
- 前端静态文件 (static/)
- 部署脚本 (scripts/)

## 部署步骤

### 1. 环境准备
\`\`\`bash
# 安装 Python 3.9+
# 安装 MySQL 8.0+
# 安装 Node.js 18+ (如果需要重新构建前端)
\`\`\`

### 2. 后端部署
\`\`\`bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements-freeze.txt
\`\`\`

### 3. 数据库配置
\`\`\`bash
# 创建数据库
mysql -u root -p
CREATE DATABASE todo_for_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库连接等配置
\`\`\`

### 4. 启动服务
\`\`\`bash
# 开发环境
python app.py

# 生产环境
gunicorn -w 4 -b 0.0.0.0:5000 app:app
\`\`\`

### 5. 前端部署
前端文件已构建在 static/ 目录中，可以：
- 使用 Flask 直接提供静态文件服务
- 部署到 Nginx 等 Web 服务器
- 部署到 CDN

## 注意事项
- 请修改生产环境的密钥和数据库密码
- 确保防火墙配置正确
- 建议使用 HTTPS
- 定期备份数据库
EOF
    
    # 创建压缩包
    echo "创建压缩包..."
    tar -czf "$DEPLOY_DIR.tar.gz" "$DEPLOY_DIR"
    
    echo "✅ 部署包创建完成"
    echo "📁 部署目录: $DEPLOY_DIR"
    echo "📦 压缩包: $DEPLOY_DIR.tar.gz"
    echo "📄 部署说明: $DEPLOY_DIR/DEPLOY.md"
}

# 主函数
main() {
    case "${1:-all}" in
        "frontend")
            build_frontend
            ;;
        "backend")
            prepare_backend
            ;;
        "package")
            build_frontend
            prepare_backend
            create_deployment_package
            ;;
        "all")
            build_frontend
            prepare_backend
            ;;
        *)
            echo "用法: $0 [frontend|backend|package|all]"
            echo "  frontend - 只构建前端"
            echo "  backend  - 只准备后端"
            echo "  package  - 创建完整部署包"
            echo "  all      - 构建前端和准备后端 (默认)"
            exit 1
            ;;
    esac
    
    echo ""
    echo "🎉 构建完成！"
}

# 运行主函数
main "$@"
