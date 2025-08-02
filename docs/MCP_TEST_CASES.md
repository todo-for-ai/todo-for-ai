# MCP测试用例

本文档包含Todo for AI MCP集成的完整测试用例，用于验证系统功能和性能。

## 测试环境准备

### 前置条件

1. **系统要求**
   - Python 3.8+
   - MySQL 8.0+
   - Node.js 18+

2. **服务启动**
   ```bash
   # 启动后端服务
   cd backend
   source venv/bin/activate
   python app.py
   
   # 启动MCP服务 (使用npm包)
   npm install -g todo-for-ai-mcp
   todo-for-ai-mcp
   ```

3. **测试数据准备**
   ```bash
   # 运行数据库初始化
   python -c "
   from app import create_app
   from models import db
   app = create_app()
   with app.app_context():
       db.create_all()
   "
   ```

## 基础功能测试

### TC001: MCP服务器连接测试

**目的**: 验证MCP服务器能够正常启动和接受连接

**步骤**:
1. 启动MCP服务器
2. 发送初始化请求
3. 验证响应格式

**预期结果**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "todo-for-ai",
      "version": "1.0.0"
    }
  }
}
```

**测试命令**:
```bash
# 使用npm包进行测试
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}' | todo-for-ai-mcp
```

### TC002: 工具列表获取测试

**目的**: 验证能够获取所有可用的MCP工具

**步骤**:
1. 发送tools/list请求
2. 验证返回的工具列表

**预期结果**:
- 返回7个工具
- 包含所有必需工具: list_projects, create_project, list_tasks, create_task, update_task, delete_task, get_context_rules

**测试命令**:
```bash
# 使用npm包进行测试
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}' | todo-for-ai-mcp
```

## 项目管理测试

### TC003: 项目列表查询测试

**目的**: 验证项目列表查询功能

**测试数据**: 无特殊要求

**步骤**:
1. 调用list_projects工具
2. 验证返回格式和数据

**预期结果**:
```json
{
  "projects": [...],
  "total": <number>
}
```

**测试脚本**:
```python
async def test_list_projects():
    result = await mcp_client.call_tool("list_projects", {})
    data = json.loads(result)
    
    assert "projects" in data
    assert "total" in data
    assert isinstance(data["projects"], list)
    assert isinstance(data["total"], int)
    
    print("✅ TC003: 项目列表查询测试通过")
```

### TC004: 项目创建测试

**目的**: 验证项目创建功能

**测试数据**:
```json
{
  "name": "测试项目",
  "description": "这是一个测试项目",
  "color": "#ff6b6b"
}
```

**步骤**:
1. 调用create_project工具
2. 验证项目创建成功
3. 验证返回的项目信息

**预期结果**:
- 返回新创建的项目ID
- 项目信息正确保存

**测试脚本**:
```python
async def test_create_project():
    project_data = {
        "name": "测试项目",
        "description": "这是一个测试项目",
        "color": "#ff6b6b"
    }
    
    result = await mcp_client.call_tool("create_project", project_data)
    data = json.loads(result)
    
    assert "id" in data
    assert data["name"] == project_data["name"]
    assert data["description"] == project_data["description"]
    assert data["color"] == project_data["color"]
    
    print("✅ TC004: 项目创建测试通过")
    return data["id"]
