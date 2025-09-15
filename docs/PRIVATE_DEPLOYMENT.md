# Todo for AI 私有部署指南

本文档详细介绍如何在私有环境中部署 Todo for AI 系统。

## 📁 部署文件说明

本项目提供了多种部署方式和配置文件：

| 文件 | 说明 | 用途 |
|------|------|------|
| `docs/QUICK_DEPLOY.md` | 快速部署指南 | 新手推荐，提供多种部署方法 |
| `scripts/deploy-private.sh` | 一键部署脚本 | 自动化部署，交互式配置 |
| `docker-compose.private.yml` | Docker Compose配置 | 生产环境推荐，支持多服务 |
| `.env.private.template` | 环境变量模板 | 配置模板，需复制为.env |
| `nginx/nginx.conf` | Nginx主配置 | 反向代理基础配置 |
| `nginx/conf.d/todo-for-ai.conf` | 站点配置 | Todo for AI专用配置 |

## 目录

- [快速开始](#快速开始)
- [系统要求](#系统要求)
- [环境准备](#环境准备)
- [数据库配置](#数据库配置)
- [OAuth应用配置](#oauth应用配置)
- [Docker部署](#docker部署)
- [验证部署](#验证部署)
- [常见问题](#常见问题)
- [故障排除](#故障排除)

## 🚀 快速开始

**推荐新手使用一键部署脚本**：

```bash
# 下载并运行部署脚本
curl -O https://raw.githubusercontent.com/todo-for-ai/todo-for-ai/main/scripts/deploy-private.sh
chmod +x deploy-private.sh
./deploy-private.sh
```

**或查看** [快速部署指南](./QUICK_DEPLOY.md) **了解更多部署方法**。

## 系统要求

### 硬件要求
- **CPU**: 2核心或以上
- **内存**: 4GB RAM 或以上
- **存储**: 20GB 可用空间或以上
- **网络**: 稳定的网络连接

### 软件要求
- **操作系统**: Linux (推荐 Ubuntu 20.04+, CentOS 7+)
- **Docker**: 20.10+ 版本
- **MySQL**: 8.0+ 版本
- **域名/IP**: 可访问的域名或IP地址

## 环境准备

### 1. 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker
```

### 2. 安装 MySQL

```bash
# 使用 Docker 安装 MySQL
docker run --name mysql-todo \
  -e MYSQL_ROOT_PASSWORD=YOUR_SECURE_PASSWORD \
  -e MYSQL_DATABASE=todo_for_ai \
  -p 3306:3306 \
  -d mysql:8.0

# 或使用系统包管理器安装
# Ubuntu/Debian
sudo apt update
sudo apt install mysql-server

# CentOS/RHEL
sudo yum install mysql-server
```

## 数据库配置

### 1. 创建数据库

```sql
-- 连接到 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE todo_for_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户（可选，推荐）
CREATE USER 'todo_user'@'%' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON todo_for_ai.* TO 'todo_user'@'%';
FLUSH PRIVILEGES;
```

### 2. 验证数据库连接

```bash
# 测试数据库连接
mysql -h YOUR_HOST -u todo_user -p todo_for_ai
```

## OAuth应用配置

### GitHub OAuth 应用

1. **创建 GitHub OAuth 应用**
   - 访问 [GitHub Developer Settings](https://github.com/settings/developers)
   - 点击 "New OAuth App"
   - 填写应用信息：
     - **Application name**: `Todo for AI (Private Deployment)`
     - **Homepage URL**: `http://YOUR_DOMAIN_OR_IP:50111`
     - **Authorization callback URL**: `http://YOUR_DOMAIN_OR_IP:50111/todo-for-ai/api/v1/auth/callback`

2. **获取凭据**
   - 创建完成后获取 `Client ID` 和 `Client Secret`
   - 妥善保存这些凭据

### Google OAuth 应用（可选）

1. **创建 Google OAuth 应用**
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建新项目或选择现有项目
   - 启用 Google+ API
   - 创建 OAuth 2.0 凭据

2. **配置回调URL**
   - 添加授权回调URL: `http://YOUR_DOMAIN_OR_IP:50111/todo-for-ai/api/v1/auth/google/callback`

## Docker部署

### 1. 获取Docker镜像

```bash
# 拉取最新镜像
docker pull todo4ai/todo-for-ai:latest-amd64

# 或者从源码构建（可选）
git clone https://github.com/todo-for-ai/todo-for-ai.git
cd todo-for-ai
docker build -t todo4ai/todo-for-ai:latest-amd64 .
```

### 2. 准备环境变量

创建环境变量文件或直接在命令中设置：

```bash
# 必需的环境变量
export BASE_URL="http://YOUR_DOMAIN_OR_IP:50111"
export DATABASE_URL="mysql+pymysql://todo_user:YOUR_DB_PASSWORD@YOUR_DB_HOST:3306/todo_for_ai"
export SECRET_KEY="YOUR_SECURE_SECRET_KEY_32_CHARS_OR_MORE"
export JWT_SECRET_KEY="YOUR_JWT_SECRET_KEY_32_CHARS_OR_MORE"
export GITHUB_CLIENT_ID="YOUR_GITHUB_CLIENT_ID"
export GITHUB_CLIENT_SECRET="YOUR_GITHUB_CLIENT_SECRET"
export DOCKER_ENV="true"

# 可选的环境变量
export GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
export GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
```

### 3. 启动容器

```bash
docker run --name=todo-for-ai \
  --env=BASE_URL="http://YOUR_DOMAIN_OR_IP:50111" \
  --env=DATABASE_URL="mysql+pymysql://todo_user:YOUR_DB_PASSWORD@YOUR_DB_HOST:3306/todo_for_ai" \
  --env=SECRET_KEY="YOUR_SECURE_SECRET_KEY_32_CHARS_OR_MORE" \
  --env=JWT_SECRET_KEY="YOUR_JWT_SECRET_KEY_32_CHARS_OR_MORE" \
  --env=GITHUB_CLIENT_ID="YOUR_GITHUB_CLIENT_ID" \
  --env=GITHUB_CLIENT_SECRET="YOUR_GITHUB_CLIENT_SECRET" \
  --env=GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID" \
  --env=GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET" \
  --env=DOCKER_ENV="true" \
  -p 50110:50110 \
  -p 50111:50111 \
  --restart=unless-stopped \
  --detach=true \
  todo4ai/todo-for-ai:latest-amd64 \
  /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
```

### 4. 使用 Docker Compose（推荐）

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: todo-mysql
    environment:
      MYSQL_ROOT_PASSWORD: YOUR_SECURE_PASSWORD
      MYSQL_DATABASE: todo_for_ai
      MYSQL_USER: todo_user
      MYSQL_PASSWORD: YOUR_SECURE_PASSWORD
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    restart: unless-stopped

  todo-for-ai:
    image: todo4ai/todo-for-ai:latest-amd64
    container_name: todo-for-ai
    environment:
      BASE_URL: "http://YOUR_DOMAIN_OR_IP:50111"
      DATABASE_URL: "mysql+pymysql://todo_user:YOUR_SECURE_PASSWORD@mysql:3306/todo_for_ai"
      SECRET_KEY: "YOUR_SECURE_SECRET_KEY_32_CHARS_OR_MORE"
      JWT_SECRET_KEY: "YOUR_JWT_SECRET_KEY_32_CHARS_OR_MORE"
      GITHUB_CLIENT_ID: "YOUR_GITHUB_CLIENT_ID"
      GITHUB_CLIENT_SECRET: "YOUR_GITHUB_CLIENT_SECRET"
      GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID"
      GOOGLE_CLIENT_SECRET: "YOUR_GOOGLE_CLIENT_SECRET"
      DOCKER_ENV: "true"
    ports:
      - "50110:50110"
      - "50111:50111"
    depends_on:
      - mysql
    restart: unless-stopped
    command: /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

volumes:
  mysql_data:
```

启动服务：

```bash
docker-compose up -d
```

## 验证部署

### 1. 检查容器状态

```bash
# 检查容器是否正在运行
docker ps -f name=todo-for-ai

# 查看容器日志
docker logs todo-for-ai
```

### 2. 健康检查

```bash
# API健康检查
curl http://YOUR_DOMAIN_OR_IP:50110/todo-for-ai/api/v1/health

# 预期响应
{
  "code": 200,
  "data": {
    "database": "connected",
    "environment": "development",
    "service": "Todo for AI API",
    "status": "healthy",
    "version": "1.0.0"
  },
  "message": "API service is healthy"
}
```

### 3. 访问Web界面

打开浏览器访问：`http://YOUR_DOMAIN_OR_IP:50111/todo-for-ai/pages/login`

应该能看到登录页面，并且可以使用GitHub或Google登录。

## MCP配置（私有部署）

私有部署后，如果你使用MCP（Model Context Protocol）功能，需要更新MCP配置以指向私有部署的API端点。

### MCP配置说明

**重要**: 私有部署的API端点地址与SaaS版本不同：
- **SaaS版本**: `https://todo4ai.org/todo-for-ai/api/v1`
- **私有部署**: `http://YOUR_DOMAIN_OR_IP:50110/todo-for-ai/api/v1`

### Claude Desktop配置

编辑Claude Desktop配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": [
        "--yes",
        "@todo-for-ai/mcp@latest",
        "--api-base-url",
        "http://YOUR_DOMAIN_OR_IP:50110/todo-for-ai/api/v1",
        "--api-token",
        "your-api-token-here"
      ]
    }
  }
}
```

### Cursor IDE配置

在Cursor的设置中添加MCP配置：

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": [
        "--yes",
        "@todo-for-ai/mcp@latest",
        "--api-base-url",
        "http://YOUR_DOMAIN_OR_IP:50110/todo-for-ai/api/v1",
        "--api-token",
        "your-api-token-here",
        "--log-level",
        "info"
      ]
    }
  }
}
```

### 环境变量配置

或者设置环境变量（推荐用于开发环境）：

```bash
# Linux/macOS
export TODO_API_BASE_URL="http://YOUR_DOMAIN_OR_IP:50110/todo-for-ai/api/v1"
export TODO_API_TOKEN="your-api-token-here"

# Windows
set TODO_API_BASE_URL=http://YOUR_DOMAIN_OR_IP:50110/todo-for-ai/api/v1
set TODO_API_TOKEN=your-api-token-here
```

### 本地配置文件

创建 `config.json` 文件：

```json
{
  "TODO_API_BASE_URL": "http://YOUR_DOMAIN_OR_IP:50110/todo-for-ai/api/v1",
  "TODO_API_TOKEN": "your-api-token-here",
  "TODO_API_TIMEOUT": "10000",
  "LOG_LEVEL": "info"
}
```

### 获取API Token

1. 登录私有部署的Web界面：`http://YOUR_DOMAIN_OR_IP:50111/todo-for-ai/pages/login`
2. 进入设置页面
3. 在"API Token"部分创建新的Token
4. 复制Token并在MCP配置中使用

### 验证MCP配置

配置完成后：

1. **重启AI客户端**（Claude Desktop、Cursor等）
2. **测试连接**：
   ```bash
   # 测试API连接
   curl -H "Authorization: Bearer your-api-token-here" \
        http://YOUR_DOMAIN_OR_IP:50110/todo-for-ai/api/v1/projects
   ```
3. **在AI客户端中测试**：
   - 询问AI："请列出我的Todo项目"
   - 如果配置正确，AI应该能够访问你的私有部署数据

### MCP故障排除

如果MCP连接失败，检查：

1. **API端点地址**是否正确（注意端口号是50110，不是50111）
2. **API Token**是否有效且正确配置
3. **网络连接**是否正常（能否访问私有部署地址）
4. **防火墙设置**是否允许访问50110端口
5. **AI客户端**是否已重启以加载新配置

**详细的MCP配置指南请参考**: [MCP私有部署配置指南](./MCP_PRIVATE_DEPLOYMENT.md)

## 常见问题

### Q1: 登录后跳转到错误的域名
**问题**: 登录成功后跳转到 `https://todo4ai.org` 而不是私有部署地址

**解决方案**: 确保设置了正确的 `BASE_URL` 环境变量：
```bash
--env=BASE_URL="http://YOUR_DOMAIN_OR_IP:50111"
```

### Q2: OAuth回调失败
**问题**: GitHub/Google登录时出现回调错误

**解决方案**: 
1. 检查OAuth应用的回调URL配置是否正确
2. 确保防火墙允许相应端口访问
3. 验证域名/IP地址是否可从外部访问

### Q3: 数据库连接失败
**问题**: 容器启动时数据库连接失败

**解决方案**:
1. 检查数据库是否正在运行
2. 验证数据库连接字符串是否正确
3. 确保数据库用户有足够权限
4. 检查网络连接

### Q4: 端口冲突
**问题**: 端口 50110 或 50111 已被占用

**解决方案**:
```bash
# 修改端口映射
-p 8110:50110 -p 8111:50111

# 相应地更新 BASE_URL
--env=BASE_URL="http://YOUR_DOMAIN_OR_IP:8111"
```

## 故障排除

### 查看详细日志

```bash
# 查看容器日志
docker logs -f todo-for-ai

# 进入容器查看应用日志
docker exec -it todo-for-ai tail -f /var/log/supervisor/flask.err.log
```

### 重启服务

```bash
# 重启容器
docker restart todo-for-ai

# 或者停止并重新创建
docker stop todo-for-ai
docker rm todo-for-ai
# 然后重新运行 docker run 命令
```

### 数据库问题排查

```bash
# 检查数据库连接
docker exec -it todo-for-ai mysql -h YOUR_DB_HOST -u todo_user -p todo_for_ai

# 检查数据库表
SHOW TABLES;
```

### 网络问题排查

```bash
# 检查端口是否开放
netstat -tlnp | grep :50111
ss -tlnp | grep :50111

# 检查防火墙设置
sudo ufw status
sudo firewall-cmd --list-ports
```

## 安全建议

1. **使用强密码**: 为数据库和应用密钥使用强密码
2. **定期更新**: 定期更新Docker镜像和系统
3. **网络安全**: 配置防火墙，只开放必要端口
4. **HTTPS**: 在生产环境中使用反向代理配置HTTPS
5. **备份**: 定期备份数据库和重要配置

## 更新升级

```bash
# 拉取最新镜像
docker pull todo4ai/todo-for-ai:latest-amd64

# 停止当前容器
docker stop todo-for-ai
docker rm todo-for-ai

# 使用新镜像启动容器
# 使用相同的 docker run 命令
```

## 环境变量说明

### 必需环境变量

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `BASE_URL` | 私有部署的基础URL | `http://192.168.1.100:50111` |
| `DATABASE_URL` | 数据库连接字符串 | `mysql+pymysql://user:pass@host:3306/db` |
| `SECRET_KEY` | Flask会话密钥 | 32位以上随机字符串 |
| `JWT_SECRET_KEY` | JWT令牌签名密钥 | 32位以上随机字符串 |
| `GITHUB_CLIENT_ID` | GitHub OAuth客户端ID | `Ov23lixxxxxxxxxx` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth客户端密钥 | `ghp_xxxxxxxxxxxx` |
| `DOCKER_ENV` | Docker环境标识 | `true` |

### 可选环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `GOOGLE_CLIENT_ID` | Google OAuth客户端ID | 无 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth客户端密钥 | 无 |
| `LOG_LEVEL` | 日志级别 | `INFO` |

## 反向代理配置（推荐）

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;

    # API代理
    location /todo-for-ai/api/ {
        proxy_pass http://127.0.0.1:50110;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 前端代理
    location /todo-for-ai/ {
        proxy_pass http://127.0.0.1:50111;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Apache 配置示例

```apache
<VirtualHost *:443>
    ServerName your-domain.com

    SSLEngine on
    SSLCertificateFile /path/to/your/cert.pem
    SSLCertificateKeyFile /path/to/your/key.pem

    ProxyPreserveHost On
    ProxyRequests Off

    # API代理
    ProxyPass /todo-for-ai/api/ http://127.0.0.1:50110/todo-for-ai/api/
    ProxyPassReverse /todo-for-ai/api/ http://127.0.0.1:50110/todo-for-ai/api/

    # 前端代理
    ProxyPass /todo-for-ai/ http://127.0.0.1:50111/todo-for-ai/
    ProxyPassReverse /todo-for-ai/ http://127.0.0.1:50111/todo-for-ai/
</VirtualHost>
```

## 监控和维护

### 系统监控

```bash
# 监控容器资源使用
docker stats todo-for-ai

# 监控磁盘使用
df -h

# 监控内存使用
free -h

# 监控数据库连接
docker exec -it todo-for-ai mysql -e "SHOW PROCESSLIST;"
```

### 日志管理

```bash
# 设置日志轮转
docker run --log-driver=json-file --log-opt max-size=10m --log-opt max-file=3 ...

# 清理旧日志
docker system prune -f
```

### 数据备份

```bash
# 备份数据库
docker exec mysql-todo mysqldump -u root -p todo_for_ai > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker exec -i mysql-todo mysql -u root -p todo_for_ai < backup_file.sql
```

## 性能优化

### 数据库优化

```sql
-- 添加索引
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_task_user_id ON tasks(user_id);
CREATE INDEX idx_task_created_at ON tasks(created_at);

-- 优化MySQL配置
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1GB
SET GLOBAL max_connections = 200;
```

### 应用优化

```bash
# 增加容器资源限制
docker run --memory=2g --cpus=2 ...

# 使用生产环境配置
--env=FLASK_ENV=production
```

## 技术支持

如果遇到问题，可以：

1. 查看项目 [GitHub Issues](https://github.com/todo-for-ai/todo-for-ai/issues)
2. 提交新的 Issue 描述问题
3. 查看项目文档和 README
4. 加入社区讨论群

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](../LICENSE) 文件。

---

**重要提示**:
- 请将文档中的占位符（如 `YOUR_DOMAIN_OR_IP`、`YOUR_SECURE_PASSWORD` 等）替换为实际值
- 在生产环境中务必使用强密码和HTTPS
- 定期备份数据和更新系统
- 遵循安全最佳实践
