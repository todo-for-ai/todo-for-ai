# Todo for AI

[中文版本](README_zh.md) | **English**

A task management system specifically designed for AI assistants, supporting project management, task tracking, and team collaboration.

> 🚀 **Try it now**: Visit [https://todo4ai.org/](https://todo4ai.org/) to experience our product!

## 📁 Project Structure

This project uses Git Submodule architecture, splitting different modules into independent repositories:

- **todo-for-ai-api-server/**: Backend API server → [todo-for-ai-api-server](https://github.com/todo-for-ai/todo-for-ai-api-server)
- **todo-for-ai-webpage/**: Frontend web application → [todo-for-ai-webpage](https://github.com/todo-for-ai/todo-for-ai-webpage)
- **todo-for-ai-mcp/**: MCP server → [todo-for-ai-mcp](https://github.com/todo-for-ai/todo-for-ai-mcp)

## 🚀 Quick Start

### 1. Clone the project (including submodules)

```bash
git clone --recursive https://github.com/todo-for-ai/todo-for-ai.git
cd todo-for-ai
```

### 2. Initialize submodules (if not using --recursive)

```bash
git submodule update --init --recursive
```

## 🚀 Docker Deployment

### 1. Build image
```bash
docker build -t todo-for-ai:latest .
```

### 2. Start container
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

### 3. Access URLs
- Frontend: http://localhost:50111/todo-for-ai/pages/projects
- API: http://localhost:50110/todo-for-ai/api/v1/

### 4. Environment Variables
| Variable | Description |
|----------|-------------|
| DATABASE_URL | Database connection string |
| GMAIL_USER | Gmail email address |
| GMAIL_PASSWORD | Gmail app password |
| GITHUB_TOKEN | GitHub access token |
| GITHUB_CLIENT_ID | GitHub OAuth app ID |
| GITHUB_CLIENT_SECRET | GitHub OAuth app secret |
| SECRET_KEY | Flask secret key |
| JWT_SECRET_KEY | JWT secret key |

## 🔧 Configuration

### GitHub OAuth App Setup

1. Visit [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in application information:
   - **Application name**: Todo for AI
   - **Homepage URL**: http://localhost:50111
   - **Authorization callback URL**: http://localhost:50110/todo-for-ai/api/v1/auth/callback
4. Get `Client ID` and `Client Secret` after creation

### Gmail App Password Setup

1. Login to Gmail account
2. Go to "Manage your Google Account"
3. Select "Security" → "2-Step Verification"
4. Generate "App passwords"

### GitHub Token Setup

1. Login to GitHub
2. Go to Settings → Developer settings → Personal access tokens
3. Generate new token with appropriate permissions

## ✨ Features

- Project management
- Task tracking
- User authentication
- Email notifications
- GitHub integration
- AI assistant integration via MCP

## 🔍 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check if database is running
mysql -u username -p -h localhost

# Check container logs
docker logs todo-for-ai
```

#### 2. Port Already in Use
```bash
# Check port usage
lsof -i :50110
lsof -i :50111

# Kill process
kill -9 <PID>
```

#### 3. Frontend Page Cannot Load
```bash
# Check nginx configuration
docker exec todo-for-ai nginx -t

# Restart nginx
docker exec todo-for-ai supervisorctl restart nginx
```

#### 4. API Authentication Failed
- Check if environment variables are set correctly
- Confirm Gmail app password format is correct
- Verify GitHub Token permissions

### Log Viewing

```bash
# View all logs
docker logs todo-for-ai

# View Flask logs
docker exec todo-for-ai tail -f /var/log/supervisor/flask.out.log

# View Nginx logs
docker exec todo-for-ai tail -f /var/log/nginx/access.log
```

## 🧪 Testing

### API Testing

```bash
# Test backend health
curl http://localhost:50110/

# Test API proxy
curl http://localhost:50111/todo-for-ai/api/v1/projects

# Test frontend page
curl http://localhost:50111/todo-for-ai/pages/projects
```

### Functional Testing

1. Access frontend page
2. Try login functionality
3. Create projects and tasks
4. Test email notifications

## 🚀 Production Deployment

### Security Configuration

1. **Use Strong Passwords**: Ensure database and application keys are complex enough
2. **HTTPS Configuration**: Configure SSL certificates for production environment
3. **Firewall Settings**: Restrict unnecessary port access
4. **Regular Backups**: Set up automatic database backups

### Performance Optimization

1. **Resource Limits**: Set memory and CPU limits for containers
2. **Load Balancing**: Configure load balancing for multi-instance deployment
3. **Cache Configuration**: Consider adding Redis cache
4. **Monitoring & Alerting**: Configure application monitoring and alerting

## 🤝 Contributing

Issues and Pull Requests are welcome!

### Development Workflow

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Create a Pull Request

## 📄 License

MIT License

---

**🌟 Ready to get started?** Visit [https://todo4ai.org/](https://todo4ai.org/) and experience the power of AI-driven task management!
