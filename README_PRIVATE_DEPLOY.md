# 私有部署配置使用指南

## 快速开始

### 1. 克隆仓库（首次）
```bash
git clone --recurse-submodules git@github.com:todo-for-ai/todo-for-ai.git
cd todo-for-ai
```

### 2. 初始化子模块（已克隆的仓库）
```bash
git submodule update --init --recursive
```

### 3. 部署
```bash
cd private-deploy
./deploy.sh
```

## 常用命令

### 更新私有配置
```bash
cd private-deploy
vim .env  # 或编辑其他文件
git add .
git commit -m "更新配置"
git push
```

### 在主仓库中更新子模块引用
```bash
cd ..  # 回到主仓库根目录
git add private-deploy
git commit -m "更新 private-deploy 子模块"
git push
```

### 拉取最新的私有配置
```bash
cd private-deploy
git pull origin main
```

### 查看子模块状态
```bash
git submodule status
```

## 文件位置

- **部署脚本**: `private-deploy/deploy.sh`
- **环境配置**: `private-deploy/.env`
- **备份配置**: `private-deploy/.env.backup`
- **使用说明**: `private-deploy/README.md`

## 注意事项

⚠️ **重要**:
- `private-deploy` 是私有仓库，仅授权团队成员可访问
- 不要将私有配置文件复制到主仓库目录
- 修改配置后记得提交到私有仓库

## 故障排查

### 子模块未初始化
```bash
git submodule update --init --recursive
```

### 子模块更新冲突
```bash
cd private-deploy
git fetch origin
git reset --hard origin/main
```

### 权限问题
确保你的 SSH key 已添加到 GitHub 账户，并且有 `todo-for-ai/private-deploy` 仓库的访问权限。

## 更多信息

详细文档请查看:
- `SECURITY_FIX_SUMMARY.md` - 安全修复总结
- `private-deploy/README.md` - 私有子模块详细说明
