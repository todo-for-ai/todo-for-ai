# Todo for AI

[![GitHub stars](https://img.shields.io/github/stars/todo-for-ai/todo-for-ai?style=flat-square)](https://github.com/todo-for-ai/todo-for-ai/stargazers)
[![GitHub license](https://img.shields.io/github/license/todo-for-ai/todo-for-ai?style=flat-square)](https://github.com/todo-for-ai/todo-for-ai/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/todo-for-ai/todo-for-ai?style=flat-square)](https://github.com/todo-for-ai/todo-for-ai/issues)
[![GitHub forks](https://img.shields.io/github/forks/todo-for-ai/todo-for-ai?style=flat-square)](https://github.com/todo-for-ai/todo-for-ai/network)
[![npm version](https://img.shields.io/npm/v/@todo-for-ai/mcp?style=flat-square&label=MCP%20版本)](https://www.npmjs.com/package/@todo-for-ai/mcp)
[![Docker Pulls](https://img.shields.io/docker/pulls/todoforai/todo-for-ai?style=flat-square)](https://hub.docker.com/r/todoforai/todo-for-ai)
[![Website](https://img.shields.io/website?url=https%3A//todo4ai.org&style=flat-square)](https://todo4ai.org)

**中文版本** | [English](README.md)

🚀 **专为AI助手设计的强大任务管理系统**，通过MCP（模型上下文协议）集成，支持智能项目管理、自动化任务跟踪和无缝团队协作。

> 🚀 **立即体验**: 访问 [https://todo4ai.org/](https://todo4ai.org/) 体验我们的产品！

## 🤖 为什么选择 Todo for AI？

**Todo for AI** 在AI助手和人类生产力工作流程之间架起了桥梁。与传统任务管理工具不同，我们的系统从底层设计就是为了通过模型上下文协议（MCP）与AI代理无缝协作。

### 🎯 **核心价值主张**

- **🔗 原生AI集成**: 通过MCP为AI助手提供一流支持，实现自然语言任务管理
- **🧠 智能自动化**: AI代理可以根据上下文和用户需求自主创建、更新和管理任务
- **📊 智能项目洞察**: AI驱动的分析和建议，助力更好的项目规划和执行
- **🔄 无缝工作流**: 在AI能力和人工监督之间架起桥梁，实现智能任务委派
- **🌐 通用兼容性**: 通过标准化MCP协议支持Claude、GPT等各种AI助手
- **⚡ 实时协作**: AI代理和人类团队成员之间的即时同步

### 🚀 **完美适用于**

- **AI优先团队** 构建未来工作方式
- **开发者** 将AI助手集成到工作流程中
- **产品经理** 协调AI代理和人类团队
- **研究人员** 管理复杂的AI驱动项目
- **任何人** 希望通过AI助手提升生产力

## 📸 截图与演示

### 🖥️ **Web界面**

<div align="center">

![Todo for AI 仪表板](docs/images/zh/dashboard-preview.png)
*现代化、直观的项目和任务管理仪表板*

![任务管理](docs/images/zh/task-management.png)
*全面的任务管理，集成AI功能*

![AI助手集成](docs/images/zh/ai-integration.png)
*通过MCP实现的无缝AI助手集成*

</div>

### 🎬 **演示视频**

[![Todo for AI 演示](https://img.youtube.com/vi/v96wqWLEHk8/0.jpg)](https://www.youtube.com/watch?v=v96wqWLEHk8)

*点击观看Todo for AI的完整演示*

### ✨ **核心功能展示**

- 🤖 **AI驱动的任务创建**: 观看AI助手自然地创建和组织任务
- 📊 **实时分析**: 查看项目进度和洞察的实时更新
- 🔄 **无缝协作**: 体验AI和人类团队成员之间的顺畅协调
- 🎯 **智能优先级**: 观察AI驱动的任务优先级和调度

## 📁 项目结构

本项目采用Git Submodule架构，将不同模块拆分到独立的仓库中：

- **todo-for-ai-api-server/**: 后端API服务器 → [todo-for-ai-api-server](https://github.com/todo-for-ai/todo-for-ai-api-server)
- **todo-for-ai-webpage/**: 前端网页应用 → [todo-for-ai-webpage](https://github.com/todo-for-ai/todo-for-ai-webpage)
- **todo-for-ai-mcp/**: MCP服务器 → [todo-for-ai-mcp](https://github.com/todo-for-ai/todo-for-ai-mcp)

## 📚 架构与规范

- [Agent 平台规范 v1.0](docs/AGENT_PLATFORM_SPEC.md)
- [API 文档](docs/API.md)
- [数据库设计](docs/database-design.md)

## 🚀 安装与快速开始

选择您偏好的安装方式：

### 🐳 **方式一：Docker（推荐）**

最快的开始方式 - 一个容器包含所有功能：

```bash
# 拉取并运行最新镜像
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
  todoforai/todo-for-ai:latest

# 访问应用
# 前端页面: http://localhost:50111/todo-for-ai/pages/projects
# API接口: http://localhost:50110/todo-for-ai/api/v1/
```

### 📦 **方式二：仅MCP包**

如果您只需要MCP服务器用于AI助手集成：

```bash
# 通过npm安装
npm install -g @todo-for-ai/mcp

# 或本地安装
npm install @todo-for-ai/mcp

# 配置并启动
todo-for-ai-mcp --config config.json
```

### 🛠️ **方式三：开发环境设置**

适合想要贡献代码或自定义的开发者：

```bash
# 1. 克隆项目（包含子模块）
git clone --recursive https://github.com/todo-for-ai/todo-for-ai.git
cd todo-for-ai

# 2. 初始化子模块（如果未使用--recursive）
git submodule update --init --recursive

# 3. 设置环境变量
cp .env.example .env
# 编辑.env文件配置您的设置

# 4. 使用Docker Compose启动
docker-compose up -d

# 或手动构建运行
docker build -t todo-for-ai:latest .
docker run -d --name todo-for-ai [环境变量] todo-for-ai:latest
```

### ⚡ **方式四：源码安装**

适合偏好手动设置的高级用户：

```bash
# 1. 克隆并设置
git clone --recursive https://github.com/todo-for-ai/todo-for-ai.git
cd todo-for-ai

# 2. 后端设置
cd todo-for-ai-api-server
pip install -r requirements.txt
python app.py

# 3. 前端设置（新终端）
cd ../todo-for-ai-webpage
npm install
npm run build
npm run preview

# 4. MCP服务器设置（新终端）
cd ../todo-for-ai-mcp
npm install
npm run build
npm start
```

### ✅ Runtime 端到端验证（本地）

在仓库根目录可直接一键验证：

```bash
# 自动创建一条 AI 任务并验证 commit -> DONE
./scripts/runtime_e2e_once.sh

# 严格模式：首个提交事件必须是目标任务
TARGET_TASK_ID=123456 STRICT_TARGET_ONLY=true ./scripts/runtime_e2e_once.sh
```

该入口会调用 `agent-runtime/scripts/run_docker_e2e_once.sh`，适配本地 Colima/Docker 环境。


## 🎯 快速开始示例

### 🤖 **与AI助手配合使用（MCP）**

安装完成后，您可以立即开始与您喜爱的AI助手一起使用Todo for AI：

```javascript
// 示例：Claude Desktop MCP配置
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": ["@todo-for-ai/mcp"],
      "env": {
        "TODO_API_URL": "http://localhost:50110/todo-for-ai/api/v1",
        "TODO_API_KEY": "your-api-key"
      }
    }
  }
}
```

```bash
# AI命令示例（自然语言）
"创建一个名为'网站重设计'的新项目"
"在网站重设计项目中添加一个'设计首页原型'的任务"
"列出我所有待处理的任务"
"将首页原型任务标记为已完成"
"显示本周的项目进度"
```

### 🌐 **Web界面使用**

```bash
# 1. 访问Web界面
open http://localhost:50111/todo-for-ai/pages/projects

# 2. 使用GitHub OAuth登录或创建账户
# 3. 创建您的第一个项目
# 4. 添加任务并开始与AI助手协作
```

### 🔧 **API集成**

```javascript
// 示例：通过API创建项目
const response = await fetch('http://localhost:50110/todo-for-ai/api/v1/projects', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    name: '我的AI项目',
    description: '由AI助手管理的项目'
  })
});

// 示例：添加任务
const taskResponse = await fetch('http://localhost:50110/todo-for-ai/api/v1/tasks', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    project_id: 1,
    title: '实现用户认证',
    content: '添加OAuth集成以实现安全用户登录',
    priority: 'high',
    is_ai_task: true
  })
});
```

### 📱 **MCP服务器配置**

```json
// MCP服务器的config.json
{
  "server": {
    "host": "localhost",
    "port": 3001
  },
  "api": {
    "baseUrl": "http://localhost:50110/todo-for-ai/api/v1",
    "timeout": 30000
  },
  "auth": {
    "type": "jwt",
    "token": "your-jwt-token"
  },
  "features": {
    "autoCreateProjects": true,
    "smartTaskBreakdown": true,
    "contextualInsights": true
  }
}
```

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

## ✨ 核心功能

### 🎯 **核心任务管理**
- 📋 **智能项目组织** - 层次化项目和任务结构，支持AI驱动的分类管理
- ✅ **智能任务跟踪** - 实时状态更新，自动化进度监控
- 🏷️ **动态标签系统** - 灵活的标签管理，AI智能推荐标签优化组织结构
- ⏰ **智能调度** - AI辅助的截止日期管理和优先级优化
- 📊 **进度分析** - 可视化仪表板，AI生成洞察和建议

### 🤖 **AI集成**
- 🔌 **MCP协议支持** - 与Claude、GPT等AI助手的原生集成
- 🗣️ **自然语言界面** - 使用对话命令创建和管理任务
- 🧠 **智能自动化** - AI代理可根据上下文自主管理任务
- 📝 **智能任务生成** - AI驱动的任务分解和子任务创建
- 🔍 **上下文洞察** - AI驱动的项目分析和优化建议

### 👥 **协作与沟通**
- 🔐 **安全认证** - 多因素认证，支持GitHub OAuth集成
- 📧 **智能通知** - 智能邮件提醒，可自定义触发条件
- 🔄 **实时同步** - 所有连接的AI代理和团队成员间的即时更新
- 💬 **集成反馈** - AI助手和人类用户间的无缝沟通
- 🌐 **跨平台访问** - Web界面配合API访问，支持自定义集成

### 🛠️ **开发者体验**
- 🐳 **Docker就绪** - 一键部署，完整容器化支持
- 🔧 **RESTful API** - 全面的API支持自定义集成和扩展
- 📚 **丰富文档** - 详细的设置、使用和自定义指南
- 🔒 **企业级安全** - 生产就绪的安全功能和合规性
- 🚀 **可扩展架构** - 微服务设计，支持高性能部署

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

---

**🌟 准备开始了吗？** 访问 [https://todo4ai.org/](https://todo4ai.org/) 体验AI驱动的任务管理的强大功能！
