#!/bin/bash

# verify-gitignore.sh - 验证 .gitignore 配置的有效性
# 使用方法：./scripts/verify-gitignore.sh

set -e

echo "======================================"
echo "验证 .gitignore 配置"
echo "======================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查计数
PASSED=0
FAILED=0
WARNINGS=0

# 检查敏感文件是否被追踪
echo "📋 检查 1: 敏感文件不应该被追踪"
echo "--------------------------------------"

SENSITIVE_PATTERNS=(
    "\\.env$"
    "\\.key$"
    "\\.pem$"
    "\\.crt$"
    "\\.cert$"
    "deploy\\.sh$"
    "deploy-private\\.sh$"
    "docker-compose\\.yml$"
    "docker-compose\\.private\\.yml$"
    "setup-.*\\.sh$"
    "\\.token$"
)

FOUND_SENSITIVE=0
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    files=$(git ls-files | grep -E "$pattern" || true)
    if [ -n "$files" ]; then
        echo -e "${RED}❌ 发现被追踪的敏感文件：${NC}"
        echo "$files"
        FOUND_SENSITIVE=1
        FAILED=$((FAILED + 1))
    fi
done

if [ $FOUND_SENSITIVE -eq 0 ]; then
    echo -e "${GREEN}✅ 通过：没有敏感文件被追踪${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 检查日志文件是否被追踪
echo "📋 检查 2: 日志文件不应该被追踪"
echo "--------------------------------------"
LOG_FILES=$(git ls-files | grep -E "\\.log$" || true)
if [ -n "$LOG_FILES" ]; then
    echo -e "${RED}❌ 发现被追踪的日志文件：${NC}"
    echo "$LOG_FILES"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ 通过：没有日志文件被追踪${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 检查构建输出是否被追踪
echo "📋 检查 3: 构建输出不应该被追踪"
echo "--------------------------------------"
BUILD_DIRS=$(git ls-files | grep -E "^(dist|build|lib|out)/" || true)
if [ -n "$BUILD_DIRS" ]; then
    echo -e "${YELLOW}⚠️  警告：发现可能的构建输出文件：${NC}"
    echo "$BUILD_DIRS" | head -10
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ 通过：没有构建输出被追踪${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 检查依赖目录是否被追踪
echo "📋 检查 4: 依赖目录不应该被追踪"
echo "--------------------------------------"
DEP_DIRS=$(git ls-files | grep -E "^(node_modules|venv|__pycache__)/" || true)
if [ -n "$DEP_DIRS" ]; then
    echo -e "${RED}❌ 发现被追踪的依赖目录：${NC}"
    echo "$DEP_DIRS" | head -10
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ 通过：没有依赖目录被追踪${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 检查数据库文件是否被追踪
echo "📋 检查 5: 数据库文件不应该被追踪"
echo "--------------------------------------"
DB_FILES=$(git ls-files | grep -E "\\.(db|sqlite|sqlite3|sql|backup)$" || true)
if [ -n "$DB_FILES" ]; then
    echo -e "${YELLOW}⚠️  警告：发现数据库相关文件：${NC}"
    echo "$DB_FILES"
    # SQL migration 文件是可以的，所以只警告
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ 通过：没有数据库文件被追踪${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 检查 OS 生成的文件是否被追踪
echo "📋 检查 6: OS 生成的文件不应该被追踪"
echo "--------------------------------------"
OS_FILES=$(git ls-files | grep -E "(\\.DS_Store|Thumbs\\.db|Desktop\\.ini)$" || true)
if [ -n "$OS_FILES" ]; then
    echo -e "${RED}❌ 发现被追踪的 OS 文件：${NC}"
    echo "$OS_FILES"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✅ 通过：没有 OS 文件被追踪${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 检查上传目录是否被追踪
echo "📋 检查 7: 上传目录不应该被追踪"
echo "--------------------------------------"
UPLOAD_FILES=$(git ls-files | grep -E "^(uploads|media)/" || true)
if [ -n "$UPLOAD_FILES" ]; then
    echo -e "${YELLOW}⚠️  警告：发现上传目录中的文件：${NC}"
    echo "$UPLOAD_FILES" | head -10
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ 通过：没有上传目录被追踪${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 检查必要的文件是否存在
echo "📋 检查 8: 必要的文件应该被追踪"
echo "--------------------------------------"
REQUIRED_FILES=(
    "README.md"
    "LICENSE"
    "todo-for-ai-api-server/requirements.txt"
    "todo-for-ai-mcp/package.json"
    "todo-for-ai-webpage/package.json"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if ! git ls-files | grep -q "^$file$"; then
        echo -e "${YELLOW}⚠️  警告：缺失必要文件：$file${NC}"
        MISSING_FILES=1
        WARNINGS=$((WARNINGS + 1))
    fi
done

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN}✅ 通过：所有必要文件都被追踪${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 检查 .gitignore 文件是否存在
echo "📋 检查 9: .gitignore 文件是否存在"
echo "--------------------------------------"
GITIGNORE_FILES=(
    ".gitignore"
    "todo-for-ai-api-server/.gitignore"
    "todo-for-ai-mcp/.gitignore"
    "todo-for-ai-webpage/.gitignore"
)

MISSING_GITIGNORE=0
for file in "${GITIGNORE_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ 缺失 .gitignore 文件：$file${NC}"
        MISSING_GITIGNORE=1
        FAILED=$((FAILED + 1))
    fi
done

if [ $MISSING_GITIGNORE -eq 0 ]; then
    echo -e "${GREEN}✅ 通过：所有 .gitignore 文件都存在${NC}"
    PASSED=$((PASSED + 1))
fi
echo ""

# 输出总结
echo "======================================"
echo "验证结果总结"
echo "======================================"
echo -e "${GREEN}✅ 通过：$PASSED${NC}"
echo -e "${RED}❌ 失败：$FAILED${NC}"
echo -e "${YELLOW}⚠️  警告：$WARNINGS${NC}"
echo ""

# 退出状态
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}验证失败！请修复上述问题。${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}验证完成，但存在警告。${NC}"
    exit 0
else
    echo -e "${GREEN}验证通过！.gitignore 配置正确。${NC}"
    exit 0
fi

