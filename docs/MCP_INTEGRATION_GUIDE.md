# MCP集成指南

## 概述

Todo for AI 实现了完整的 [Model Context Protocol (MCP)](https://spec.modelcontextprotocol.io/) 支持，让AI助手能够直接与任务管理系统交互。本指南详细介绍如何使用MCP功能。

## 快速开始

### 启动MCP服务

```bash
# 方法1: 使用管理脚本
cd backend
python mcp_manager.py start

# 方法2: 直接启动
cd backend
source venv/bin/activate
python simple_mcp_server.py

# 方法3: 后台启动
cd backend
source venv/bin/activate
nohup python simple_mcp_server.py > ../logs/mcp.log 2>&1 &
```

### 测试MCP连接

```bash
# 运行演示客户端
cd backend
python mcp_client_demo.py

# 运行交互式客户端
python mcp_client_demo.py interactive
```

## MCP工具列表

### 1. list_projects
列出所有项目，支持筛选和搜索。

**参数：**
- `status` (可选): 项目状态筛选 ("active", "archived", "deleted")
- `search` (可选): 按名称或描述搜索

**示例：**
```json
{
  "name": "list_projects",
  "arguments": {
    "status": "active",
    "search": "AI"
  }
}
```

### 2. create_project
创建新项目。

**参数：**
- `name` (必需): 项目名称
- `description` (可选): 项目描述
- `color` (可选): 项目颜色 (hex格式)

**示例：**
```json
{
  "name": "create_project",
  "arguments": {
    "name": "AI助手项目",
    "description": "开发智能助手功能",
    "color": "#1890ff"
  }
}
```

### 3. list_tasks
列出任务，支持多种筛选条件。

**参数：**
- `project_id` (可选): 项目ID筛选
- `status` (可选): 任务状态 ("todo", "in_progress", "review", "done", "cancelled")
- `priority` (可选): 优先级 ("low", "medium", "high", "urgent")
- `limit` (可选): 返回数量限制 (默认50)

**示例：**
```json
{
  "name": "list_tasks",
  "arguments": {
    "project_id": 1,
    "status": "todo",
    "priority": "high",
    "limit": 10
  }
}
```

### 4. create_task
创建新任务。

**参数：**
- `project_id` (必需): 所属项目ID
- `title` (必需): 任务标题
- `description` (可选): 任务描述
- `content` (可选): 任务详细内容 (Markdown格式)
- `status` (可选): 任务状态 (默认"todo")
- `priority` (可选): 优先级 (默认"medium")
- `assignee` (可选): 分配给谁

**示例：**
```json
{
  "name": "create_task",
  "arguments": {
    "project_id": 1,
    "title": "实现用户认证",
    "description": "实现JWT认证系统",
    "content": "# 用户认证实现\n\n## 需求\n- JWT token生成\n- 登录/注销功能\n- 权限验证",
    "status": "todo",
    "priority": "high",
    "assignee": "开发团队"
  }
}
```

### 5. update_task
更新现有任务。

**参数：**
- `task_id` (必需): 任务ID
- `title` (可选): 新标题
- `description` (可选): 新描述
- `content` (可选): 新内容
- `status` (可选): 新状态
- `priority` (可选): 新优先级
- `assignee` (可选): 新分配人

**示例：**
```json
{
  "name": "update_task",
  "arguments": {
    "task_id": 123,
    "status": "in_progress",
    "priority": "urgent"
  }
}
```

### 6. delete_task
删除任务。

**参数：**
- `task_id` (必需): 要删除的任务ID

**示例：**
```json
{
  "name": "delete_task",
  "arguments": {
    "task_id": 123
  }
}
```

### 7. get_context_rules
获取合并后的上下文规则。

**参数：**
- `project_id` (可选): 项目ID，用于获取项目特定规则

**示例：**
```json
{
  "name": "get_context_rules",
  "arguments": {
    "project_id": 1
  }
}
```

## AI工作流示例

### 基础工作流

```python
async def ai_basic_workflow():
    # 1. 获取项目概览
    projects = await mcp_client.call_tool("list_projects", {})
    
    # 2. 选择或创建项目
    if not projects['projects']:
        project = await mcp_client.call_tool("create_project", {
            "name": "AI工作项目",
            "description": "AI助手创建的工作项目"
        })
        project_id = project['id']
    else:
        project_id = projects['projects'][0]['id']
    
    # 3. 获取上下文规则
    context = await mcp_client.call_tool("get_context_rules", {
        "project_id": project_id
    })
    
    # 4. 基于上下文创建任务
    task = await mcp_client.call_tool("create_task", {
        "project_id": project_id,
        "title": "AI分析任务",
        "description": "基于上下文规则执行的分析任务",
        "priority": "medium"
    })
    
    return task
```

### 高级工作流

```python
async def ai_advanced_workflow():
    # 1. 分析现有任务状态
    tasks = await mcp_client.call_tool("list_tasks", {
        "status": "todo",
        "priority": "high"
    })
    
    # 2. 智能任务优先级调整
    for task in tasks['tasks']:
        # 基于某种逻辑调整优先级
        await mcp_client.call_tool("update_task", {
            "task_id": task['id'],
            "priority": "urgent"
        })
    
    # 3. 创建相关任务
    for i in range(3):
        await mcp_client.call_tool("create_task", {
            "project_id": tasks['tasks'][0]['project_id'],
            "title": f"自动生成任务 {i+1}",
            "description": "AI助手自动生成的相关任务",
            "status": "todo"
        })
    
    # 4. 生成工作报告
    all_tasks = await mcp_client.call_tool("list_tasks", {
        "project_id": tasks['tasks'][0]['project_id']
    })
    
    return {
        "processed_tasks": len(tasks['tasks']),
        "created_tasks": 3,
        "total_tasks": all_tasks['total']
    }
```

## 错误处理

### 常见错误类型

1. **连接错误**
   ```python
   try:
       result = await mcp_client.call_tool("list_projects", {})
   except ConnectionError:
       print("MCP服务器连接失败")
   ```

2. **参数错误**
   ```python
   try:
       result = await mcp_client.call_tool("create_task", {
           "title": "测试任务"  # 缺少必需的project_id
       })
   except ValueError as e:
       print(f"参数错误: {e}")
   ```

3. **资源不存在**
   ```python
   try:
       result = await mcp_client.call_tool("update_task", {
           "task_id": 99999,  # 不存在的任务ID
           "status": "done"
       })
   except Exception as e:
       print(f"任务不存在: {e}")
   ```

## 性能优化

### 批量操作

```python
# 批量创建任务
async def batch_create_tasks(project_id, task_list):
    results = []
    for task_data in task_list:
        task_data['project_id'] = project_id
        result = await mcp_client.call_tool("create_task", task_data)
        results.append(result)
    return results
```

### 缓存策略

```python
# 缓存项目列表
_project_cache = None
_cache_time = None

async def get_projects_cached():
    global _project_cache, _cache_time
    
    if _project_cache is None or time.time() - _cache_time > 300:  # 5分钟缓存
        _project_cache = await mcp_client.call_tool("list_projects", {})
        _cache_time = time.time()
    
    return _project_cache
```

## 安全考虑

### 访问控制

MCP服务器应该实现适当的访问控制：

```python
# 在实际部署中，应该添加认证
def authenticate_client(request):
    # 验证API密钥或JWT token
    api_key = request.headers.get('Authorization')
    if not validate_api_key(api_key):
        raise UnauthorizedError("Invalid API key")
```

### 输入验证

```python
# 验证输入参数
def validate_task_data(data):
    if 'title' not in data or len(data['title']) < 1:
        raise ValueError("Task title is required")
    
    if 'project_id' not in data:
        raise ValueError("Project ID is required")
    
    # 验证项目是否存在
    if not Project.query.get(data['project_id']):
        raise ValueError("Project not found")
```

## 监控和日志

### 启用详细日志

```python
import logging

# 配置MCP客户端日志
logging.getLogger('mcp_client').setLevel(logging.DEBUG)

# 记录所有MCP调用
async def logged_call_tool(name, args):
    logger.info(f"MCP调用: {name} with {args}")
    result = await mcp_client.call_tool(name, args)
    logger.info(f"MCP结果: {result}")
    return result
```

### 性能监控

```python
import time

async def timed_call_tool(name, args):
    start_time = time.time()
    result = await mcp_client.call_tool(name, args)
    duration = time.time() - start_time
    
    print(f"MCP调用 {name} 耗时: {duration:.3f}秒")
    return result
```

## 故障排除

### 常见问题

1. **服务器无法启动**
   - 检查端口是否被占用
   - 验证数据库连接
   - 查看错误日志

2. **客户端连接失败**
   - 确认服务器正在运行
   - 检查网络连接
   - 验证协议版本兼容性

3. **性能问题**
   - 启用查询缓存
   - 优化数据库索引
   - 使用连接池

### 调试技巧

```bash
# 查看MCP服务器状态
python mcp_manager.py status

# 查看详细日志
python mcp_manager.py logs --lines 100

# 健康检查
python mcp_manager.py health
```

## 扩展开发

### 添加新工具

```python
# 在simple_mcp_server.py中添加新工具
def _define_tools(self):
    tools = [
        # ... 现有工具 ...
        {
            "name": "get_task_statistics",
            "description": "Get task statistics for a project",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "integer",
                        "description": "Project ID"
                    }
                },
                "required": ["project_id"]
            }
        }
    ]
    return tools

async def _get_task_statistics(self, arguments):
    # 实现统计逻辑
    pass
```

### 自定义客户端

```python
class CustomMCPClient(TodoMCPClient):
    async def smart_task_creation(self, project_name, requirements):
        # 智能任务创建逻辑
        project = await self.find_or_create_project(project_name)
        tasks = self.analyze_requirements(requirements)
        
        for task in tasks:
            await self.create_task(project['id'], **task)
```

这个指南提供了完整的MCP集成使用说明，包括API参考、示例代码、最佳实践和故障排除指南。

## 相关文档

- [MCP测试用例](./MCP_TEST_CASES.md) - 完整的测试用例和验证方法
- [API文档](../README.md#api文档) - RESTful API文档
- [部署指南](../README.md#部署) - 系统部署说明
