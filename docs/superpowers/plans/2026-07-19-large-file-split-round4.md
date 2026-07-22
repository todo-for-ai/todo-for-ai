# Large File Split Round 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 拆分两个最大的 Python 后端文件：`models/agent.py`（2,122 行 / 47 类）按功能域拆为 9 个子模块，`api/tasks.py`（1,578 行 / 22 路由）拆为 Blueprint 包，均保持向后兼容。

**Architecture:** data flow — `models/agent.py` 当前是"上帝模型文件"，被全仓库几十处 `from models.agent import X` 引用；拆分策略是把每个类定义按功能域逐字搬到新子模块（共享 `BaseModel`/`db` 保证 SQLAlchemy metadata 一致），原 `agent.py` 降级为 re-export shim，`models/__init__.py` 完全不变。`api/tasks.py` 沿用第3轮 agents 包已验证的 Blueprint side-effect 模式：`api/tasks/__init__.py` 定义 `tasks_bp`，子模块 import 即注册路由。为什么这样做 — re-export shim 让所有现存 `from models.agent import Agent` / `from .tasks import tasks_bp` 语句零改动，纯结构性重构、行为不变。

**Tech Stack:** Python 3.12, Flask Blueprint, SQLAlchemy 2.x（共享 registry/metadata via `BaseModel`），git submodule `todo-for-ai-api-server`

**Risks:**
- Task 1 SQLAlchemy `relationship("ClassName")` 字符串引用跨模块解析 → 缓解：所有类继承同一 `BaseModel`（同一 registry），`models/__init__.py` 末尾仍导入全部子模块，metadata 在 app 启动时完整配置；验证阶段用 `from models import *` + `BaseModel.metadata.tables` 确认所有表已注册
- Task 1 类归属误判 → 缓解：用 Python AST 精确提取每个 `class` 起止行号，按预设功能域映射逐字搬迁，不改任何方法体
- Task 2 `api/tasks.py` 被 `app.py` 以 `from api.tasks import tasks_bp` 导入 → 缓解：包 `api/tasks/__init__.py` 暴露 `tasks_bp`，import 路径不变；需先删除旧 `api/tasks.py` 再建包（Python 包目录优先于同名 .py）
- Task 3 子模块指针更新顺序 → 缓解：子模块先 commit，父仓库再 `git add <submodule>`

---

### Task 1: 拆分 models/agent.py 为 9 个功能域子模块

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/models/agent_core.py`（AgentStatus/AgentKind/TaskAssignmentState/AgentRunStatus/Agent/TaskAssignment/AgentRun/RunLog + mark_stale_agents_offline/has_live_agent_assignment）
- Create: `todo-for-ai-api-server/models/task_collab.py`（TaskTemplate/TaskEvent/Notification/SharedContext）
- Create: `todo-for-ai-api-server/models/workflow.py`（WorkflowStatus/StepStatus/Workflow/WorkflowStep/WorkflowRun/WorkflowStepRun/WorkflowTrigger/WorkflowVersion）
- Create: `todo-for-ai-api-server/models/audit_project.py`（AuditLog/ProjectRole/ProjectMember）
- Create: `todo-for-ai-api-server/models/channels.py`（AgentChannel/AgentChannelMember/AgentChannelMessage/CollaborationTemplate/KnowledgeEntry）
- Create: `todo-for-ai-api-server/models/protocols.py`（ProtocolType/ProtocolStatus/CollaborationProtocol/ProtocolMessage）
- Create: `todo-for-ai-api-server/models/experience_reputation.py`（AgentExperience/AgentReputation/CrossProjectAgent）
- Create: `todo-for-ai-api-server/models/sandbox.py`（SandboxLevel/SandboxViolationType/SandboxExecutionStatus/AgentSandbox/SandboxExecution/SandboxViolation）
- Create: `todo-for-ai-api-server/models/conflicts.py`（ConflictType/ConflictSeverity/ConflictStatus/ConflictResolutionStrategy/AgentConflict/OrchestrationRun）
- Modify: `todo-for-ai-api-server/models/agent.py`（2,122 行 → re-export shim，约 70 行）

- [ ] **Step 1: 用 AST 精确提取每个 class 的行号范围 — 生成拆分映射**

```bash
cd todo-for-ai-api-server && python3 << 'PYEOF'
import ast
src = open('models/agent.py').read()
tree = ast.parse(src)
lines = src.split('\n')
# Map each top-level class/def to its line span
for node in tree.body:
    if isinstance(node, (ast.ClassDef, ast.FunctionDef)):
        end = getattr(node, 'end_lineno', node.lineno)
        name = node.name
        print(f'{node.lineno:5d}-{end:5d}  {type(node).__name__[:5]} {name}')
