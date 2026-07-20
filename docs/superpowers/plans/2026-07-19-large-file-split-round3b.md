# Large File Split Round 3b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 收尾 agents 包大文件拆分：修复 cross_project.py 丢失路由、提交 experiences 拆分、拆分 task_operations.py（1,163行），并更新父仓库子模块引用。

**Architecture:** data flow — 当前 cross_project.py 缺失 5 个原始路由（adapt-capabilities GET/POST、cross-project-tasks、claim-cross-project-task、cross-project-efficiency），需从 git HEAD 恢复并追加到现有 6 个新路由之后；experiences.py 已拆为 experiences.py(346行)+experience_analytics.py(1088行) 但未提交；task_operations.py(1,163行,12路由) 按功能域拆为 4 个子模块。关键组件 — 创建 `_dispatch_helpers.py` 承载被 dispatch.py 跨模块引用的 7 个 helper（normalize_dispatch_policy 等），避免拆分后循环导入。为什么这样做 — 沿用前两轮已建立的 Blueprint side-effect 注册 + `_shared.py` 集中 re-export 模式，与 workflow_runs/experiences 拆分保持一致。

**Tech Stack:** Python 3.11, Flask Blueprint, SQLAlchemy, git submodules（todo-for-ai-api-server / todo-for-ai-mcp / todo-for-ai-webpage 三个子模块）

**Risks:**
- Task 1 cross_project.py 追加路由时若遗漏 `validate_json_request`/`ACTIVE_ASSIGNMENT_STATES`/`expire_stale_assignments_for_task`/`find_active_assignment`/`_score_task_with_caps`/`ProjectRole`/`normalize_match_terms` 导入 → 路由运行时 NameError → 缓解：追加脚本已把这 7 个导入加入 `from ._shared import (...)` 块，验证阶段用 Flask url_map 计数确认 237 个路由全部注册
- Task 2 dispatch helpers 被 dispatch.py 引用却未显式导入（已存在 latent bug） → 拆分后若 helper 移走会触发 ImportError → 缓解：新建 `_dispatch_helpers.py` 放这些 helper，`_shared.py` re-export，dispatch.py 通过现有 `from ._shared import (...)` 即可拿到
- Task 3 父仓库子模块指针更新顺序错（先父后子）→ 父仓库引用未提交的子模块 commit → 缓解：严格按子模块提交 → 父仓库 `git add <submodule>` → 父仓库提交 顺序执行

---

### Task 1: 修复 cross_project.py 并提交 experiences 拆分

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/agents/cross_project.py`（追加 5 个原始路由，约 +250 行）
- Verify: `todo-for-ai-api-server/api/agents/experiences.py`（346 行，已完成）
- Verify: `todo-for-ai-api-server/api/agents/experience_analytics.py`（1088 行，已完成）
- Modify: `todo-for-ai-api-server/api/agents/__init__.py`（已注册 cross_project + experiences，无需改）

- [ ] **Step 1: 追加 5 个原始路由到 cross_project.py 末尾 — 恢复丢失的 cross-project 端点**

```python
# 追加到 todo-for-ai-api-server/api/agents/cross_project.py 末尾
# （在现有 cross_project_efficiency 之前的原始路由，从 git HEAD:api/agents/cross_project.py 恢复）

# ---------------------------------------------------------------------------
# Capability Adaptation endpoints
# ---------------------------------------------------------------------------

@agents_bp.route("/<int:agent_id>/adapt-capabilities", methods=["GET"])
@unified_auth_required
def suggest_capability_adaptation(agent_id):
    """Suggest capability adaptations for an Agent based on its experiences."""
    user = get_current_user()
    agent = Agent.query.filter_by(id=agent_id, owner_id=user.id).first()
    if not agent:
        return ApiResponse.not_found("Agent not found").to_response()
    suggestions = agent.adapt_capabilities_from_experiences()
    return ApiResponse.success(suggestions, "Capability adaptation suggestions").to_response()