```

## 任务管理测试

### TC005: 任务列表查询测试

**目的**: 验证任务列表查询功能和筛选条件

**测试用例**:

1. **基础查询**
   ```python
   async def test_list_tasks_basic():
       result = await mcp_client.call_tool("list_tasks", {})
       data = json.loads(result)
       
       assert "tasks" in data
       assert "total" in data
       print("✅ TC005-1: 基础任务查询通过")
   ```

2. **按项目筛选**
   ```python
   async def test_list_tasks_by_project(project_id):
       result = await mcp_client.call_tool("list_tasks", {
           "project_id": project_id
       })
       data = json.loads(result)
       
       for task in data["tasks"]:
           assert task["project_id"] == project_id
       print("✅ TC005-2: 按项目筛选测试通过")
   ```

3. **按状态筛选**
   ```python
   async def test_list_tasks_by_status():
       result = await mcp_client.call_tool("list_tasks", {
           "status": "todo"
       })
       data = json.loads(result)
       
       for task in data["tasks"]:
           assert task["status"] == "todo"
       print("✅ TC005-3: 按状态筛选测试通过")
   ```

### TC006: 任务创建测试

**目的**: 验证任务创建功能

**测试数据**:
```json
{
  "project_id": 1,
  "title": "测试任务",
  "description": "这是一个测试任务",
  "content": "# 测试任务\n\n这是任务的详细内容。",
  "status": "todo",
  "priority": "medium",
  "assignee": "测试用户"
}
```

**测试脚本**:
```python
async def test_create_task(project_id):
    task_data = {
        "project_id": project_id,
        "title": "测试任务",
        "description": "这是一个测试任务",
        "content": "# 测试任务\n\n这是任务的详细内容。",
        "status": "todo",
        "priority": "medium",
        "assignee": "测试用户"
    }
    
    result = await mcp_client.call_tool("create_task", task_data)
    data = json.loads(result)
    
    assert "id" in data
    assert data["title"] == task_data["title"]
    assert data["status"] == task_data["status"]
    assert data["priority"] == task_data["priority"]
    
    print("✅ TC006: 任务创建测试通过")
    return data["id"]
```

### TC007: 任务更新测试

**目的**: 验证任务更新功能

**测试脚本**:
```python
async def test_update_task(task_id):
    update_data = {
        "task_id": task_id,
        "status": "in_progress",
        "priority": "high"
    }
    
    result = await mcp_client.call_tool("update_task", update_data)
    data = json.loads(result)
    
    assert data["id"] == task_id
    assert "message" in data
    
    # 验证更新是否生效
    tasks = await mcp_client.call_tool("list_tasks", {"limit": 100})
    tasks_data = json.loads(tasks)
    
    updated_task = next((t for t in tasks_data["tasks"] if t["id"] == task_id), None)
    assert updated_task is not None
    assert updated_task["status"] == "in_progress"
    
    print("✅ TC007: 任务更新测试通过")
```

### TC008: 任务删除测试

**目的**: 验证任务删除功能

**测试脚本**:
```python
async def test_delete_task(task_id):
    result = await mcp_client.call_tool("delete_task", {
        "task_id": task_id
    })
    data = json.loads(result)
    
    assert data["id"] == task_id
    assert "message" in data
    
    # 验证任务已被删除
    try:
        await mcp_client.call_tool("update_task", {
            "task_id": task_id,
            "status": "done"
        })
        assert False, "任务应该已被删除"
    except Exception:
        pass  # 预期的异常
    
    print("✅ TC008: 任务删除测试通过")
```

## 上下文规则测试

### TC009: 上下文规则获取测试

**目的**: 验证上下文规则获取和合并功能

**测试脚本**:
```python
async def test_get_context_rules():
    # 测试全局规则
    result = await mcp_client.call_tool("get_context_rules", {})
    data = json.loads(result)
    
    assert "merged_content" in data
    assert "total_rules" in data
    assert "global_rules_count" in data
    assert "project_rules_count" in data
    
    print("✅ TC009-1: 全局上下文规则测试通过")

async def test_get_project_context_rules(project_id):
    # 测试项目特定规则
    result = await mcp_client.call_tool("get_context_rules", {
        "project_id": project_id
    })
    data = json.loads(result)
    
    assert "merged_content" in data
    assert data["project_id"] == project_id
    
    print("✅ TC009-2: 项目上下文规则测试通过")
```

## 错误处理测试

### TC010: 错误处理测试

**目的**: 验证各种错误情况的处理

**测试用例**:

1. **无效参数测试**
   ```python
   async def test_invalid_parameters():
       try:
           # 缺少必需参数
           await mcp_client.call_tool("create_task", {
               "title": "测试任务"  # 缺少project_id
           })
           assert False, "应该抛出异常"
       except Exception as e:
           assert "project_id" in str(e).lower()
           print("✅ TC010-1: 无效参数测试通过")
   ```

2. **资源不存在测试**
   ```python
   async def test_resource_not_found():
       try:
           # 不存在的任务ID
           await mcp_client.call_tool("update_task", {
               "task_id": 99999,
               "status": "done"
           })
           assert False, "应该抛出异常"
       except Exception as e:
           assert "not found" in str(e).lower()
           print("✅ TC010-2: 资源不存在测试通过")
   ```

## 性能测试

### TC011: 并发性能测试

**目的**: 验证系统在并发请求下的性能

**测试脚本**:
```python
import asyncio
import time