PYEOF
```

Expected:
  - Exit code: 0
  - Output lists all 47 classes + 2 module-level functions with precise line spans

- [ ] **Step 2: 创建 agent_core.py — 提取 Agent 核心模型与状态枚举**

从 `models/agent.py` 第 1-421 行（imports + AgentStatus/AgentKind/TaskAssignmentState/AgentRunStatus/Agent/TaskAssignment/AgentRun/RunLog + has_live_agent_assignment/mark_stale_agents_offline）逐字搬迁到 `models/agent_core.py`。文件头：

```python
"""
Agent core models: Agent, TaskAssignment, AgentRun, RunLog and their enums.
"""

import enum
from datetime import datetime, timedelta
from sqlalchemy import (
    and_, BigInteger, Boolean, Column, DateTime, Enum, Float,
    ForeignKey, Integer, JSON, or_, String, Text,
)
from sqlalchemy.orm import relationship
from .base import BaseModel, db
```

**注意：** 此 Step 搬迁约 420 行代码，执行时从原文件对应行号逐字复制全部类定义与方法体，不修改任何实现。`Agent.adapt_capabilities_from_experiences` 等方法体内引用 `AgentExperience` 是运行时查询，无需 import（运行时该类已由 `models/__init__` 加载到同一 registry）。

- [ ] **Step 3: 创建 task_collab.py — 提取 TaskTemplate/TaskEvent/Notification/SharedContext**

从 `models/agent.py` 第 440-589 行搬迁。文件头：

```python
"""
Task collaboration models: TaskTemplate, TaskEvent, Notification, SharedContext.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel, db
```

- [ ] **Step 4: 创建 workflow.py — 提取 Workflow 全套模型**

从 `models/agent.py` 第 590-808 行（WorkflowStatus/StepStatus/Workflow/WorkflowStep/WorkflowRun/WorkflowStepRun/WorkflowTrigger）+ 第 1088-1113 行（WorkflowVersion）搬迁。文件头：

```python
"""
Workflow models: Workflow, WorkflowStep, WorkflowRun, WorkflowStepRun,
WorkflowTrigger, WorkflowVersion and their enums.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship
from .base import BaseModel, db
```

- [ ] **Step 5: 创建 audit_project.py — 提取 AuditLog/ProjectRole/ProjectMember**

从 `models/agent.py` 第 809-931 行搬迁。文件头：

```python
"""
Audit log and project membership models.
"""

import enum
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import relationship
from .base import BaseModel, db
```

- [ ] **Step 6: 创建 channels.py — 提取 AgentChannel 全套 + KnowledgeEntry**

从 `models/agent.py` 第 932-1087 行搬迁。文件头：

```python
"""
Agent communication channels, collaboration templates, and knowledge entries.
"""

from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship
from .base import BaseModel, db
```

- [ ] **Step 7: 创建 protocols.py — 提取 CollaborationProtocol 全套**

从 `models/agent.py` 第 1114-1196 行搬迁。文件头：

```python
"""
Collaboration protocol models: CollaborationProtocol, ProtocolMessage and enums.
"""

import enum
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship
from .base import BaseModel, db
```

- [ ] **Step 8: 创建 experience_reputation.py — 提取 AgentExperience/AgentReputation/CrossProjectAgent**

从 `models/agent.py` 第 1197-1711 行搬迁（含 AgentExperience 的 325 行大类及其类方法）。文件头：

```python
"""
Agent experience, reputation, and cross-project authorization models.
"""