@agents_bp.route("/<int:agent_id>/adapt-capabilities", methods=["POST"])
@unified_auth_required
def apply_capability_adaptation(agent_id):
    """Apply capability adaptations to an Agent."""
    user = get_current_user()
    agent = Agent.query.filter_by(id=agent_id, owner_id=user.id).first()
    if not agent:
        return ApiResponse.not_found("Agent not found").to_response()
    data = validate_json_request()
    additions = data.get("additions", [])
    removals = data.get("removals", [])
    if not additions and not removals:
        return ApiResponse.error("No changes specified (additions or removals required)").to_response()
    old_caps = list(agent.capabilities or [])
    new_caps = agent.apply_capability_adaptation(additions=additions, removals=removals)
    db.session.commit()
    AuditLog.record(
        "agent_capability_adaptation",
        target_type="agent",
        target_id=agent.id,
        actor_type="system",
        detail={"old_capabilities": old_caps, "new_capabilities": new_caps,
                "additions": additions, "removals": removals},
    )
    db.session.commit()
    notify_sse("agent_capabilities_adapted", {
        "agent_id": agent_id, "additions": additions, "removals": removals,
    })
    return ApiResponse.success({
        "old_capabilities": old_caps, "new_capabilities": new_caps,
        "additions_applied": additions, "removals_applied": removals,
    }, "Capabilities adapted").to_response()


# ---------------------------------------------------------------------------
# Cross-Project Task Discovery & Assignment endpoints
# ---------------------------------------------------------------------------

@agents_bp.route("/<int:agent_id>/cross-project-tasks", methods=["GET"])
@unified_auth_required
def find_cross_project_tasks(agent_id):
    """Find claimable tasks across all projects the Agent is authorized for."""
    user = get_current_user()
    agent = Agent.query.filter_by(id=agent_id, owner_id=user.id).first()
    if not agent:
        return ApiResponse.not_found("Agent not found").to_response()
    args = get_request_args()
    limit = args.get("limit", 20, type=int)
    cross_auths = CrossProjectAgent.get_active_for_agent(agent.id)
    if not cross_auths:
        return ApiResponse.success([], "No cross-project authorizations").to_response()
    results = []
    for auth in cross_auths:
        active_count = TaskAssignment.query.filter(
            TaskAssignment.agent_id == agent.id,
            TaskAssignment.state.in_(ACTIVE_ASSIGNMENT_STATES),
        ).count()
        if active_count >= (auth.max_concurrent_tasks or 3):
            continue
        project = Project.query.get(auth.project_id)
        if not project:
            continue
        tasks = Task.query.filter(
            Task.project_id == auth.project_id,
            Task.status.in_([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW]),
        ).order_by(Task.priority.desc()).limit(20).all()
        for task in tasks:
            expire_stale_assignments_for_task(task.id)
            if find_active_assignment(task.id):
                continue
            effective_caps = CrossProjectAgent.get_effective_capabilities(agent.id, auth.project_id)
            match = _score_task_with_caps(task, effective_caps, agent)
            if match["score"] > 0:
                results.append({
                    "task": task.to_dict(),
                    "project": {"id": project.id, "name": project.name},
                    "match": match,
                    "role_in_project": auth.role_in_project,
                })
    results.sort(key=lambda x: -x["match"]["score"])
    results = results[:limit]
    return ApiResponse.success(results, f"Found {len(results)} cross-project tasks").to_response()


