# 大文件拆分（第三轮）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 继续将后端 Python 大文件拆分为更小的模块文件，提高可维护性。本轮聚焦 3 个 Flask Blueprint 文件，采用已有的 Blueprint 子模块模式（import side-effect 注册路由）。

**Architecture:** 每个 Blueprint 文件按功能域拆分为 2-3 个子模块 → 子模块从父 Blueprint 导入 `agents_bp`/`tasks_bp` 并注册路由 → `__init__.py` 通过 import side-effect 加载子模块 → 对外 API 行为不变。复用 `_shared.py` 模式共享 imports 和 helpers。

**Tech Stack:** Python 3.12, Flask (Blueprint), SQLAlchemy, 已有 `_shared.py` 共享层

**Risks:**
- tasks.py 需从单文件转为 Blueprint package（目录），需更新 `api/__init__.py` 的导入路径 → 缓解：在 `__init__.py` 中重新导出 `tasks_bp`
- workflow_runs.py 的 helper 函数（`_advance_workflow` 等）被 route handlers 和其他 helper 互相调用 → 缓解：helper 函数集中放在 `_workflow_helpers.py`，两个子模块都从此文件导入
- experiences.py 中 cross-project 路由与 experience 路由共享 `_shared.py` imports → 缓解：所有子模块共享 `_shared.py`，无需额外共享层

---

### Task 1: 拆分 workflow_runs.py（2,080 行）为 3 个子模块

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/api/agents/workflow_analytics.py`
- Create: `todo-for-ai-api-server/api/agents/_workflow_helpers.py`
- Modify: `todo-for-ai-api-server/api/agents/workflow_runs.py:1-2080`

**拆分方案：**

| 新文件 | 包含的路由/函数 | 预估行数 |
|--------|----------------|---------|
| `workflow_runs.py` (保留) | launch_workflow, list_workflow_runs, get_workflow_run, get_workflow_run_console, cancel/pause/resume/retry_workflow_run, complete_workflow_step | ~650 |
| `workflow_analytics.py` (新建) | workflow_step_stats, run_duration_percentiles, step_failure_rate, failed_steps_by_duration, failure_correlation, failure_correlation_by_step, step_cofailure_matrix, step_retry_topology, step_hourly_distribution, run_trend, success_rate_by_workflow | ~930 |
| `_workflow_helpers.py` (新建) | _evaluate_step_condition, _propagate_sub_workflow_completion, _apply_runtime_overrides, _advance_workflow, _pick_agent_for_step, _start_step, _maybe_start_sandboxed_execution, _maybe_finish_sandboxed_execution, _escalate_overdue_tasks | ~500 |

- [ ] **Step 1: 创建 _workflow_helpers.py — 提取 workflow 内部辅助函数**

从 `workflow_runs.py` 提取以下函数到新文件（行号 1463-2080）：
- `_evaluate_step_condition` (原行 1463-1515)
- `_propagate_sub_workflow_completion` (原行 1517-1573)
- `_apply_runtime_overrides` (原行 1575-1605)
- `_advance_workflow` (原行 1607-1720)
- `_pick_agent_for_step` (原行 1722-1814)
- `_start_step` (原行 1816-1978)
- `_maybe_start_sandboxed_execution` (原行 1980-2003)
- `_maybe_finish_sandboxed_execution` (原行 2005-2030)
- `_escalate_overdue_tasks` (原行 2032-2080)

新文件头部需要从 `_shared` 导入所有 helper 函数用到的 model 和工具：
```python
"""Workflow run internal helpers — step evaluation, agent picking, escalation, etc."""