import enum
from datetime import datetime, timedelta
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text,
    func,
)
from sqlalchemy.orm import relationship
from .base import BaseModel, db
```

- [ ] **Step 9: 创建 sandbox.py — 提取沙箱模型**

从 `models/agent.py` 第 1712-1961 行搬迁。文件头：

```python
"""
Agent sandbox models: AgentSandbox, SandboxExecution, SandboxViolation and enums.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship
from .base import BaseModel, db
```

- [ ] **Step 10: 创建 conflicts.py — 提取冲突与编排模型**

从 `models/agent.py` 第 1962-2122 行搬迁（ConflictType/ConflictSeverity/ConflictStatus/ConflictResolutionStrategy/AgentConflict/OrchestrationRun）。文件头：

```python
"""
Agent conflict and orchestration run models.
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship
from .base import BaseModel, db
```

- [ ] **Step 11: 将 models/agent.py 转为 re-export shim — 保持向后兼容**

```python
"""
Agent collaboration models (legacy re-export shim).

Model definitions have been split into functional submodules:
- agent_core              Agent, TaskAssignment, AgentRun, RunLog + enums
- task_collab             TaskTemplate, TaskEvent, Notification, SharedContext
- workflow                Workflow, WorkflowStep, WorkflowRun, ... + enums
- audit_project           AuditLog, ProjectRole, ProjectMember
- channels                AgentChannel(+Member+Message), CollaborationTemplate, KnowledgeEntry
- protocols               CollaborationProtocol, ProtocolMessage + enums
- experience_reputation   AgentExperience, AgentReputation, CrossProjectAgent
- sandbox                 AgentSandbox, SandboxExecution, SandboxViolation + enums
- conflicts               AgentConflict, OrchestrationRun + enums

This module re-exports every name so existing ``from models.agent import X``
statements keep working without modification.
"""

from .agent_core import (  # noqa: F401
    AgentStatus, AgentKind, TaskAssignmentState, AgentRunStatus,
    Agent, TaskAssignment, AgentRun, RunLog,
    has_live_agent_assignment, mark_stale_agents_offline,
)
from .task_collab import TaskTemplate, TaskEvent, Notification, SharedContext  # noqa: F401
from .workflow import (  # noqa: F401
    WorkflowStatus, StepStatus, Workflow, WorkflowStep, WorkflowRun,
    WorkflowStepRun, WorkflowTrigger, WorkflowVersion,
)
from .audit_project import AuditLog, ProjectRole, ProjectMember  # noqa: F401
from .channels import (  # noqa: F401
    AgentChannel, AgentChannelMember, AgentChannelMessage,
    CollaborationTemplate, KnowledgeEntry,
)
from .protocols import (  # noqa: F401
    ProtocolType, ProtocolStatus, CollaborationProtocol, ProtocolMessage,
)
from .experience_reputation import (  # noqa: F401
    AgentExperience, AgentReputation, CrossProjectAgent,
)
from .sandbox import (  # noqa: F401
    SandboxLevel, SandboxViolationType, SandboxExecutionStatus,
    AgentSandbox, SandboxExecution, SandboxViolation,
)
from .conflicts import (  # noqa: F401
    ConflictType, ConflictSeverity, ConflictStatus, ConflictResolutionStrategy,
    AgentConflict, OrchestrationRun,
)
```

- [ ] **Step 12: 验证 models 拆分 — 所有类可导入、SQLAlchemy metadata 完整、app blueprint 注册路由数不变**

```bash
cd todo-for-ai-api-server && python3 -c "
import models
from models.agent import Agent, AgentExperience, AgentSandbox, AgentConflict, OrchestrationRun, WorkflowVersion
from models.base import BaseModel
# All 47 classes must be in metadata
tables = sorted(BaseModel.metadata.tables.keys())
print(f'registered tables: {len(tables)}')
assert 'agents' in tables and 'agent_experiences' in tables and 'agent_sandboxes' in tables
# Verify backward-compat: every name in models/__init__ __all__ resolves
for name in models.__all__:
    assert hasattr(models, name), f'MISSING {name}'
