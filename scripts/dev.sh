#!/bin/bash

# Todo for AI - 开发启动脚本

set -e

echo "🚀 启动 Todo for AI 开发环境..."

# 检查是否在项目根目录
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 函数：启动后端服务
start_backend() {
    echo "🐍 启动后端服务..."
    cd backend
    
    # 检查虚拟环境
    if [ ! -d "venv" ]; then
        echo "❌ 后端虚拟环境不存在，请先运行 scripts/setup.sh"
        exit 1
    fi
    
    # 激活虚拟环境并启动服务
    source venv/bin/activate
    
    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        echo "⚠️  .env 文件不存在，创建默认配置..."
        cat > .env << EOF
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=dev-secret-key-change-in-production
DATABASE_URL=mysql+pymysql://root:cC11001100@localhost:3306/todo_for_ai
MCP_SERVER_HOST=localhost
MCP_SERVER_PORT=8080
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
EOF
    fi
    
    echo "启动 Flask 开发服务器..."
    python app.py &
    BACKEND_PID=$!
    
    cd ..
    echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"
}

# 函数：启动前端服务
start_frontend() {
    echo "⚛️ 启动前端服务..."
    cd frontend
    
    # 检查 node_modules
    if [ ! -d "node_modules" ]; then
        echo "❌ 前端依赖未安装，请先运行 scripts/setup.sh"
        exit 1
    fi
    
    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        echo "⚠️  .env 文件不存在，创建默认配置..."
        cat > .env << EOF
VITE_API_BASE_URL=http://localhost:50110/todo-for-ai/api/v1
VITE_MCP_SERVER_URL=http://localhost:50110
VITE_APP_TITLE=Todo for AI
VITE_APP_VERSION=1.0.0
VITE_DEV_MODE=true
EOF
    fi
    
    echo "启动 Vite 开发服务器..."
    npm run dev &
    FRONTEND_PID=$!
    
    cd ..
    echo "✅ 前端服务已启动 (PID: $FRONTEND_PID)"
}

# 函数：清理进程
cleanup() {
    echo ""
    echo "🛑 正在停止服务..."
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo "✅ 后端服务已停止"
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo "✅ 前端服务已停止"
    fi
    
    # 清理可能残留的进程
    pkill -f "python app.py" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    echo "👋 开发环境已关闭"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# 启动服务
start_backend
sleep 2
start_frontend

echo ""
echo "🎉 开发环境启动完成！"
echo ""
echo "📱 前端地址: http://localhost:5173"
echo "🔧 后端地址: http://localhost:5000"
echo "🤖 MCP服务: http://localhost:8080"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
wait
