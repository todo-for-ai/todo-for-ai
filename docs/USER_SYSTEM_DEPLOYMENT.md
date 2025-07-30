# Todo for AI 用户系统部署指南

本文档详细说明如何部署和配置 Todo for AI 的用户系统，包括 Auth0 集成、环境变量设置和权限申请流程。

## 目录

1. [系统概述](#系统概述)
2. [Auth0 配置](#auth0-配置)
3. [环境变量设置](#环境变量设置)
4. [数据库初始化](#数据库初始化)
5. [应用部署](#应用部署)
6. [测试验证](#测试验证)
7. [故障排除](#故障排除)

## 系统概述

Todo for AI 用户系统提供以下功能：

- **多种登录方式**：支持 GitHub 和 Gmail 通过 Auth0 登录
- **用户角色管理**：管理员、普通用户、查看者三种角色
- **数据隔离**：用户只能访问自己的项目和任务
- **JWT 认证**：安全的令牌认证机制
- **用户偏好设置**：个性化配置支持

## Auth0 配置

### 1. 创建 Auth0 账户

1. 访问 [Auth0 官网](https://auth0.com/)
2. 注册免费账户
3. 创建新的租户（Tenant）

### 2. 创建应用

1. 在 Auth0 Dashboard 中，点击 "Applications" → "Create Application"
2. 选择 "Regular Web Applications"
3. 填写应用名称：`Todo for AI`
4. 点击 "Create"

### 3. 配置应用设置

在应用设置页面配置以下信息：

#### 基本设置
- **Name**: Todo for AI
- **Domain**: 记录你的 Auth0 域名（如：`your-tenant.auth0.com`）
- **Client ID**: 记录客户端 ID
- **Client Secret**: 记录客户端密钥

#### 应用 URLs
```
Allowed Callback URLs:
http://localhost:50110/todo-for-ai/api/v1/auth/callback
https://your-domain.com/todo-for-ai/api/v1/auth/callback

Allowed Logout URLs:
http://localhost:50111/todo-for-ai/pages/login
https://your-frontend-domain.com/todo-for-ai/pages/login

Allowed Web Origins:
http://localhost:50111
https://your-frontend-domain.com

Allowed Origins (CORS):
http://localhost:50111
https://your-frontend-domain.com
```

### 4. 配置社交登录

#### GitHub 登录
1. 在 Auth0 Dashboard 中，点击 "Authentication" → "Social"
2. 点击 "GitHub" 并启用
3. 在 GitHub 中创建 OAuth App：
   - 访问 GitHub Settings → Developer settings → OAuth Apps
   - 点击 "New OAuth App"
   - 填写信息：
     - Application name: `Todo for AI`
     - Homepage URL: `https://your-domain.com`
     - Authorization callback URL: `https://your-tenant.auth0.com/login/callback`
   - 获取 Client ID 和 Client Secret
4. 在 Auth0 中填入 GitHub 的 Client ID 和 Client Secret

#### Gmail 登录
1. 在 Auth0 Dashboard 中，点击 "Authentication" → "Social"
2. 点击 "Google" 并启用
3. 在 Google Cloud Console 中创建 OAuth 2.0 凭据：
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 创建新项目或选择现有项目
   - 启用 Google+ API
   - 创建 OAuth 2.0 客户端 ID
   - 添加授权重定向 URI：`https://your-tenant.auth0.com/login/callback`
   - 获取客户端 ID 和客户端密钥
4. 在 Auth0 中填入 Google 的客户端 ID 和客户端密钥

### 5. 创建 API

1. 在 Auth0 Dashboard 中，点击 "APIs" → "Create API"
2. 填写信息：
   - **Name**: Todo for AI API
   - **Identifier**: `https://api.todo-for-ai.com`（这将作为 audience）
   - **Signing Algorithm**: RS256
3. 点击 "Create"

## 环境变量设置

### 1. 复制环境变量模板

```bash
cd backend
cp .env.example .env
```

### 2. 配置环境变量

编辑 `.env` 文件，填入以下配置：

```bash
# Flask 配置
FLASK_ENV=development
SECRET_KEY=your-very-secure-secret-key-here

# 数据库配置
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/todo_for_ai

# JWT 配置
JWT_SECRET_KEY=your-jwt-secret-key-here

# Auth0 配置
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-auth0-client-id
AUTH0_CLIENT_SECRET=your-auth0-client-secret
AUTH0_AUDIENCE=https://api.todo-for-ai.com
AUTH0_CALLBACK_URL=http://localhost:50110/todo-for-ai/api/v1/auth/callback

# CORS 配置
CORS_ORIGINS=http://localhost:50111,http://localhost:50112

# 默认管理员配置
DEFAULT_ADMIN_EMAIL=admin@your-domain.com
```

### 3. 生成安全密钥

```bash
# 生成 SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# 生成 JWT_SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 数据库初始化

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 创建数据库

```sql
CREATE DATABASE todo_for_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 运行初始化脚本

```bash
cd backend
python scripts/init_user_system.py
```

这个脚本会：
- 创建所有必要的数据库表
- 创建默认管理员用户
- 迁移现有数据（如果有）
- 验证安装

## 应用部署

### 1. 启动后端服务

```bash
cd backend
python app.py
```

后端服务将在 `http://localhost:50110` 启动。

### 2. 启动前端服务

```bash
cd frontend
npm install
npm run dev
```

前端服务将在 `http://localhost:50111` 启动。

### 3. 生产环境部署

#### 后端部署（使用 Gunicorn）

```bash
cd backend
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:50110 app:app
```

#### 前端部署

```bash
cd frontend
npm run build
# 将 dist 目录部署到 Web 服务器
```

## 测试验证

### 1. 访问应用

1. 打开浏览器访问 `http://localhost:50111/todo-for-ai/pages`
2. 系统会自动重定向到登录页面
3. 点击 "使用 Auth0 登录" 按钮
4. 选择 GitHub 或 Gmail 登录方式
5. 完成认证后，系统会重定向回主页面

### 2. 验证功能

- **用户信息显示**：右上角应显示用户头像和姓名
- **项目管理**：创建、查看、编辑项目
- **任务管理**：创建、查看、编辑任务
- **权限控制**：普通用户只能看到自己的数据
- **登出功能**：点击用户头像 → 退出登录

### 3. API 测试

```bash
# 获取访问令牌（从浏览器开发者工具中获取）
TOKEN="your-jwt-token-here"

# 测试用户信息接口
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:50110/todo-for-ai/api/v1/auth/me

# 测试项目列表接口
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:50110/todo-for-ai/api/v1/projects
```

## 故障排除

### 常见问题

#### 1. Auth0 回调失败

**错误**: `callback_url_mismatch`

**解决方案**:
- 检查 Auth0 应用设置中的 "Allowed Callback URLs"
- 确保 URL 完全匹配，包括协议、域名、端口和路径

#### 2. CORS 错误

**错误**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**解决方案**:
- 检查后端 `CORS_ORIGINS` 环境变量
- 确保前端域名在允许列表中
- 检查 Auth0 应用设置中的 "Allowed Origins (CORS)"

#### 3. JWT 验证失败

**错误**: `Token signature verification failed`

**解决方案**:
- 检查 `JWT_SECRET_KEY` 环境变量
- 确保前后端使用相同的密钥
- 检查 Auth0 API 配置

#### 4. 数据库连接失败

**错误**: `Can't connect to MySQL server`

**解决方案**:
- 检查 `DATABASE_URL` 环境变量
- 确保数据库服务正在运行
- 验证数据库用户名、密码和权限

### 日志调试

启用详细日志：

```bash
export FLASK_ENV=development
export LOG_LEVEL=DEBUG
python app.py
```

查看 Auth0 日志：
1. 访问 Auth0 Dashboard
2. 点击 "Monitoring" → "Logs"
3. 查看登录和认证相关的日志

## 权限申请流程

### GitHub OAuth App 申请

1. **个人账户**：
   - 访问 GitHub Settings → Developer settings → OAuth Apps
   - 点击 "New OAuth App"
   - 填写应用信息并提交

2. **组织账户**：
   - 需要组织管理员权限
   - 在组织设置中创建 OAuth App
   - 可能需要组织审批流程

### Google OAuth 申请

1. **开发环境**：
   - 创建 Google Cloud 项目
   - 启用 Google+ API
   - 创建 OAuth 2.0 凭据

2. **生产环境**：
   - 可能需要 Google 审核
   - 提供隐私政策和服务条款
   - 说明数据使用目的

### 域名和 SSL 证书

生产环境建议：
- 使用 HTTPS 协议
- 申请 SSL 证书
- 配置自定义域名

## 总结

完成以上步骤后，Todo for AI 用户系统就可以正常运行了。用户可以通过 GitHub 或 Gmail 账户登录，系统会自动创建用户记录并管理权限。

如果遇到问题，请参考故障排除部分或查看应用日志获取更多信息。