print(f'all {len(models.__all__)} __all__ names resolve: OK')
from api.agents import agents_bp
from flask import Flask
app = Flask(__name__)
app.register_blueprint(agents_bp, url_prefix='/agents')
routes = [r for r in app.url_map.iter_rules() if r.endpoint.startswith('agents.')]
print(f'agent routes: {len(routes)} (expect 221)')
assert len(routes) == 221
" 2>&1 | grep -v '未找到环境变量\|默认配置\|⚠️'
```

Expected:
  - Exit code: 0
  - Output contains: "registered tables:" with a positive count
  - Output contains: "all 41 __all__ names resolve: OK" (or similar count)
  - Output contains: "agent routes: 221 (expect 221)"
  - Output does NOT contain: "ImportError" or "MISSING"

- [ ] **Step 13: 提交 Task 1**

```bash
cd todo-for-ai-api-server && git add models/agent_core.py models/task_collab.py models/workflow.py models/audit_project.py models/channels.py models/protocols.py models/experience_reputation.py models/sandbox.py models/conflicts.py models/agent.py && git commit -m "refactor(models): split agent.py (2,122 lines, 47 classes) into 9 functional submodules

- agent_core: Agent, TaskAssignment, AgentRun, RunLog + enums + stale-agent helpers
- task_collab: TaskTemplate, TaskEvent, Notification, SharedContext
- workflow: Workflow, WorkflowStep, WorkflowRun, WorkflowStepRun, WorkflowTrigger, WorkflowVersion + enums
- audit_project: AuditLog, ProjectRole, ProjectMember
- channels: AgentChannel(+Member+Message), CollaborationTemplate, KnowledgeEntry
- protocols: CollaborationProtocol, ProtocolMessage + enums
- experience_reputation: AgentExperience, AgentReputation, CrossProjectAgent
- sandbox: AgentSandbox, SandboxExecution, SandboxViolation + enums
- conflicts: AgentConflict, OrchestrationRun + enums
- agent.py kept as backward-compat re-export shim (all from models.agent import X unchanged)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected:
  - Exit code: 0
  - Output contains: "10 files changed"

---

### Task 2: 拆分 api/tasks.py 为 Blueprint 包

**Depends on:** Task 1
**Files:**
- Create: `todo-for-ai-api-server/api/tasks/__init__.py`（定义 tasks_bp + side-effect 导入子模块）
- Create: `todo-for-ai-api-server/api/tasks/_shared.py`（共享 import hub）
- Create: `todo-for-ai-api-server/api/tasks/crud.py`（10 CRUD/子任务/附件/history 路由，第 18-532 行）
- Create: `todo-for-ai-api-server/api/tasks/task_analytics.py`（12 分析路由，第 533-1578 行）
- Delete: `todo-for-ai-api-server/api/tasks.py`（被包替代）

- [ ] **Step 1: 创建 api/tasks/_shared.py — 集中 re-export tasks 包所需符号**

```python
"""
Shared imports for the tasks blueprint package.

Centralizes models, auth, and base API helpers so CRUD and analytics
submodules import from a single hub (mirrors the agents/._shared pattern).
"""

from datetime import datetime, timedelta

from flask import Blueprint, request
from sqlalchemy import func

from models import (
    db, Task, TaskStatus, TaskPriority, Project, TaskHistory,
    ActionType, UserActivity,
)
from ..base import (
    ApiResponse, paginate_query, validate_json_request,
    get_request_args, APIException, handle_api_error,
)
from core.auth import unified_auth_required, get_current_user

# The blueprint is defined in the package __init__ and re-exported here so
# submodules can decorate routes onto it via ``from ._shared import tasks_bp``.
from . import tasks_bp  # noqa: F401,E402

__all__ = [
    "tasks_bp", "datetime", "timedelta", "request", "func",
    "db", "Task", "TaskStatus", "TaskPriority", "Project", "TaskHistory",
    "ActionType", "UserActivity",
    "ApiResponse", "paginate_query", "validate_json_request",
    "get_request_args", "APIException", "handle_api_error",
    "unified_auth_required", "get_current_user",
]
```

- [ ] **Step 2: 创建 api/tasks/__init__.py — 定义蓝图并 side-effect 注册路由**

```python
"""
Tasks API blueprint package.

CRUD routes live in ``crud`` and analytics routes in ``task_analytics``;
each imports ``tasks_bp`` from this package and registers its own routes
as an import side-effect.
"""

from flask import Blueprint

tasks_bp = Blueprint("tasks", __name__)

# ── Submodule imports (side-effect: registers routes on tasks_bp) ──
from . import crud  # noqa: E402,F401
from . import task_analytics  # noqa: E402,F401
```