async def test_concurrent_requests():
    start_time = time.time()
    
    # 并发执行多个请求
    tasks = []
    for i in range(10):
        task = mcp_client.call_tool("list_projects", {})
        tasks.append(task)
    
    results = await asyncio.gather(*tasks)
    
    end_time = time.time()
    duration = end_time - start_time
    
    assert len(results) == 10
    assert duration < 5.0  # 应该在5秒内完成
    
    print(f"✅ TC011: 并发性能测试通过 (耗时: {duration:.2f}秒)")
```

### TC012: 大数据量测试

**目的**: 验证系统处理大量数据的能力

**测试脚本**:
```python
async def test_large_data_handling():
    # 创建大量任务
    project_id = await test_create_project()
    
    start_time = time.time()
    
    # 创建100个任务
    for i in range(100):
        await mcp_client.call_tool("create_task", {
            "project_id": project_id,
            "title": f"批量测试任务 {i+1}",
            "description": f"这是第{i+1}个批量测试任务"
        })
    
    # 查询所有任务
    result = await mcp_client.call_tool("list_tasks", {
        "project_id": project_id,
        "limit": 200
    })
    
    end_time = time.time()
    duration = end_time - start_time
    
    data = json.loads(result)
    assert data["total"] >= 100
    
    print(f"✅ TC012: 大数据量测试通过 (创建100个任务耗时: {duration:.2f}秒)")
```

## 集成测试

### TC013: 完整工作流测试

**目的**: 验证完整的AI工作流程

**测试脚本**:
```python
async def test_complete_workflow():
    print("开始完整工作流测试...")
    
    # 1. 获取项目列表
    projects = await mcp_client.call_tool("list_projects", {})
    print("✓ 获取项目列表")
    
    # 2. 创建新项目
    project_id = await test_create_project()
    print("✓ 创建项目")
    
    # 3. 创建多个任务
    task_ids = []
    for i in range(3):
        task_id = await test_create_task(project_id)
        task_ids.append(task_id)
    print("✓ 创建任务")
    
    # 4. 更新任务状态
    await test_update_task(task_ids[0])
    print("✓ 更新任务")
    
    # 5. 获取上下文规则
    await test_get_context_rules()
    print("✓ 获取上下文规则")
    
    # 6. 删除一个任务
    await test_delete_task(task_ids[-1])
    print("✓ 删除任务")
    
    print("✅ TC013: 完整工作流测试通过")
```

## 测试执行

### 运行所有测试

```python
async def run_all_tests():
    print("🧪 开始MCP测试套件")
    print("=" * 50)
    
    try:
        # 基础功能测试
        await test_list_projects()
        project_id = await test_create_project()
        
        # 任务管理测试
        await test_list_tasks_basic()
        await test_list_tasks_by_project(project_id)
        await test_list_tasks_by_status()
        
        task_id = await test_create_task(project_id)
        await test_update_task(task_id)
        
        # 上下文规则测试
        await test_get_context_rules()
        await test_get_project_context_rules(project_id)
        
        # 错误处理测试
        await test_invalid_parameters()
        await test_resource_not_found()
        
        # 性能测试
        await test_concurrent_requests()
        
        # 集成测试
        await test_complete_workflow()
        
        # 清理测试
        await test_delete_task(task_id)
        
        print("=" * 50)
        print("🎉 所有测试通过！")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(run_all_tests())
```

### 测试报告

测试完成后，系统会生成详细的测试报告，包括：

- 测试用例执行结果
- 性能指标
- 错误日志
- 覆盖率统计

## 持续集成

### GitHub Actions配置

```yaml
name: MCP Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: todo_for_ai_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
    
    - name: Run MCP tests
      run: |
        cd backend
        python -m pytest test_mcp_integration.py -v
```

这个测试用例文档提供了完整的MCP功能验证方法，确保系统的可靠性和性能。
