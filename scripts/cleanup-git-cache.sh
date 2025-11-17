#!/bin/bash

# cleanup-git-cache.sh - 清理 Git 缓存中不应该被追踪的文件
# 使用方法：./scripts/cleanup-git-cache.sh

set -e

echo "======================================"
echo "清理 Git 缓存"
echo "======================================"
echo ""
echo "⚠️  警告：此脚本将从 Git 中移除一些文件（但保留本地副本）"
echo ""

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ 错误：存在未提交的更改"
    echo "请先提交或暂存您的更改，然后再运行此脚本。"
    exit 1
fi

# 要从 git 中移除的文件列表
FILES_TO_REMOVE=(
    "docker-compose.private.yml"
    "docker-compose.yml"
    "deploy-private.sh"
    "setup-mysql-*.sh"
    "setup-nginx-proxy-*.sh"
)

echo "将从 Git 中移除以下文件（如果存在）："
for pattern in "${FILES_TO_REMOVE[@]}"; do
    echo "  - $pattern"
done
echo ""

read -p "确认继续？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "操作已取消"
    exit 0
fi

echo ""
echo "开始清理..."
echo ""

REMOVED_COUNT=0

# 移除匹配的文件
for pattern in "${FILES_TO_REMOVE[@]}"; do
    # 查找匹配的文件
    files=$(git ls-files | grep -E "^${pattern}$" || true)
    
    if [ -n "$files" ]; then
        echo "移除: $files"
        git rm --cached "$files" 2>/dev/null || echo "  (已移除或不存在)"
        REMOVED_COUNT=$((REMOVED_COUNT + 1))
    fi
done

echo ""
if [ $REMOVED_COUNT -gt 0 ]; then
    echo "✅ 清理完成！已从 Git 中移除 $REMOVED_COUNT 个文件"
    echo ""
    echo "📝 下一步："
    echo "1. 检查更改：git status"
    echo "2. 提交更改：git commit -m 'chore: remove sensitive files from git tracking'"
    echo "3. 推送更改：git push"
    echo ""
    echo "⚠️  注意：这些文件仍然保留在本地，只是不再被 Git 追踪"
else
    echo "✅ 没有需要清理的文件"
fi