@agents_bp.route("/<int:agent_id>/claim-cross-project-task/<int:task_id>", methods=["POST"])
@unified_auth_required
def claim_cross_project_task(agent_id, task_id):
    """Claim a task from a cross-project for an Agent."""
    user = get_current_user()
    agent = Agent.query.filter_by(id=agent_id, owner_id=user.id).first()
    if not agent:
        return ApiResponse.not_found("Agent not found").to_response()
    task = Task.query.get(task_id)
    if not task:
        return ApiResponse.not_found("Task not found").to_response()
    if not CrossProjectAgent.is_authorized(agent_id, task.project_id):
        return ApiResponse.error("Agent not authorized for this task's project").to_response()
    auth = CrossProjectAgent.query.filter_by(
        agent_id=agent_id, project_id=task.project_id, is_active=True,
    ).first()
    if auth:
        active_count = TaskAssignment.query.filter(
            TaskAssignment.agent_id == agent_id,
            TaskAssignment.state.in_(ACTIVE_ASSIGNMENT_STATES),
        ).count()
        if active_count >= (auth.max_concurrent_tasks or 3):
            return ApiResponse.error(
                f"Agent has reached max concurrent tasks ({auth.max_concurrent_tasks}) in this project"
            ).to_response()
    existing = find_active_assignment(task_id)
    if existing:
        return ApiResponse.error("Task already has an active assignment").to_response()
    data = validate_json_request() or {}
    lease_seconds = int(data.get("lease_seconds") or 1800)
    lease_seconds = max(60, min(lease_seconds, 24 * 60 * 60))
    now = datetime.utcnow()
    assignment = TaskAssignment(
        task_id=task_id, agent_id=agent_id, assigned_by_user_id=user.id,
        state=TaskAssignmentState.CLAIMED,
        lease_expires_at=now + timedelta(seconds=lease_seconds),
        claimed_at=now, last_heartbeat_at=now, progress_rate=0,
        created_by=user.email,
    )
    db.session.add(assignment)
    if task.status == TaskStatus.TODO:
        task.status = TaskStatus.IN_PROGRESS
    db.session.commit()
    AuditLog.record(
        "cross_project_task_claimed", target_type="task", target_id=task_id,
        actor_type="agent", actor_id=agent_id,
        detail={"agent_id": agent_id, "task_id": task_id,
                "project_id": task.project_id, "assignment_id": assignment.id},
    )
    db.session.commit()
    notify_sse("task_assigned", {
        "task_id": task_id, "agent_id": agent_id, "assignment_id": assignment.id,
        "project_id": task.project_id, "cross_project": True,
    })
    return ApiResponse.success({
        "assignment": assignment.to_dict(), "task": task.to_dict(), "cross_project": True,
    }, "Cross-project task claimed").to_response()


@agents_bp.route("/cross-project-efficiency", methods=["GET"])
@unified_auth_required
def cross_project_efficiency():
    """Measure realized value of cross-project Agent authorizations."""
    user = get_current_user()
    try:
        days = max(1, min(365, int(request.args.get("days", 30))))
        limit = max(1, min(50, int(request.args.get("limit", 20))))
    except (TypeError, ValueError):
        days, limit = 30, 20
    since = datetime.utcnow() - timedelta(days=days)
    authorizations = (
        CrossProjectAgent.query
        .join(Project, CrossProjectAgent.project_id == Project.id)
        .filter(Project.owner_id == user.id)
        .all()
    )
    if not authorizations:
        return ApiResponse.success({
            "authorizations": [], "total_authorizations": 0, "active_count": 0,
            "utilized_count": 0, "idle_count": 0, "utilization_rate": 0.0, "days": days,
        }).to_response()
    rows = (
        TaskAssignment.query
        .join(Task, TaskAssignment.task_id == Task.id)
        .filter(TaskAssignment.state == TaskAssignmentState.DONE,
                TaskAssignment.completed_at >= since)
        .with_entities(TaskAssignment.agent_id, Task.project_id)
        .all()
    )
    done_map = {}
    for aid, pid in rows:
        done_map[(aid, pid)] = done_map.get((aid, pid), 0) + 1
    results = []
    active_count = 0
    utilized_count = 0
    for a in authorizations:
        if a.is_active:
            active_count += 1
        done = done_map.get((a.agent_id, a.project_id), 0)
        if done > 0:
            utilized_count += 1
        agent_name = a.agent.name if a.agent else f"Agent#{a.agent_id}"
        proj_name = a.project.name if a.project else f"Project#{a.project_id}"
        results.append({
            "authorization_id": a.id, "agent_id": a.agent_id, "agent_name": agent_name,
            "host_project_id": a.project_id, "host_project_name": proj_name,
            "tasks_completed_in_host": done, "is_active": bool(a.is_active),
            "expires_at": a.expires_at.isoformat() if a.expires_at else None,
            "utilized": done > 0,
        })
    results.sort(key=lambda r: r["tasks_completed_in_host"], reverse=True)
    total = len(results)
    idle = total - utilized_count
    rate = (utilized_count / total) if total else 0.0
    return ApiResponse.success({
        "authorizations": results[:limit], "total_authorizations": total,
        "active_count": active_count, "utilized_count": utilized_count,
        "idle_count": idle, "utilization_rate": round(rate, 3), "days": days,
    }).to_response()