from ._shared import (
    db, Agent, AgentRun, AgentRunStatus, AgentStatus,
    AuditLog, Notification, Project, RunLog, SharedContext,
    StepStatus, Task, TaskAssignment, TaskAssignmentState, TaskEvent,
    TaskStatus, Workflow, WorkflowRun, WorkflowStep, WorkflowStepRun,
    WorkflowStatus, WorkflowTrigger, AgentChannel, AgentChannelMessage,
    get_current_user, paginate_query, ApiResponse,
)
```

- [ ] **Step 2: 创建 workflow_analytics.py — 提取 workflow 分析路由**

从 `workflow_runs.py` 提取以下路由处理器（行号 164-1081）：
- `workflow_step_stats` (原行 164-231)
- `workflow_run_duration_percentiles` (原行 233-303)
- `workflow_step_failure_rate` (原行 305-363)
- `workflow_failed_steps_by_duration` (原行 365-429)
- `workflow_failure_correlation` (原行 431-569)
- `workflow_failure_correlation_by_step` (原行 571-686)
- `workflow_step_cofailure_matrix` (原行 688-769)
- `workflow_step_retry_topology` (原行 771-859)
- `workflow_step_hourly_distribution` (原行 861-929)
- `workflow_run_trend` (原行 931-1003)
- `workflow_success_rate_by_workflow` (原行 1005-1081)

新文件头部：
```python
"""Workflow run analytics routes — stats, failure analysis, trends."""

import csv
import io
from datetime import datetime, timedelta

from flask import make_response, request

from ._shared import (
    agents_bp, ApiResponse, get_request_args, paginate_query,
    unified_auth_required, get_current_user, db,
    Agent, AgentRun, AgentRunStatus, AgentStatus, AuditLog,
    Notification, Project, RunLog, SharedContext, StepStatus,
    Task, TaskAssignment, TaskAssignmentState, TaskEvent, TaskStatus,
    Workflow, WorkflowRun, WorkflowStep, WorkflowStepRun,
    WorkflowStatus, WorkflowTrigger,
    AgentChannel, AgentChannelMessage,
)
```

- [ ] **Step 3: 修改 workflow_runs.py — 只保留 CRUD 和 step 操作路由**

保留的路由（从原文件删除 analytics 路由和 helper 函数）：
- `launch_workflow` (原行 77-142)
- `list_workflow_runs` (原行 144-162)
- `get_workflow_run` (原行 1083-1092)
- `get_workflow_run_console` (原行 1094-1186)
- `cancel_workflow_run` (原行 1188-1210)
- `pause_workflow_run` (原行 1212-1233)
- `resume_workflow_run` (原行 1235-1255)
- `retry_workflow_run` (原行 1257-1299)
- `complete_workflow_step` (原行 1301-1461)

修改 import 部分，添加从 `_workflow_helpers` 导入：
```python
from ._workflow_helpers import (
    _evaluate_step_condition,
    _propagate_sub_workflow_completion,
    _apply_runtime_overrides,
    _advance_workflow,
    _pick_agent_for_step,
    _start_step,
    _maybe_start_sandboxed_execution,
    _maybe_finish_sandboxed_execution,
    _escalate_overdue_tasks,
)
```

移除 csv, io 导入（不再需要）。

- [ ] **Step 4: 更新 __init__.py — 注册新的 workflow_analytics 子模块**

文件: `todo-for-ai-api-server/api/agents/__init__.py`

在 import 列表中添加：
```python
from . import workflow_analytics  # noqa: E402
```

- [ ] **Step 5: 验证 Flask 应用启动正常**
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.agents import agents_bp; print(f'OK: {len(agents_bp.deferred_functions)} registered functions')"`
Expected:
  - Exit code: 0
  - Output contains: "OK:" and "registered functions"

- [ ] **Step 6: 提交**
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && git add api/agents/workflow_analytics.py api/agents/_workflow_helpers.py api/agents/workflow_runs.py api/agents/__init__.py && git commit -m "refactor(agents): split workflow_runs.py into analytics + helpers submodules"`

---

### Task 2: 拆分 experiences.py（1,680 行）为 3 个子模块

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/api/agents/experience_analytics.py`
- Create: `todo-for-ai-api-server/api/agents/cross_project.py`（已存在，需合并）
- Modify: `todo-for-ai-api-server/api/agents/experiences.py:1-1680`

**重要发现：** `cross_project.py` 已经存在（从 `_core.py` 拆出的）。检查是否与 experiences.py 中的 cross-project 路由重复。

