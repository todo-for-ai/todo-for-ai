# 第5轮大文件拆分计划

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 继续拆分大文件为更小的模块，提高代码可维护性。

**Architecture:**
- 前端：将 `Agents.tsx` 的功能模态框抽取为独立组件
- 后端：将 `api/agents/_core.py` 的路由按功能域拆分为子模块
- MCP：继续简化 `api-client.ts` 的委托层

**Tech Stack:**
- 前端: React 18, TypeScript, Ant Design 5
- 后端: Flask, SQLAlchemy
- MCP: TypeScript, axios

**Risks:**
- Agents.tsx 拆分复杂度高，状态管理需谨慎
- _core.py 路由拆分需确保不破坏现有 API 契约

---

## Pre-Planning Analysis

**Feature:** 大文件拆分第5轮
**Scope:** 前端 + 后端 + MCP 客户端
**Files Create:**
- `todo-for-ai-api-server/api/agents/task_templates.py` — 任务模板路由
- `todo-for-ai-api-server/api/agents/workflow_routes.py` — 工作流路由
- `todo-for-ai-api-server/api/agents/project_members.py` — 项目成员路由
- `todo-for-ai-api-server/api/agents/assignments.py` — 任务分配路由

**Files Modify:**
- `todo-for-ai-api-server/api/agents/_core.py:1-1415` — 移除已拆分路由
- `todo-for-ai-api-server/api/agents/__init__.py` — 导入新子模块

**Tasks:** 4 tasks
**Order:** Task 1-3 并行，Task 4 最后
**Risks:**
- 路由拆分后需验证 API 端点数量不变
- 需更新子模块导入确保 Flask Blueprint 注册正确

---

### Task 1: 拆分 task_templates 路由

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/api/agents/task_templates.py`
- Modify: `todo-for-ai-api-server/api/agents/_core.py:905-1082`

- [ ] **Step 1: 创建 task_templates.py — 任务模板 CRUD 路由**

从 `_core.py` 提取以下 5 个路由：
- `list_task_templates` (GET /task-templates)
- `create_task_template` (POST /task-templates)
- `update_task_template` (PUT /task-templates/<id>)
- `delete_task_template` (DELETE /task-templates/<id>)
- `instantiate_task_template` (POST /task-templates/<id>/instantiate)

```python
"""
Task template API routes.

CRUD operations for task templates and template instantiation.
"""

from flask import request

from ._shared import (
    agents_bp,
    ApiResponse,
    validate_json_request,
    get_current_user,
    unified_auth_required,
    db,
    TaskTemplate,
    Task,
    TaskStatus,
    TaskPriority,
    Project,
)

# 类型/参数解析辅助函数从 _shared 导入
from ._shared import parse_enum


@agents_bp.route("/task-templates", methods=["GET"])
@unified_auth_required
def list_task_templates():
    """List all task templates for the current user."""
    # ... 从 _core.py 复制实现
    pass


@agents_bp.route("/task-templates", methods=["POST"])
@unified_auth_required
def create_task_template():
    """Create a new task template."""
    # ... 从 _core.py 复制实现
    pass


@agents_bp.route("/task-templates/<int:template_id>", methods=["PUT"])
@unified_auth_required
def update_task_template(template_id):
    """Update an existing task template."""
    # ... 从 _core.py 复制实现
    pass


@agents_bp.route("/task-templates/<int:template_id>", methods=["DELETE"])
@unified_auth_required
def delete_task_template(template_id):
    """Delete a task template."""
    # ... 从 _core.py 复制实现
    pass


@agents_bp.route("/task-templates/<int:template_id>/instantiate", methods=["POST"])
@unified_auth_required
def instantiate_task_template(template_id):
    """Instantiate a task template into actual tasks."""
    # ... 从 _core.py 复制实现
    pass
```

- [ ] **Step 2: 从 _core.py 移除 task_templates 路由**
文件: `todo-for-ai-api-server/api/agents/_core.py:905-1082`

删除以下函数：
- `list_task_templates`
- `create_task_template`
- `update_task_template`
- `delete_task_template`
- `instantiate_task_template`
- `_workflow_owned_by_user` (仅被 templates 使用)

- [ ] **Step 3: 更新 __init__.py 导入新模块**
文件: `todo-for-ai-api-server/api/agents/__init__.py`

```python
# 在现有导入后添加
from . import task_templates  # noqa: F401
```

- [ ] **Step 4: 验证路由数量**
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.agents import agents_bp; print(len([r for r in agents_bp.routes]))"`
Expected:
  - Exit code: 0
  - Output contains: 路由数量保持不变