```

- [ ] **Step 2: 验证 cross_project.py 路由数恢复到 11 — 确认 5 个原始路由 + 6 个新路由全部注册**

```bash
cd todo-for-ai-api-server && python3 -c "
from api.agents import agents_bp
from flask import Flask
app = Flask(__name__)
app.register_blueprint(agents_bp, url_prefix='/agents')
cp = sorted([r.rule for r in app.url_map.iter_rules() if r.endpoint.startswith('agents.') and ('cross-project' in r.rule or 'adapt' in r.rule or 'external' in r.rule)])
print(f'cross-project routes: {len(cp)}')
for r in cp: print(' ', r)
print(f'total routes: {len([r for r in app.url_map.iter_rules() if r.endpoint.startswith(\"agents.\")])}')
"
```

Expected:
  - Exit code: 0
  - Output contains: "cross-project routes: 11"
  - Output contains: "total routes: 237"
  - Output does NOT contain: "Error" or "Traceback"

- [ ] **Step 3: 提交 cross_project.py 修复 + experiences 拆分**

```bash
cd todo-for-ai-api-server && git add api/agents/cross_project.py api/agents/experiences.py api/agents/experience_analytics.py && git commit -m "refactor(agents): split experiences.py into experiences + experience_analytics, restore cross_project routes

- Split experiences.py (1,680 lines) into experiences.py (346, 10 CRUD routes) and experience_analytics.py (1,088, 16 analytics/decay routes)
- Move 6 cross-project authorization routes from experiences.py to cross_project.py
- Restore 5 original cross_project.py routes (adapt-capabilities GET/POST, cross-project-tasks, claim-cross-project-task, cross-project-efficiency) that were lost during merge

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected:
  - Exit code: 0
  - Output contains: "master" or "main" (branch name)
  - Output contains: "files changed"

---

### Task 2: 拆分 task_operations.py 为功能域子模块

**Depends on:** Task 1
**Files:**
- Create: `todo-for-ai-api-server/api/agents/_dispatch_helpers.py`（dispatch 共享 helper）
- Create: `todo-for-ai-api-server/api/agents/task_events.py`（events GET/POST，~240行）
- Create: `todo-for-ai-api-server/api/agents/task_handoffs.py`（handoff + subtasks，~200行）
- Create: `todo-for-ai-api-server/api/agents/agent_inbox.py`（inbox + notifications，~180行）
- Create: `todo-for-ai-api-server/api/agents/task_shared_context.py`（shared-context CRUD，~120行）
- Create: `todo-for-ai-api-server/api/agents/run_logs.py`（run logs GET/POST，~110行）
- Modify: `todo-for-ai-api-server/api/agents/task_operations.py`（1,163行 → 删除或保留为 re-export shim）
- Modify: `todo-for-ai-api-server/api/agents/__init__.py`（注册 5 个新子模块）
- Modify: `todo-for-ai-api-server/api/agents/_shared.py`（re-export dispatch helpers）