- [ ] **Step 1: 检查 cross_project.py 是否已包含 experiences.py 中的 cross-project 路由**

Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && grep -n "cross-project/authorize\|cross-project/revoke\|cross-project/discover\|cross-project/capable\|external-agents" api/agents/cross_project.py`

如果存在重复路由，则 experiences.py 中的 cross-project 路由不能迁移到 cross_project.py（Flask 不允许同一路由注册两次）。需确认后再决策。

- [ ] **Step 2: 创建 experience_analytics.py — 提取 experience 分析路由**

从 `experiences.py` 提取以下路由处理器：
- `experiences_stats` (原行 166-274)
- `experiences_scatter` (原行 276-330)
- `experiences_decay_by_domain` (原行 332-405)
- `experiences_decay_by_task_type` (原行 407-477)
- `experiences_confidence_distribution` (原行 479-539)
- `experiences_source_distribution` (原行 541-598)
- `experiences_propagation_chain` (原行 600-678)
- `experiences_skill_coverage_radar` (原行 680-768)
- `experiences_reuse_trend` (原行 770-869)
- `experiences_confidence_decay_forecast` (原行 871-966)
- `experiences_low_confidence` (原行 968-1022)
- `apply_experience_decay` (原行 1490-1519)
- `validate_experience` (原行 1521-1554)
- `get_experience_validation_stats` (原行 1556-1680)

新文件头部：
```python
"""Experience analytics, decay, and validation routes."""

from datetime import datetime, timedelta

from flask import request
from sqlalchemy import func

from ._shared import (
    agents_bp, ApiResponse, get_current_user, unified_auth_required,
    db, Agent, AgentExperience, AgentReputation, Task, TaskAssignment,
    TaskAssignmentState, TaskStatus, AuditLog, KnowledgeEntry,
    get_request_args, paginate_query, _queue_sse, _client_ip,
    flush_sse_notifications, parse_enum,
)
```

- [ ] **Step 3: 修改 experiences.py — 只保留 CRUD 和操作路由**

保留的路由：
- `list_agent_experiences` (原行 33-61)
- `create_agent_experience` (原行 63-101)
- `get_agent_experience` (原行 103-121)
- `update_agent_experience` (原行 123-146)
- `delete_agent_experience` (原行 148-164)
- `recommend_experiences` (原行 1024-1062)
- `share_agent_experience` (原行 1064-1084)
- `learn_from_experience` (原行 1086-1109)
- `list_shared_experiences` (原行 1111-1136)
- `auto_extract_experiences` (原行 1138-1203)

如果 Step 1 确认 cross_project.py 无重复，则将 cross-project 路由也迁移到 cross_project.py。

- [ ] **Step 4: 更新 __init__.py — 注册新子模块**

文件: `todo-for-ai-api-server/api/agents/__init__.py`

在 import 列表中添加：
```python
from . import experience_analytics  # noqa: E402
```

- [ ] **Step 5: 验证 Flask 应用启动正常**
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.agents import agents_bp; print(f'OK: {len(agents_bp.deferred_functions)} registered functions')"`
Expected:
  - Exit code: 0
  - Output contains: "OK:" and "registered functions"

- [ ] **Step 6: 提交**
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && git add api/agents/experience_analytics.py api/agents/experiences.py api/agents/cross_project.py api/agents/__init__.py && git commit -m "refactor(agents): split experiences.py into CRUD + analytics submodules"`

---

### Task 3: 拆分 tasks.py（1,578 行）为 Blueprint package + 2 个子模块

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/api/tasks/__init__.py`
- Create: `todo-for-ai-api-server/api/tasks/_shared.py`
- Create: `todo-for-ai-api-server/api/tasks/task_analytics.py`
- Create: `todo-for-ai-api-server/api/tasks/crud.py`
- Delete: `todo-for-ai-api-server/api/tasks.py`（原单文件）

**拆分方案：**

| 新文件 | 包含的路由 | 预估行数 |
|--------|-----------|---------|
| `tasks/__init__.py` | Blueprint 定义 + 子模块 import | ~20 |
| `tasks/_shared.py` | 共享 imports + helpers | ~30 |
| `tasks/crud.py` | list_tasks, create_task, get_task, update_task, delete_task, get_subtasks, get_task_history, get_task_attachments, delete_task_attachment | ~530 |
| `tasks/task_analytics.py` | task_stats, overdue_trend, overdue_by_assignee, overdue_clustering, completion_by_project, completion_by_assignee, completion_by_priority, completion_rate_by_project, priority_trend, completion_forecast, dependency_chain, comment_sentiment_trend, rework_analysis | ~1,050 |