- [ ] **Step 5: 提交**
Run: `git add api/agents/task_templates.py api/agents/_core.py api/agents/__init__.py && git commit -m "refactor(agents): extract task_templates routes from _core.py

- Move 5 task template routes to dedicated module
- Reduce _core.py from 1415 to ~1250 lines

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 2: 拆分 workflow 路由

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/api/agents/workflow_routes.py`
- Modify: `todo-for-ai-api-server/api/agents/_core.py:1092-1251`

- [ ] **Step 1: 创建 workflow_routes.py — 工作流 CRUD 路由**

从 `_core.py` 提取以下 5 个路由：
- `list_workflows` (GET /workflows)
- `create_workflow` (POST /workflows)
- `get_workflow` (GET /workflows/<id>)
- `update_workflow` (PUT /workflows/<id>)
- `delete_workflow` (DELETE /workflows/<id>)

```python
"""
Workflow API routes.

CRUD operations for workflows.
"""

from flask import request

from ._shared import (
    agents_bp,
    ApiResponse,
    validate_json_request,
    get_current_user,
    unified_auth_required,
    db,
    Workflow,
    WorkflowStatus,
    WorkflowStep,
    WorkflowTrigger,
    WorkflowVersion,
)


@agents_bp.route("/workflows", methods=["GET"])
@unified_auth_required
def list_workflows():
    """List all workflows for the current user."""
    # ... 从 _core.py 复制实现
    pass


# ... 其他路由
```

- [ ] **Step 2: 从 _core.py 移除 workflow 路由**
文件: `todo-for-ai-api-server/api/agents/_core.py:1092-1251`

删除以下函数：
- `list_workflows`
- `create_workflow`
- `get_workflow`
- `update_workflow`
- `delete_workflow`

- [ ] **Step 3: 更新 __init__.py**
文件: `todo-for-ai-api-server/api/agents/__init__.py`

```python
from . import workflow_routes  # noqa: F401
```

- [ ] **Step 4: 验证路由数量**
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.agents import agents_bp; print(len([r for r in agents_bp.routes]))"`
Expected:
  - Exit code: 0

- [ ] **Step 5: 提交**
Run: `git add api/agents/workflow_routes.py api/agents/_core.py api/agents/__init__.py && git commit -m "refactor(agents): extract workflow routes from _core.py

- Move 5 workflow routes to dedicated module
- Reduce _core.py from ~1250 to ~1100 lines

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 3: 拆分 project_members 路由

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/api/agents/project_members.py`
- Modify: `todo-for-ai-api-server/api/agents/_core.py:1257-1415`

- [ ] **Step 1: 创建 project_members.py — 项目成员管理路由**

从 `_core.py` 提取以下 4 个路由：
- `list_project_members` (GET /projects/<id>/members)
- `add_project_member` (POST /projects/<id>/members)
- `update_project_member` (PUT /projects/<id>/members/<mid>)
- `remove_project_member` (DELETE /projects/<id>/members/<mid>)

```python
"""
Project member management API routes.

Manage project membership and roles.
"""

from flask import request

from ._shared import (
    agents_bp,
    ApiResponse,
    validate_json_request,
    get_current_user,
    unified_auth_required,
    db,
    Project,
    ProjectMember,
    ProjectRole,
)


@agents_bp.route("/projects/<int:project_id>/members", methods=["GET"])
@unified_auth_required
def list_project_members(project_id):
    """List members of a project with their roles."""
    # ... 从 _core.py 复制实现
    pass


# ... 其他路由
```

- [ ] **Step 2: 从 _core.py 移除 project_members 路由**
文件: `todo-for-ai-api-server/api/agents/_core.py:1257-1415`

删除以下函数：
- `list_project_members`
- `add_project_member`
- `update_project_member`
- `remove_project_member`

- [ ] **Step 3: 更新 __init__.py**
文件: `todo-for-ai-api-server/api/agents/__init__.py`

```python
from . import project_members  # noqa: F401
```

- [ ] **Step 4: 验证路由数量**
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.agents import agents_bp; print(len([r for r in agents_bp.routes]))"`
Expected:
  - Exit code: 0

- [ ] **Step 5: 提交**
Run: `git add api/agents/project_members.py api/agents/_core.py api/agents/__init__.py && git commit -m "refactor(agents): extract project_members routes from _core.py

- Move 4 project member routes to dedicated module
- Reduce _core.py from ~1100 to ~950 lines

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`

---

### Task 4: 更新父仓库子模块指针

**Depends on:** Task 1, Task 2, Task 3
**Files:**
- Modify: `todo-for-ai-api-server` (gitlink)

- [ ] **Step 1: 在父仓库更新子模块引用**
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server && git commit -m "chore: update submodule references for agents routes extraction

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`
Expected:
  - Exit code: 0

- [ ] **Step 2: 提交计划文档**
Run: `git add docs/superpowers/plans/2026-07-22-large-file-split-round5.md && git commit -m "docs: add round 5 large file split plan

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"`