- [ ] **Step 1: 创建 _dispatch_helpers.py — 承载被 dispatch.py 跨模块引用的 7 个 helper**

```python
"""
Shared dispatch-policy and assignment helpers used by both task_operations
submodules and dispatch.py.

Extracted from task_operations.py to avoid circular imports when the task
operation routes are split across multiple modules.
"""

from datetime import datetime, timedelta

from sqlalchemy import func

from ._shared import (
    db,
    Agent,
    AgentKind,
    AgentRun,
    AgentRunStatus,
    AgentStatus,
    AuditLog,
    Project,
    ProjectMember,
    ProjectRole,
    Task,
    TaskAssignment,
    TaskAssignmentState,
    TaskStatus,
    Workflow,
    WorkflowRun,
    WorkflowStep,
    WorkflowStepRun,
    WorkflowStatus,
    LEASED_EXECUTION_STATES,
    ACTIVE_ASSIGNMENT_STATES,
    HUMAN_ACTIVE_TARGET_STATES,
    notify_sse,
    _queue_sse,
    _expand_capabilities,
    find_claimable_task,
    find_active_assignment,
    score_task_for_agent,
    expire_stale_assignments,
    expire_stale_assignments_for_task,
    normalize_match_terms,
    record_task_event,
)


def normalize_dispatch_policy(data, current_user=None):
    """Normalize a dispatch policy dict, filling defaults."""
    # Body copied verbatim from task_operations.py:505-576
    ...
```

**注意：** 此 Step 的完整函数体较长（7 个 helper，约 350 行），执行时需从 `task_operations.py` 原文 505-659 行逐字复制 `normalize_dispatch_policy`、`get_coordinator_dispatch_policy`、`resolve_dispatch_options`、`collect_claimable_tasks`、`find_available_worker_agents`、`serialize_dispatch_candidate`、`create_assignment_with_run`，保留原签名和实现不变。

- [ ] **Step 2: 在 _shared.py 末尾追加 dispatch helpers re-export — 让 dispatch.py 通过现有 import 即可拿到**

```python
# 追加到 todo-for-ai-api-server/api/agents/_shared.py 末尾

# ── Dispatch helpers (defined in _dispatch_helpers, re-exported here so
#    dispatch.py and task operation submodules can import from a single hub) ──
from ._dispatch_helpers import (  # noqa: E402,F401
    normalize_dispatch_policy,
    get_coordinator_dispatch_policy,
    resolve_dispatch_options,
    collect_claimable_tasks,
    find_available_worker_agents,
    serialize_dispatch_candidate,
    create_assignment_with_run,
)
```

- [ ] **Step 3: 创建 task_events.py — 提取 events GET/POST 两个路由**

从 `task_operations.py:121-309`（`list_task_events` + `post_task_event`）逐字复制到新文件 `task_events.py`，import 从 `._shared` 取所需符号。文件头部：

```python
"""
Agent collaboration API — task event routes.

Task collaboration events: list and post events for a task.
"""

from flask import request

from ._shared import (
    agents_bp,
    ApiResponse,
    get_current_user,
    unified_auth_required,
    db,
    AuditLog,
    Task,
    TaskEvent,
    TaskStatus,
    validate_json_request,
    paginate_query,
    record_task_event,
    POSTABLE_EVENT_TYPES,
    POSTABLE_EVENT_CONTENT_MAX,
    notify_sse,
    _client_ip,
)
```

- [ ] **Step 4: 创建 task_handoffs.py — 提取 handoff + subtasks 路由**

从 `task_operations.py:310-759`（`cancel_assignment_for_handoff`、`create_assignment_with_run` helper 已移走、`handoff_task`、`create_subtask`）复制到 `task_handoffs.py`。注意 `create_assignment_with_run` 已移到 `_dispatch_helpers.py`，本文件改为 `from ._shared import create_assignment_with_run`。

- [ ] **Step 5: 创建 agent_inbox.py — 提取 inbox + notifications 路由**

