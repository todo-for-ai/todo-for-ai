#!/bin/bash

# Todo for AI - 测试脚本

set -e

echo "🧪 运行 Todo for AI 测试套件..."

# 检查是否在项目根目录
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 运行后端测试
run_backend_tests() {
    echo "🐍 运行后端测试..."
    cd backend
    
    if [ ! -d "venv" ]; then
        echo "❌ 后端虚拟环境不存在，请先运行 scripts/setup.sh"
        exit 1
    fi
    
    source venv/bin/activate
    
    # 安装测试依赖（如果需要）
    pip install pytest pytest-flask pytest-cov 2>/dev/null || true
    
    # 运行测试
    if [ -d "tests" ] && [ "$(ls -A tests)" ]; then
        echo "运行 Python 测试..."
        python -m pytest tests/ -v --cov=app --cov-report=term-missing
    else
        echo "⚠️  暂无后端测试文件"
    fi
    
    cd ..
    echo "✅ 后端测试完成"
}

# 运行前端测试
run_frontend_tests() {
    echo "⚛️ 运行前端测试..."
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        echo "❌ 前端依赖未安装，请先运行 scripts/setup.sh"
        exit 1
    fi
    
    # 运行测试
    if [ -f "package.json" ] && grep -q "test" package.json; then
        echo "运行 JavaScript/TypeScript 测试..."
        npm test
    else
        echo "⚠️  暂无前端测试配置"
    fi
    
    cd ..
    echo "✅ 前端测试完成"
}

# 运行代码质量检查
run_linting() {
    echo "🔍 运行代码质量检查..."
    
    # 后端代码检查
    echo "检查后端代码..."
    cd backend
    source venv/bin/activate
    
    # 安装代码检查工具（如果需要）
    pip install black flake8 isort 2>/dev/null || true
    
    # 运行代码格式化检查
    if command -v black &> /dev/null; then
        echo "运行 Black 格式检查..."
        black --check . || echo "⚠️  代码格式需要调整，运行 'black .' 进行格式化"
    fi
    
    if command -v flake8 &> /dev/null; then
        echo "运行 Flake8 代码检查..."
        flake8 . --max-line-length=88 --extend-ignore=E203,W503 || echo "⚠️  发现代码质量问题"
    fi
    
    cd ..
    
    # 前端代码检查
    echo "检查前端代码..."
    cd frontend
    
    if [ -f ".eslintrc.json" ]; then
        echo "运行 ESLint 检查..."
        npm run lint 2>/dev/null || npx eslint src --ext .ts,.tsx || echo "⚠️  发现前端代码问题"
    fi
    
    if [ -f ".prettierrc" ]; then
        echo "运行 Prettier 格式检查..."
        npx prettier --check src || echo "⚠️  代码格式需要调整"
    fi
    
    cd ..
    echo "✅ 代码质量检查完成"
}

# 主函数
main() {
    case "${1:-all}" in
        "backend")
            run_backend_tests
            ;;
        "frontend")
            run_frontend_tests
            ;;
        "lint")
            run_linting
            ;;
        "all")
            run_backend_tests
            run_frontend_tests
            run_linting
            ;;
        *)
            echo "用法: $0 [backend|frontend|lint|all]"
            echo "  backend  - 只运行后端测试"
            echo "  frontend - 只运行前端测试"
            echo "  lint     - 只运行代码质量检查"
            echo "  all      - 运行所有测试和检查 (默认)"
            exit 1
            ;;
    esac
    
    echo ""
    echo "🎉 测试完成！"
}

# 运行主函数
main "$@"
