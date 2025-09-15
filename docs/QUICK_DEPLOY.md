# Todo for AI 快速私有部署指南

本指南提供了多种快速部署 Todo for AI 的方法，适合不同的使用场景。

## 🚀 方法一：一键部署脚本（推荐新手）

### 使用自动化脚本

```bash
# 下载部署脚本
curl -O https://raw.githubusercontent.com/todo-for-ai/todo-for-ai/main/scripts/deploy-private.sh

# 添加执行权限
chmod +x deploy-private.sh

# 运行部署脚本
./deploy-private.sh
```

脚本会自动：
- 检查系统依赖
- 收集配置信息
- 生成安全密钥
- 拉取Docker镜像
- 启动服务
- 执行健康检查

### 脚本特性

- ✅ 交互式配置收集
- ✅ 自动生成安全密钥
- ✅ 自动检测本机IP
- ✅ 健康检查验证
- ✅ 配置文件保存
- ✅ 详细的部署日志

## 🐳 方法二：Docker Compose（推荐生产环境）

### 1. 准备配置文件

```bash
# 下载配置文件
curl -O https://raw.githubusercontent.com/todo-for-ai/todo-for-ai/main/docker-compose.private.yml
curl -O https://raw.githubusercontent.com/todo-for-ai/todo-for-ai/main/.env.private.template

# 复制环境变量模板
cp .env.private.template .env
```

### 2. 编辑配置文件

编辑 `.env` 文件，填入实际配置：

```bash
# 编辑配置文件
nano .env

# 必需配置项
BASE_URL=http://your-server-ip:50111
SECRET_KEY=your_32_char_secret_key
JWT_SECRET_KEY=your_32_char_jwt_key
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
MYSQL_PASSWORD=your_secure_mysql_password
```

### 3. 生成安全密钥

```bash
# 生成SECRET_KEY
openssl rand -hex 32

# 生成JWT_SECRET_KEY
openssl rand -hex 32
```

### 4. 启动服务

```bash
# 基础部署（仅应用和数据库）
docker-compose -f docker-compose.private.yml up -d

# 包含Redis缓存
docker-compose -f docker-compose.private.yml --profile with-redis up -d

# 包含Nginx反向代理
docker-compose -f docker-compose.private.yml --profile with-nginx up -d

# 完整部署（所有服务）
docker-compose -f docker-compose.private.yml --profile with-redis --profile with-nginx up -d
```

### 5. 验证部署

```bash
# 查看服务状态
docker-compose -f docker-compose.private.yml ps

# 查看日志
docker-compose -f docker-compose.private.yml logs -f todo-for-ai

# 健康检查
curl http://localhost:50110/todo-for-ai/api/v1/health
```

## 🔧 方法三：手动Docker部署

### 1. 拉取镜像

```bash
docker pull todo4ai/todo-for-ai:latest-amd64
```

### 2. 准备数据库

```bash
# 启动MySQL容器
docker run --name mysql-todo \
  -e MYSQL_ROOT_PASSWORD=your_secure_password \
  -e MYSQL_DATABASE=todo_for_ai \
  -e MYSQL_USER=todo_user \
  -e MYSQL_PASSWORD=your_secure_password \
  -p 3306:3306 \
  -d mysql:8.0
```

### 3. 启动应用

```bash
docker run --name=todo-for-ai \
  --env=BASE_URL="http://your-server-ip:50111" \
  --env=DATABASE_URL="mysql+pymysql://todo_user:your_secure_password@your-db-host:3306/todo_for_ai" \
  --env=SECRET_KEY="your_32_char_secret_key" \
  --env=JWT_SECRET_KEY="your_32_char_jwt_key" \
  --env=GITHUB_CLIENT_ID="your_github_client_id" \
  --env=GITHUB_CLIENT_SECRET="your_github_client_secret" \
  --env=DOCKER_ENV="true" \
  -p 50110:50110 \
  -p 50111:50111 \
  --restart=unless-stopped \
  --detach=true \
  todo4ai/todo-for-ai:latest-amd64 \
  /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
```

## 📋 OAuth应用配置

### GitHub OAuth应用

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写信息：
   - **Application name**: `Todo for AI (Private Deployment)`
   - **Homepage URL**: `http://your-server-ip:50111`
   - **Authorization callback URL**: `http://your-server-ip:50111/todo-for-ai/api/v1/auth/callback`