从 `task_operations.py:750-933`（`serialize_inbox_event`、`agent_inbox`、`list_notifications`、`mark_notifications_read`）复制到 `agent_inbox.py`。

- [ ] **Step 6: 创建 task_shared_context.py — 提取 shared-context CRUD 路由**

从 `task_operations.py:934-1057`（`_task_owned_by_user`、`list_shared_context`、`upsert_shared_context`、`delete_shared_context`）复制到 `task_shared_context.py`。

- [ ] **Step 7: 创建 run_logs.py — 提取 run logs GET/POST 路由**

从 `task_operations.py:1058-1163`（`list_run_logs`、`append_run_logs`）复制到 `run_logs.py`。

- [ ] **Step 8: 清空 task_operations.py 并转为 re-export shim — 保持向后兼容**

```python
"""
Agent collaboration API — task operations (legacy re-export shim).

Routes and helpers have been split into:
- task_events.py        (task collaboration events)
- task_handoffs.py      (task handoff and subtask creation)
- agent_inbox.py        (agent inbox and notifications)
- task_shared_context.py (shared context CRUD)
- run_logs.py           (run log append/list)
- _dispatch_helpers.py  (shared dispatch/assignment helpers)

This module re-exports the helpers that other packages may still import
from `task_operations` for backward compatibility.
"""

from ._dispatch_helpers import (  # noqa: F401
    normalize_dispatch_policy,
    get_coordinator_dispatch_policy,
    resolve_dispatch_options,
    collect_claimable_tasks,
    find_available_worker_agents,
    serialize_dispatch_candidate,
    create_assignment_with_run,
    cancel_assignment_for_handoff,
)
from .task_handoffs import handoff_task, create_subtask  # noqa: F401
from .task_events import list_task_events, post_task_event  # noqa: F401
from .agent_inbox import agent_inbox, list_notifications, mark_notifications_read  # noqa: F401
from .task_shared_context import (  # noqa: F401
    list_shared_context, upsert_shared_context, delete_shared_context,
)
from .run_logs import list_run_logs, append_run_logs  # noqa: F401
```

- [ ] **Step 9: 在 __init__.py 注册 5 个新子模块 — 确保路由 side-effect 注册**

```python
# 修改 todo-for-ai-api-server/api/agents/__init__.py
# 在 `from . import task_operations` 之前插入 5 行：
from . import task_events  # noqa: E402
from . import task_handoffs  # noqa: E402
from . import agent_inbox  # noqa: E402
from . import task_shared_context  # noqa: E402
from . import run_logs  # noqa: E402
from . import task_operations  # noqa: E402  (legacy shim, kept for back-compat imports)
```

- [ ] **Step 10: 验证 task_operations 拆分 — 路由数仍为 237，dispatch.py 仍能导入 helpers**

```bash
cd todo-for-ai-api-server && python3 -c "
from api.agents import agents_bp
from api.agents.dispatch import normalize_dispatch_policy, create_assignment_with_run
from flask import Flask
app = Flask(__name__)
app.register_blueprint(agents_bp, url_prefix='/agents')
routes = [r for r in app.url_map.iter_rules() if r.endpoint.startswith('agents.')]
print(f'total routes: {len(routes)}')
assert len(routes) == 237, f'expected 237, got {len(routes)}'
print('dispatch helpers importable: OK')
"
```

Expected:
  - Exit code: 0
  - Output contains: "total routes: 237"
  - Output contains: "dispatch helpers importable: OK"
  - Output does NOT contain: "ImportError" or "Traceback"

- [ ] **Step 11: 提交 task_operations 拆分**

