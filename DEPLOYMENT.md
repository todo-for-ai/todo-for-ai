# 自动部署配置

## 需要设置的 GitHub Secrets

在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加以下 secrets：

### 服务器连接
- `PRODUCTION_HOST`: `107.175.69.178`
- `PRODUCTION_USERNAME`: `root`
- `PRODUCTION_PASSWORD`: `XeyIy370w4kJ8VBbV8`
- `SSH_PORT`: SSH 连接端口号

### 应用配置
- `SECRET_KEY`: Flask 应用密钥
- `JWT_SECRET_KEY`: JWT 密钥

### MySQL 配置
- `MYSQL_ROOT_PASSWORD`: MySQL root 密码
- `MYSQL_USER_PASSWORD`: MySQL 应用用户密码

### GitHub OAuth 配置
- `GH_CLIENT_ID`: GitHub OAuth 客户端 ID
- `GH_CLIENT_SECRET`: GitHub OAuth 客户端密钥

### Google OAuth 配置
- `GOOGLE_CLIENT_ID`: Google OAuth 客户端 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 客户端密钥

## 生成密钥

```bash
# 生成 SECRET_KEY
python -c "import secrets; print('SECRET_KEY:', secrets.token_urlsafe(32))"

# 生成 JWT_SECRET_KEY
python -c "import secrets; print('JWT_SECRET_KEY:', secrets.token_urlsafe(32))"

# 生成 MySQL 密码
python -c "import secrets; print('MYSQL_ROOT_PASSWORD:', secrets.token_urlsafe(16))"
python -c "import secrets; print('MYSQL_USER_PASSWORD:', secrets.token_urlsafe(16))"
```

## 部署说明

- 推送到 `main` 或 `master` 分支自动触发部署
- 部署脚本会自动安装和配置 MySQL（如果不存在）
- 使用 Miniconda 管理 Python 环境
- 应用部署到 `/opt/todo-for-ai`
- 使用 systemd 管理服务

## 部署后访问

- 应用地址: http://107.175.69.178:50110
- 健康检查: http://107.175.69.178:50110/health