4. 获取 `Client ID` 和 `Client Secret`

### Google OAuth应用（可选）

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目或选择现有项目
3. 启用 Google+ API
4. 创建 OAuth 2.0 凭据
5. 添加回调URL: `http://your-server-ip:50111/todo-for-ai/api/v1/auth/google/callback`

## 🔍 验证部署

### 1. 健康检查

```bash
# API健康检查
curl http://your-server-ip:50110/todo-for-ai/api/v1/health

# 预期响应
{
  "code": 200,
  "data": {
    "status": "healthy",
    "service": "Todo for AI API",
    "version": "1.0.0"
  }
}
```

### 2. 访问Web界面

打开浏览器访问：`http://your-server-ip:50111/todo-for-ai/pages/login`

### 3. 测试登录功能

- 点击 GitHub 登录按钮
- 验证跳转到正确的 GitHub 授权页面
- 完成授权后应该跳转回私有部署地址

## 🔌 MCP配置（私有部署）

私有部署后，如果使用MCP功能，需要更新配置指向私有部署的API端点。

### 重要提醒

**API端点地址变化**：
- SaaS版本：`https://todo4ai.org/todo-for-ai/api/v1`
- 私有部署：`http://your-server-ip:50110/todo-for-ai/api/v1`

### Claude Desktop配置

编辑配置文件：`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": [
        "--yes",
        "@todo-for-ai/mcp@latest",
        "--api-base-url",
        "http://your-server-ip:50110/todo-for-ai/api/v1",
        "--api-token",
        "your-api-token-here"
      ]
    }
  }
}
```

### 获取API Token

1. 访问：`http://your-server-ip:50111/todo-for-ai/pages/login`
2. 登录后进入设置页面
3. 创建新的API Token
4. 在MCP配置中使用该Token

### 验证MCP配置

1. 重启AI客户端
2. 测试连接：询问AI "请列出我的Todo项目"
3. 如果成功，AI应该能访问私有部署的数据

**详细的MCP配置指南**: [MCP私有部署配置指南](./MCP_PRIVATE_DEPLOYMENT.md)

## 🛠️ 管理命令

### 查看日志

```bash
# Docker Compose方式
docker-compose -f docker-compose.private.yml logs -f todo-for-ai

# 直接Docker方式
docker logs -f todo-for-ai
```

### 重启服务

```bash
# Docker Compose方式
docker-compose -f docker-compose.private.yml restart todo-for-ai

# 直接Docker方式
docker restart todo-for-ai
```

### 停止服务

```bash
# Docker Compose方式
docker-compose -f docker-compose.private.yml down

# 直接Docker方式
docker stop todo-for-ai
```

### 更新服务

```bash
# 拉取最新镜像
docker pull todo4ai/todo-for-ai:latest-amd64

# Docker Compose方式更新
docker-compose -f docker-compose.private.yml pull
docker-compose -f docker-compose.private.yml up -d

# 直接Docker方式更新
docker stop todo-for-ai
docker rm todo-for-ai
# 然后重新运行 docker run 命令
```

## 🚨 常见问题

### Q: 登录后跳转到错误域名
**A**: 检查 `BASE_URL` 环境变量是否正确设置

### Q: OAuth回调失败
**A**: 确认OAuth应用的回调URL配置正确

### Q: 数据库连接失败
**A**: 检查数据库服务是否运行，连接字符串是否正确

### Q: 端口冲突
**A**: 修改端口映射，同时更新 `BASE_URL`

## 📚 更多信息

- [详细部署文档](./PRIVATE_DEPLOYMENT.md)
- [故障排除指南](./PRIVATE_DEPLOYMENT.md#故障排除)
- [安全配置建议](./PRIVATE_DEPLOYMENT.md#安全建议)
- [性能优化指南](./PRIVATE_DEPLOYMENT.md#性能优化)

## 🆘 获取帮助

如果遇到问题：

1. 查看 [GitHub Issues](https://github.com/todo-for-ai/todo-for-ai/issues)
2. 提交新的 Issue 描述问题
3. 查看项目文档和 README

---

**提示**: 生产环境建议使用HTTPS和域名，配置反向代理和SSL证书。