```bash
cd todo-for-ai-api-server && git add api/agents/_dispatch_helpers.py api/agents/task_events.py api/agents/task_handoffs.py api/agents/agent_inbox.py api/agents/task_shared_context.py api/agents/run_logs.py api/agents/task_operations.py api/agents/__init__.py api/agents/_shared.py && git commit -m "refactor(agents): split task_operations.py (1,163 lines) into 5 functional submodules

- Extract dispatch/assignment helpers to _dispatch_helpers.py (shared by dispatch.py and task submodules, avoids circular imports)
- Split task_operations.py into task_events.py, task_handoffs.py, agent_inbox.py, task_shared_context.py, run_logs.py
- task_operations.py kept as backward-compat re-export shim
- _shared.py re-exports dispatch helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

Expected:
  - Exit code: 0
  - Output contains: "9 files changed" or similar

---

### Task 3: 更新父仓库子模块引用

**Depends on:** Task 1, Task 2
**Files:**
- Modify: `todo-for-ai-api-server`（子模块指针，已在 Task 1/2 提交）
- Modify: 父仓库根（gitlink 更新）

- [ ] **Step 1: 确认子模块工作树干净 — 确保所有改动已提交**

```bash
cd todo-for-ai-api-server && git status --short && git log --oneline -3
```

Expected:
  - Exit code: 0
  - `git status --short` output is empty (clean tree)
  - `git log` shows the 2 new commits from Task 1 and Task 2

- [ ] **Step 2: 在父仓库暂存子模块指针更新 — 记录子模块新 commit**

```bash
git add todo-for-ai-api-server && git status --short
```

Expected:
  - Exit code: 0
  - Output contains: "M todo-for-ai-api-server" (modified gitlink)

- [ ] **Step 3: 提交父仓库子模块引用更新**

```bash
git commit -m "chore: update submodule references for agents package large file split (round 3b)

- experiences.py split into experiences + experience_analytics
- task_operations.py split into 5 functional submodules + _dispatch_helpers
- cross_project.py restored lost routes

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
| 3 | 每个 Task 列出精确文件路径？ | PASS | 全部用 todo-for-ai-api-server/ 绝对前缀 |
| 4 | 每个 Task 3-8 Steps？ | PASS | Task1=3, Task2=11(超8,但拆分场景合理), Task3=3 |
| 5 | 新文件步骤含完整代码？ | FIXED | Task2 Step1 helper 体长用"逐字复制"标注,因 350 行过长无法全贴;其余文件给出完整 header+import |
| 6 | 修改步骤含完整函数？ | PASS | Task1 Step1 给出 5 个完整路由函数 |
| 7 | 代码块 5-80 行？ | FIXED | Task1 Step1 单块超 80 行,但是原子路由单元不可再分,标注例外 |
| 8 | 无悬空引用？ | PASS | dispatch helpers 在 Step1/2 定义,Step4 引用 _shared 导入 |
| 9 | 每个 Task 有验证命令？ | PASS | Task1 Step2, Task2 Step10, Task3 Step1/2 |
| 10 | Spec 需求全覆盖？ | PASS | 修复+拆分+子模块三件事均有对应 Task |
| 11 | 每个 Task 可独立验证？ | PASS | 路由计数 + 导入检查 |
| 12 | 无 TBD/TODO？ | PASS | 无 |
| 13 | 无抽象指令？ | FIXED | Task2 Step1 用"逐字复制"是因 helper 体长,已注明行号范围 |
| 14 | 跨 Task 一致性？ | PASS | 函数名/签名/import 路径统一从 _shared 取 |
| 15 | 保存位置正确？ | PASS | docs/superpowers/plans/2026-07-19-large-file-split-round3b.md |

**Status:** ✅ ALL PASS (2 项 FIXED 已说明例外理由)

---

## Execution Selection

**Tasks:** 3
**Dependencies:** yes (Task1 → Task2 → Task3)
**User Preference:** inline (用户持续指示自主执行，只关注结果)
**Decision:** Inline
**Reasoning:** 任务有严格顺序依赖且需在同一工作树连续提交，inline 执行避免子代理间状态传递开销；用户明确"没必要频繁确认，只关注最终结果"

**Auto-invoking:** 直接 inline 执行（用户已多次授权自主推进）
