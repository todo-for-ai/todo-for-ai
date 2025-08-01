# Todo for AI

一个专为AI助手设计的任务管理系统，支持项目管理、任务跟踪和团队协作。

## 🚀 Docker 部署

### 1. 构建镜像
```bash
docker build -t todo-for-ai:latest .
```

### 2. 启动容器
```bash
docker run -d --name todo-for-ai \
  -p 50111:80 \
  -p 50110:50110 \
  -e DATABASE_URL="mysql+pymysql://username:password@host.docker.internal:3306/todo_for_ai" \
  -e GMAIL_USER="your-email@gmail.com" \
  -e GMAIL_PASSWORD="your-app-password" \
  -e GITHUB_TOKEN="your-github-token" \
  -e SECRET_KEY="your-secret-key-here" \
  -e JWT_SECRET_KEY="your-jwt-secret-key-here" \
  --add-host=host.docker.internal:host-gateway \
  todo-for-ai:latest
```

### 3. 访问地址
- 前端页面: http://localhost:50111/todo-for-ai/pages/projects
- API接口: http://localhost:50110/todo-for-ai/api/v1/

### 4. 环境变量说明
| 变量 | 说明 |
|------|------|
| DATABASE_URL | 数据库连接字符串 |
| GMAIL_USER | Gmail邮箱地址 |
| GMAIL_PASSWORD | Gmail应用密码 |
| GITHUB_TOKEN | GitHub访问令牌 |
| GITHUB_CLIENT_ID | GitHub OAuth应用ID |
| GITHUB_CLIENT_SECRET | GitHub OAuth应用密钥 |
| SECRET_KEY | Flask密钥 |
| JWT_SECRET_KEY | JWT密钥 |

## 🔧 配置说明

### GitHub OAuth应用设置

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写应用信息：
   - **Application name**: Todo for AI
   - **Homepage URL**: http://localhost:50111
   - **Authorization callback URL**: http://localhost:50110/todo-for-ai/api/v1/auth/callback
4. 创建后获取 `Client ID` 和 `Client Secret`

### Gmail应用密码设置

1. 登录Gmail账户
2. 进入"管理您的Google账户"
3. 选择"安全性" → "两步验证"
4. 生成"应用密码"

### GitHub Token获取

1. 登录GitHub
2. 进入Settings → Developer settings → Personal access tokens
3. 生成新的token，选择适当的权限

##  功能特性

- 项目管理
- 任务跟踪
- 用户认证
- 邮件通知
- GitHub集成

## 🔍 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查数据库是否运行
mysql -u username -p -h localhost

# 检查容器日志
docker logs todo-for-ai
```

#### 2. 端口被占用
```bash
# 查看端口占用
lsof -i :50110
lsof -i :50111

# 杀死占用进程
kill -9 <PID>
```

#### 3. 前端页面无法加载
```bash
# 检查nginx配置
docker exec todo-for-ai nginx -t

# 重启nginx
docker exec todo-for-ai supervisorctl restart nginx
```

#### 4. API认证失败
- 检查环境变量是否正确设置
- 确认Gmail应用密码格式正确
- 验证GitHub Token权限

### 日志查看

```bash
# 查看所有日志
docker logs todo-for-ai

# 查看Flask日志
docker exec todo-for-ai tail -f /var/log/supervisor/flask.out.log

# 查看Nginx日志
docker exec todo-for-ai tail -f /var/log/nginx/access.log
```

## 🧪 测试

### API测试

```bash
# 测试后端健康状态
curl http://localhost:50110/

# 测试API代理
curl http://localhost:50111/todo-for-ai/api/v1/projects

# 测试前端页面
curl http://localhost:50111/todo-for-ai/pages/projects
```

### 功能测试

1. 访问前端页面
2. 尝试登录功能
3. 创建项目和任务
4. 测试邮件通知

## 🚀 生产部署建议

### 安全配置

1. **使用强密码**：确保数据库和应用密钥足够复杂
2. **HTTPS配置**：生产环境建议配置SSL证书
3. **防火墙设置**：限制不必要的端口访问
4. **定期备份**：设置数据库自动备份

### 性能优化

1. **资源限制**：为容器设置内存和CPU限制
2. **负载均衡**：多实例部署时配置负载均衡
3. **缓存配置**：考虑添加Redis缓存
4. **监控告警**：配置应用监控和告警

## 🤝 贡献

欢迎提交Issue和Pull Request！

### 开发流程

1. Fork项目
2. 创建功能分支
3. 提交代码
4. 创建Pull Request

## 📄 许可证

MIT License