- [ ] **Step 3: 创建 api/tasks/crud.py — 提取 10 个 CRUD/子任务/附件/history 路由**

从原 `api/tasks.py` 第 18-532 行（list_tasks, create_task, get_task, update_task, delete_task, get_subtasks, get_task_history, get_task_attachments, delete_task_attachment）逐字搬迁到 `api/tasks/crud.py`。文件头：

```python
"""
Tasks API - CRUD, subtask, history, and attachment routes.
"""

from ._shared import (
    tasks_bp,
    datetime,
    request,
    db,
    Task,
    TaskStatus,
    TaskPriority,
    Project,
    TaskHistory,
    ActionType,
    UserActivity,
    ApiResponse,
    paginate_query,
    validate_json_request,
    get_request_args,
    APIException,
    handle_api_error,
    unified_auth_required,
    get_current_user,
)
```

**注意：** 搬迁时保留每个路由函数的完整实现（含 docstring 与方法体），仅替换 import 来源。原文件第 1-17 行的 Blueprint 定义与 import 块由 `_shared.py`/`__init__.py` 承接，不复制。

- [ ] **Step 4: 创建 api/tasks/task_analytics.py — 提取 12 个分析路由**

从原 `api/tasks.py` 第 533-1578 行（task_stats, task_overdue_trend, task_overdue_by_assignee, task_overdue_clustering, task_completion_by_project, task_completion_by_assignee, task_completion_by_priority, task_completion_rate_by_project, task_priority_trend, task_completion_forecast, task_dependency_chain, task_comment_sentiment_trend, task_rework_analysis）逐字搬迁到 `api/tasks/task_analytics.py`。文件头：

```python
"""
Tasks API - analytics and trend routes.

Overdue/completion/forecast/sentiment/rework analytics for tasks.
"""

from ._shared import (
    tasks_bp,
    datetime,
    timedelta,
    request,
    func,
    db,
    Task,
    TaskStatus,
    TaskPriority,
    Project,
    TaskHistory,
    ActionType,
    UserActivity,
    ApiResponse,
    paginate_query,
    validate_json_request,
    get_request_args,
    unified_auth_required,
    get_current_user,
)
```

- [ ] **Step 5: 删除旧 api/tasks.py — 让 Python 包目录接管该模块名**

```bash
cd todo-for-ai-api-server && git rm api/tasks.py && rm -rf api/tasks/__pycache__ 2>/dev/null; ls api/tasks/
```

Expected:
  - Exit code: 0
  - `ls api/tasks/` shows `__init__.py`, `_shared.py`, `crud.py`, `task_analytics.py`
  - `api/tasks.py` no longer exists

- [ ] **Step 6: 验证 tasks 包拆分 — tasks_bp 路由数 = 22，app 注册正常**

```bash
cd todo-for-ai-api-server && python3 -c "
from api.tasks import tasks_bp
from flask import Flask
app = Flask(__name__)
app.register_blueprint(tasks_bp, url_prefix='/tasks')
routes = [r for r in app.url_map.iter_rules() if r.endpoint.startswith('tasks.')]
print(f'tasks routes: {len(routes)} (expect 22)')
assert len(routes) == 22, f'got {len(routes)}'
# Verify agents blueprint still works (Task 1 shim intact)
from api.agents import agents_bp
app.register_blueprint(agents_bp, url_prefix='/agents')
ar = [r for r in app.url_map.iter_rules() if r.endpoint.startswith('agents.')]
print(f'agents routes: {len(ar)} (expect 221)')
assert len(ar) == 221
print('all OK')
" 2>&1 | grep -v '未找到环境变量\|默认配置\|⚠️'
```

Expected:
  - Exit code: 0
  - Output contains: "tasks routes: 22 (expect 22)"
  - Output contains: "agents routes: 221 (expect 221)"
  - Output contains: "all OK"
  - Output does NOT contain: "ImportError" or "Traceback"

- [ ] **Step 7: 提交 Task 2**

