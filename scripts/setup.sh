#!/bin/bash

# Todo for AI - 项目设置脚本

set -e

echo "🚀 开始设置 Todo for AI 项目..."

# 检查必要的工具
check_requirements() {
    echo "📋 检查系统要求..."
    
    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 未安装，请先安装 Python 3.9+"
        exit 1
    fi
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js 未安装，请先安装 Node.js 18+"
        exit 1
    fi
    
    # 检查 MySQL
    if ! command -v mysql &> /dev/null; then
        echo "❌ MySQL 未安装，请先安装 MySQL 8.0+"
        exit 1
    fi
    
    echo "✅ 系统要求检查通过"
}

# 设置后端环境
setup_backend() {
    echo "🐍 设置后端环境..."
    
    cd backend
    
    # 创建虚拟环境
    if [ ! -d "venv" ]; then
        echo "创建 Python 虚拟环境..."
        python3 -m venv venv
    fi
    
    # 激活虚拟环境
    source venv/bin/activate
    
    # 升级 pip
    pip install --upgrade pip
    
    # 安装依赖
    if [ -f "requirements.txt" ]; then
        echo "安装 Python 依赖..."
        pip install -r requirements.txt
    fi
    
    cd ..
    echo "✅ 后端环境设置完成"
}

# 设置前端环境
setup_frontend() {
    echo "⚛️ 设置前端环境..."
    
    cd frontend
    
    # 安装依赖
    if [ -f "package.json" ]; then
        echo "安装 Node.js 依赖..."
        npm install
    fi
    
    cd ..
    echo "✅ 前端环境设置完成"
}

# 设置数据库
setup_database() {
    echo "🗄️ 设置数据库..."
    
    # 提示用户创建数据库
    echo "请确保 MySQL 服务正在运行，并执行以下命令创建数据库："
    echo "mysql -u root -p"
    echo "CREATE DATABASE todo_for_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    echo "EXIT;"
    echo ""
    read -p "数据库创建完成后，按 Enter 继续..."
    
    echo "✅ 数据库设置完成"
}

# 创建环境配置文件
create_env_files() {
    echo "📝 创建环境配置文件..."
    
    # 后端环境配置
    if [ ! -f "backend/.env" ]; then
        cat > backend/.env << EOF
# Flask 配置
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your-secret-key-here

# 数据库配置
DATABASE_URL=mysql+pymysql://root:cC11001100@localhost:3306/todo_for_ai



# 其他配置
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
EOF
        echo "创建了 backend/.env"
    fi
    
    # 前端环境配置
    if [ ! -f "frontend/.env" ]; then
        cat > frontend/.env << EOF
# API 配置
VITE_API_BASE_URL=http://localhost:50110/todo-for-ai/api/v1
VITE_MCP_SERVER_URL=http://localhost:50110

# 应用配置
VITE_APP_TITLE=Todo for AI
VITE_APP_VERSION=1.0.0
EOF
        echo "创建了 frontend/.env"
    fi
    
    echo "✅ 环境配置文件创建完成"
}

# 主函数
main() {
    check_requirements
    setup_backend
    setup_frontend
    setup_database
    create_env_files
    
    echo ""
    echo "🎉 项目设置完成！"
    echo ""
    echo "下一步："
    echo "1. 启动后端服务: cd backend && source venv/bin/activate && python app.py"
    echo "2. 启动前端服务: cd frontend && npm run dev"
    echo "3. 访问应用: http://localhost:3000"
    echo ""
    echo "更多信息请查看 README.md"
}

# 运行主函数
main
