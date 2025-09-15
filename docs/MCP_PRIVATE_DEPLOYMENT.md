# MCP私有部署配置指南

本文档详细说明如何在私有部署环境中配置MCP（Model Context Protocol）功能。

## 📋 概述

私有部署Todo for AI后，MCP配置需要指向私有部署的API端点，而不是SaaS版本的端点。

### API端点对比

| 环境 | API端点 | 说明 |
|------|---------|------|
| SaaS版本 | `https://todo4ai.org/todo-for-ai/api/v1` | 公共服务 |
| 私有部署 | `http://YOUR_DOMAIN:50110/todo-for-ai/api/v1` | 私有服务 |

**重要**: 注意私有部署使用的是**50110端口**（API端口），不是50111端口（前端端口）。

## 🔧 配置方法

### 方法1：Claude Desktop配置

编辑Claude Desktop配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": [
        "--yes",
        "@todo-for-ai/mcp@latest",
        "--api-base-url",
        "http://YOUR_DOMAIN:50110/todo-for-ai/api/v1",
        "--api-token",
        "your-api-token-here"
      ]
    }
  }
}
```

### 方法2：Cursor IDE配置

在Cursor的设置中添加MCP配置：

1. 打开Cursor设置
2. 搜索"MCP"或"Model Context Protocol"
3. 添加以下配置：

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": [
        "--yes",
        "@todo-for-ai/mcp@latest",
        "--api-base-url",
        "http://YOUR_DOMAIN:50110/todo-for-ai/api/v1",
        "--api-token",
        "your-api-token-here",
        "--log-level",
        "info"
      ]
    }
  }
}
```

### 方法3：环境变量配置

设置系统环境变量：

**Linux/macOS**:
```bash
export TODO_API_BASE_URL="http://YOUR_DOMAIN:50110/todo-for-ai/api/v1"
export TODO_API_TOKEN="your-api-token-here"
export TODO_API_TIMEOUT="10000"
```

**Windows**:
```cmd
set TODO_API_BASE_URL=http://YOUR_DOMAIN:50110/todo-for-ai/api/v1
set TODO_API_TOKEN=your-api-token-here
set TODO_API_TIMEOUT=10000
```

**Windows PowerShell**:
```powershell
$env:TODO_API_BASE_URL="http://YOUR_DOMAIN:50110/todo-for-ai/api/v1"
$env:TODO_API_TOKEN="your-api-token-here"
$env:TODO_API_TIMEOUT="10000"
```

### 方法4：配置文件

创建 `config.json` 文件：

```json
{
  "TODO_API_BASE_URL": "http://YOUR_DOMAIN:50110/todo-for-ai/api/v1",
  "TODO_API_TOKEN": "your-api-token-here",
  "TODO_API_TIMEOUT": "10000",
  "LOG_LEVEL": "info"
}
```

## 🔑 获取API Token

1. **访问私有部署Web界面**：
   ```
   http://YOUR_DOMAIN:50111/todo-for-ai/pages/login
   ```

2. **登录账户**：
   - 使用GitHub或Google登录

3. **进入设置页面**：
   - 点击右上角用户头像
   - 选择"设置"或"Settings"

4. **创建API Token**：
   - 找到"API Token"部分
   - 点击"创建新Token"
   - 输入Token名称（如"MCP Client"）
   - 复制生成的Token

5. **在MCP配置中使用Token**：
   - 将复制的Token替换配置中的`your-api-token-here`

## ✅ 验证配置

### 1. 重启AI客户端

配置完成后，必须重启AI客户端：
- **Claude Desktop**: 完全退出并重新启动
- **Cursor**: 重启应用
- **其他IDE**: 按照相应的重启方法

### 2. 测试API连接

使用curl测试API连接：

```bash
# 测试健康检查
curl http://YOUR_DOMAIN:50110/todo-for-ai/api/v1/health

# 测试API Token认证
curl -H "Authorization: Bearer your-api-token-here" \
     http://YOUR_DOMAIN:50110/todo-for-ai/api/v1/projects
```

### 3. 在AI客户端中测试

向AI发送测试消息：

```
请列出我的Todo项目
```

如果配置正确，AI应该能够：
- 连接到私有部署的API
- 获取你的项目列表
- 显示项目详情

## 🔍 故障排除

### 常见问题

#### 1. 连接超时或拒绝连接

**可能原因**：
- API端点地址错误
- 端口号错误（应该是50110，不是50111）
- 防火墙阻止连接
- 私有部署服务未运行

**解决方案**：
```bash
# 检查服务状态
docker ps -f name=todo-for-ai

# 检查端口是否开放
telnet YOUR_DOMAIN 50110

# 检查API健康状态
curl http://YOUR_DOMAIN:50110/todo-for-ai/api/v1/health
```

#### 2. 认证失败

**可能原因**：
- API Token错误或过期
- Token格式不正确

**解决方案**：
- 重新创建API Token
- 检查Token是否完整复制
- 确认Token在配置中正确设置

#### 3. MCP服务器启动失败

**可能原因**：
- MCP包版本过旧
- 配置文件格式错误
- 环境变量冲突

**解决方案**：
```bash
# 更新MCP包
npm install -g @todo-for-ai/mcp@latest

# 检查配置文件JSON格式
cat claude_desktop_config.json | jq .

# 清除环境变量
unset TODO_API_BASE_URL
unset TODO_API_TOKEN
```

### 调试模式

启用详细日志以便调试：

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": [
        "--yes",
        "@todo-for-ai/mcp@latest",
        "--api-base-url",
        "http://YOUR_DOMAIN:50110/todo-for-ai/api/v1",
        "--api-token",
        "your-api-token-here",
        "--log-level",
        "debug"
      ]
    }
  }
}
```

## 📝 配置模板

### 本地开发环境

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": [
        "--yes",
        "@todo-for-ai/mcp@latest",
        "--api-base-url",
        "http://localhost:50110/todo-for-ai/api/v1",
        "--api-token",
        "your-local-api-token",
        "--log-level",
        "debug"
      ]
    }
  }
}
```

### 内网部署环境

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": [
        "--yes",
        "@todo-for-ai/mcp@latest",
        "--api-base-url",
        "http://192.168.1.100:50110/todo-for-ai/api/v1",
        "--api-token",
        "your-internal-api-token",
        "--api-timeout",
        "15000"
      ]
    }
  }
}
```

### 生产环境（HTTPS）

```json
{
  "mcpServers": {
    "todo-for-ai": {
      "command": "npx",
      "args": [
        "--yes",
        "@todo-for-ai/mcp@latest",
        "--api-base-url",
        "https://your-domain.com/todo-for-ai/api/v1",
        "--api-token",
        "your-production-api-token",
        "--log-level",
        "warn"
      ]
    }
  }
}
```

## 🔄 配置更新

当私有部署地址或Token发生变化时：

1. **更新配置文件**中的相应参数
2. **重启AI客户端**以加载新配置
3. **测试连接**确保配置正确
4. **清除缓存**（如果需要）

## 📚 相关文档

- [私有部署指南](./PRIVATE_DEPLOYMENT.md)
- [快速部署指南](./QUICK_DEPLOY.md)
- [MCP官方文档](https://modelcontextprotocol.io/)

---

**注意**: 请将文档中的 `YOUR_DOMAIN` 和 `your-api-token-here` 替换为实际的值。