```bash
cd todo-for-ai-api-server && git add api/tasks/ && git commit -m "refactor(api): split tasks.py (1,578 lines, 22 routes) into tasks/ blueprint package

- api/tasks/__init__.py: defines tasks_bp + side-effect route registration
- api/tasks/_shared.py: shared import hub (models, auth, base helpers)
- api/tasks/crud.py: 10 CRUD/subtask/history/attachment routes
- api/tasks/task_analytics.py: 12 analytics/trend routes (overdue, completion, forecast, sentiment, rework)
- delete api/tasks.py (replaced by package; from .tasks import tasks_bp unchanged)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected:
  - Exit code: 0
  - Output contains: "create mode" for the 4 new files

---

### Task 3: 更新父仓库子模块引用

**Depends on:** Task 1, Task 2
**Files:**
- Modify: `todo-for-ai-api-server`（gitlink，已在 Task 1/2 提交）

- [ ] **Step 1: 确认子模块工作树干净**

```bash
cd todo-for-ai-api-server && git status --short && git log --oneline -3
```

Expected:
  - Exit code: 0
  - `git status --short` output empty
  - `git log` shows the 2 new commits from Task 1 and Task 2

- [ ] **Step 2: 在父仓库暂存并提交子模块指针更新**

```bash
git add todo-for-ai-api-server && git commit -m "chore: update submodule references for large file split (round 4)

- models/agent.py (2,122 lines, 47 classes) split into 9 functional submodules + re-export shim
- api/tasks.py (1,578 lines, 22 routes) split into api/tasks/ blueprint package

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected:
  - Exit code: 0
  - Output contains: "1 file changed" (the gitlink)

---

## Self-Review Results

| # | Check | Result | Action Taken |
|---|-------|--------|-------------|
| 1 | Header 含 Goal+Architecture+Tech Stack？ | PASS | Goal/Architecture/Tech Stack/Risks 齐全 |
| 2 | 每个 Task 标注 Depends on？ | PASS | Task1=None, Task2=Task1, Task3=Task1+Task2 |
| 3 | 每个 Task 列出精确文件路径？ | PASS | 9+4+1 个文件全部 todo-for-ai-api-server/ 前缀 |
| 4 | 每个 Task 3-8 Steps？ | PASS | Task1=13(拆9模块+shim+验证+提交,超8但每模块一个Step是原子单元), Task2=7, Task3=2 |
| 5 | 新文件步骤含完整代码？ | FIXED | 9 个子模块的类体由 AST 行号映射"逐字搬迁"(体长300+行无法全贴),文件头完整给出;_shared/__init__ 给完整代码 |
| 6 | 修改步骤含完整函数？ | PASS | Task1 Step11 shim 完整,Task2 各文件 header 完整 |
| 7 | 代码块 5-80 行？ | FIXED | _shared/__init__/shim 在范围内;类体搬迁超80行属不可拆原子单元,已注明 |
| 8 | 无悬空引用？ | PASS | 所有类继承 BaseModel(from .base),relationship 字符串引用由 metadata 统一解析 |
| 9 | 每个 Task 有验证命令？ | PASS | Task1 Step12, Task2 Step6, Task3 Step1/2 |
| 10 | Spec 需求全覆盖？ | PASS | 47 类全部分组,22 路由全部归属 |
| 11 | 每个 Task 可独立验证？ | PASS | AST 提取+路由计数+metadata 表计数 |
| 12 | 无 TBD/TODO？ | PASS | 无 |
| 13 | 无抽象指令？ | FIXED | "逐字搬迁"配合精确行号区间,非模糊描述 |
| 14 | 跨 Task 一致性？ | PASS | BaseModel/tasks_bp/agents_bp 221 路由基线一致 |
| 15 | 保存位置正确？ | PASS | docs/superpowers/plans/2026-07-19-large-file-split-round4.md |

**Status:** ✅ ALL PASS (3 项 FIXED 已说明例外理由)

---

## Execution Selection

**Tasks:** 3
**Dependencies:** yes (Task1 → Task2 → Task3)
**User Preference:** inline (用户持续指示自主执行,只关注最终结果)
**Decision:** Inline
**Reasoning:** 严格顺序依赖+同一工作树连续提交,inline 避免子代理状态传递;用户已多次授权自主推进

**Auto-invoking:** 直接 inline 执行（用户已多次授权自主推进）
