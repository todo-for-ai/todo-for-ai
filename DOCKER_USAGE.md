# Todo for AI - Docker 使用指南

本项目支持两种 Docker 启动方式：`docker-compose` 和 `docker run`。两种方式功能相同，可根据需要选择。

## 🚀 快速启动

### 方式一：使用 docker-compose（推荐）

```bash
# 构建并启动
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方式二：使用 docker run

```bash
# 首先构建镜像
docker build -t todo-for-ai:latest .

# 使用脚本启动（推荐）
./docker-run.sh

# 或手动启动（见下方详细命令）
```

## 📋 详细配置

### 环境变量配置

在启动前，请根据实际情况修改以下配置：

#### 必需配置
- `DATABASE_URL`: 数据库连接字符串
- `SECRET_KEY`: Flask 会话密钥（生产环境必须修改）
- `JWT_SECRET_KEY`: JWT 令牌签名密钥（生产环境必须修改）

#### 可选配置
- `GITHUB_CLIENT_ID/SECRET`: GitHub OAuth 登录
- `GOOGLE_CLIENT_ID/SECRET`: Google OAuth 登录
- `CORS_ORIGINS`: 跨域访问配置

### docker-compose 配置

编辑 `docker-compose.yml` 中的环境变量：

```yaml
environment:
  - DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@host.docker.internal:3306/todo_for_ai
  - SECRET_KEY=YOUR_SECRET_KEY_HERE
  - JWT_SECRET_KEY=YOUR_JWT_SECRET_KEY_HERE
  # ... 其他配置
```

### docker run 配置

编辑 `docker-run.sh` 脚本中的环境变量，或直接使用命令：

```bash
docker run -d --name todo-for-ai-app \
  -p 50111:80 \
  -p 50110:50110 \
  -e DATABASE_URL="mysql+pymysql://root:YOUR_PASSWORD@host.docker.internal:3306/todo_for_ai" \
  -e SECRET_KEY="YOUR_SECRET_KEY_HERE" \
  -e JWT_SECRET_KEY="YOUR_JWT_SECRET_KEY_HERE" \
  --add-host=host.docker.internal:host-gateway \
  -v "$(pwd)/uploads:/app/uploads" \
  -v "$(pwd)/logs:/app/logs" \
  todo-for-ai:latest
```

## 🔧 网络配置差异

### docker-compose
- 使用 `host` 网络模式
- 直接访问宿主机网络
- 端口映射被忽略

### docker run
- 使用 `bridge` 网络模式
- 需要明确的端口映射
- 使用 `--add-host` 支持 `host.docker.internal`

## 📁 目录结构

```
todo-for-ai/
├── docker-compose.yml      # Docker Compose 配置
├── docker-run.sh          # Docker Run 启动脚本
├── Dockerfile             # Docker 镜像构建文件
├── .env.example           # 环境变量模板
├── uploads/               # 文件上传目录（自动创建）
├── logs/                  # 日志目录（自动创建）
└── DOCKER_USAGE.md        # 本使用指南
```

## 🌐 访问地址

启动成功后，可通过以下地址访问：

- **前端界面**: http://localhost:50111
- **API 接口**: http://localhost:50110
- **健康检查**: http://localhost:50110/todo-for-ai/api/v1/health

## 🔍 故障排除

### 查看日志
```bash
# docker-compose
docker-compose logs -f

# docker run
docker logs todo-for-ai-app -f
```

### 进入容器
```bash
# docker-compose
docker-compose exec todo-for-ai bash

# docker run
docker exec -it todo-for-ai-app bash
```

### 重启服务
```bash
# docker-compose
docker-compose restart

# docker run
docker restart todo-for-ai-app
```

### 完全重建
```bash
# docker-compose
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# docker run
docker stop todo-for-ai-app
docker rm todo-for-ai-app
docker build --no-cache -t todo-for-ai:latest .
./docker-run.sh
```

## ⚠️ 注意事项

1. **生产环境部署**：
   - 必须修改 `SECRET_KEY` 和 `JWT_SECRET_KEY`
   - 配置正确的数据库连接
   - 设置适当的 CORS 策略

2. **数据持久化**：
   - `uploads/` 和 `logs/` 目录会自动挂载
   - 数据库需要单独部署和备份

3. **端口冲突**：
   - 确保端口 50110 和 50111 未被占用
   - 可在配置中修改端口映射

4. **网络访问**：
   - 使用 `host.docker.internal` 访问宿主机服务
   - 确保宿主机防火墙允许相应端口访问