- [ ] **Step 1: 创建 tasks/ 目录和 _shared.py — 共享 imports 和 helpers**

```python
"""Shared imports and helpers for the tasks blueprint package."""

from datetime import datetime, timedelta
from flask import request
from sqlalchemy import func

from models import db, Task, TaskStatus, TaskPriority, Project, TaskHistory, ActionType, UserActivity
from api.base import ApiResponse, paginate_query, validate_json_request, get_request_args, APIException, handle_api_error
from core.auth import unified_auth_required, get_current_user

from . import tasks_bp
```

- [ ] **Step 2: 创建 tasks/__init__.py — Blueprint 定义 + 子模块注册**

```python
"""
Tasks API blueprint package.

Routes are split across submodules; each imports ``tasks_bp`` from this
package and registers its own routes.
"""

from flask import Blueprint

tasks_bp = Blueprint('tasks', __name__)

# Submodule imports (side-effect: registers routes on tasks_bp)
from . import crud  # noqa: E402
from . import task_analytics  # noqa: E402
```

- [ ] **Step 3: 创建 tasks/crud.py — 任务 CRUD 操作**

从原 `tasks.py` 提取以下路由（行号 18-531）：
- `list_tasks`
- `create_task`
- `get_task`
- `update_task`
- `delete_task`
- `get_subtasks`
- `get_task_history`
- `get_task_attachments`
- `delete_task_attachment`

新文件头部：
```python
"""Task CRUD routes — create, read, update, delete, subtasks, history, attachments."""

from ._shared import (
    tasks_bp, ApiResponse, paginate_query, validate_json_request,
    get_request_args, unified_auth_required, get_current_user,
    db, Task, TaskStatus, TaskPriority, Project, TaskHistory,
    ActionType, UserActivity, APIException,
)
```

- [ ] **Step 4: 创建 tasks/task_analytics.py — 任务分析路由**

从原 `tasks.py` 提取以下路由（行号 533-1578）：
- `task_stats`
- `task_overdue_trend`
- `task_overdue_by_assignee`
- `task_overdue_clustering`
- `task_completion_by_project`
- `task_completion_by_assignee`
- `task_completion_by_priority`
- `task_completion_rate_by_project`
- `task_priority_trend`
- `task_completion_forecast`
- `task_dependency_chain`
- `task_comment_sentiment_trend`
- `task_rework_analysis`

新文件头部：
```python
"""Task analytics routes — stats, overdue trends, completion, priority, dependency analysis."""

from datetime import datetime, timedelta

from flask import request
from sqlalchemy import func

from ._shared import (
    tasks_bp, ApiResponse, get_request_args, paginate_query,
    unified_auth_required, get_current_user,
    db, Task, TaskStatus, TaskPriority, Project, TaskHistory,
    ActionType, UserActivity,
)
```

- [ ] **Step 5: 更新 api/__init__.py — 更新 tasks_bp 导入路径**

文件: `todo-for-ai-api-server/api/__init__.py`

导入路径从 `.tasks` 改为 `.tasks`（路径不变，因为 `tasks/` 目录替代了 `tasks.py` 文件，Python 会自动解析为 package）。无需修改。

验证：
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api import tasks_bp; print(f'OK: {len(tasks_bp.deferred_functions)} registered functions')"`
Expected:
  - Exit code: 0
  - Output contains: "OK:" and "registered functions"

- [ ] **Step 6: 删除原 tasks.py 单文件**

Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && git rm api/tasks.py`

- [ ] **Step 7: 验证完整应用启动**
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from app import create_app; app = create_app(); print(f'OK: {len(app.blueprints)} blueprints')"`
Expected:
  - Exit code: 0
  - Output contains: "OK:" and "blueprints"

- [ ] **Step 8: 提交**
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && git add api/tasks/ api/__init__.py && git rm api/tasks.py && git commit -m "refactor(tasks): split tasks.py into Blueprint package with CRUD + analytics submodules"`

---

### Task 4: 更新父仓库子模块引用

**Depends on:** Task 1, Task 2, Task 3
**Files:**
- Modify: `todo-for-ai-api-server` (submodule reference)

- [ ] **Step 1: 提交父仓库子模块更新**
Run: `cd /home/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server && git commit -m "chore: update submodule references for large file split (round 3)"`
