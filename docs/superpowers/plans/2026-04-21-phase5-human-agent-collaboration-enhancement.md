# Phase 5: Human-Agent Collaboration Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 增强人机协同体验 — 添加任务级实时对话、Agent 任务委派 UI、Agent 性能追踪仪表盘和输出审查工作流。

**Architecture:** 四大功能：(1) 基于 TaskLog 添加 `parent_id` 字段实现线程对话，WebSocket 推送实时消息；(2) TaskDetail 中添加委派按钮，后端添加委派 API，支持指定 Agent 执行；(3) 聚合审计事件和任务执行数据计算 Agent 性能指标；(4) Agent 输出提交后进入 REVIEW 状态，人类可审批/驳回。

**Tech Stack:** Python 3.11, Flask 2, SQLAlchemy; React 18, TypeScript 5, Ant Design 5.29, Socket.IO

**Risks:**
- TaskLog 添加 `parent_id` 字段需数据库迁移 → 缓解：nullable 字段，无破坏性
- 性能聚合查询可能慢 → 缓解：限制统计时间范围，默认 30 天

---

### Task 1: Backend — Chat Threading + Delegation API + Performance API + Review API

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/models/task_log.py`（添加 parent_id 字段）
- Create: `todo-for-ai-api-server/api/tasks/routes_chat.py`
- Create: `todo-for-ai-api-server/api/tasks/routes_delegation.py`
- Create: `todo-for-ai-api-server/api/agent_performance.py`
- Create: `todo-for-ai-api-server/api/tasks/routes_review.py`
- Modify: `todo-for-ai-api-server/api/tasks/__init__.py`（注册新蓝图）

- [ ] **Step 1: 在 TaskLog 模型添加 parent_id 字段以支持线程回复**

Read `todo-for-ai-api-server/models/task_log.py`. Add a nullable `parent_id` field after the existing fields:

```python
parent_id = Column(BigInteger, ForeignKey('task_logs.id'), nullable=True, comment='父评论ID，用于线程回复')
```

Also update `to_dict()` to include `parent_id` in the response. Add a property or method `replies` that returns child logs (not eagerly loaded — just a relationship).

```python
replies = relationship('TaskLog', backref=backref('parent', remote_side='TaskLog.id'), lazy='dynamic')
```

- [ ] **Step 2: 创建 Chat API — 线程化的任务对话端点**

Read `todo-for-ai-api-server/api/tasks/routes_tasks.py` for existing patterns (decorators, imports, response format).

Create `todo-for-ai-api-server/api/tasks/routes_chat.py`:

```python
from flask import Blueprint, request, g
from models import db
from models.task_log import TaskLog
from utils.response import ApiResponse
from core.auth import unified_auth_required

chat_bp = Blueprint('task_chat', __name__)


@chat_bp.route('/tasks/<int:task_id>/chat', methods=['GET'])
@unified_auth_required
def get_chat_messages(task_id):
    """获取任务的对话消息（顶层评论 + 线程回复）"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    # 获取顶层消息（parent_id 为 null）
    query = db.session.query(TaskLog).filter(
        TaskLog.task_id == task_id,
        TaskLog.parent_id.is_(None)
    ).order_by(TaskLog.created_at.asc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    items = []
    for msg in pagination.items:
        msg_dict = msg.to_dict()
        # 获取该消息的回复
        replies = db.session.query(TaskLog).filter(
            TaskLog.parent_id == msg.id
        ).order_by(TaskLog.created_at.asc()).all()
        msg_dict['replies'] = [r.to_dict() for r in replies]
        items.append(msg_dict)

    return ApiResponse.success(data={
        'items': items,
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
    }).to_response()


@chat_bp.route('/tasks/<int:task_id>/chat', methods=['POST'])
@unified_auth_required
def send_chat_message(task_id):
    """发送对话消息（人类或系统代发）"""
    data = request.get_json()
    content = data.get('content', '').strip()
    parent_id = data.get('parent_id')  # 回复某条消息

    if not content:
        return ApiResponse.error('内容不能为空').to_response()

    log = TaskLog(
        task_id=task_id,
        actor_type='HUMAN',
        actor_user_id=g.current_user.id if hasattr(g, 'current_user') else None,
        content=content,
        content_type='text/markdown',
        parent_id=parent_id,
    )
    db.session.add(log)
    db.session.commit()

    return ApiResponse.success(data=log.to_dict()).to_response()
```

IMPORTANT: Check the exact auth pattern. The project may use `g.user` or `g.current_user`. Also check if TaskLog uses `created_at` or `timestamp` as its time field. Adapt accordingly.

- [ ] **Step 3: 创建 Delegation API — 任务委派给 Agent**

Create `todo-for-ai-api-server/api/tasks/routes_delegation.py`:

```python
from flask import Blueprint, request
from models import db
from models.task import Task
from models.agent import Agent
from utils.response import ApiResponse
from core.auth import unified_auth_required

delegation_bp = Blueprint('task_delegation', __name__)


@delegation_bp.route('/tasks/<int:task_id>/delegate', methods=['POST'])
@unified_auth_required
def delegate_to_agent(task_id):
    """将任务委派给指定 Agent"""
    data = request.get_json()
    agent_id = data.get('agent_id')

    if not agent_id:
        return ApiResponse.error('agent_id is required').to_response()

    task = db.session.query(Task).get(task_id)
    if not task:
        return ApiResponse.error('Task not found', 404).to_response()

    agent = db.session.query(Agent).get(agent_id)
    if not agent:
        return ApiResponse.error('Agent not found', 404).to_response()

    # 更新任务指派
    task.assignee_id = agent_id
    task.creator_type = 'ai_delegated'
    task.status = 'IN_PROGRESS'
    db.session.commit()

    return ApiResponse.success(data=task.to_dict()).to_response()


@delegation_bp.route('/tasks/<int:task_id>/reclaim', methods=['POST'])
@unified_auth_required
def reclaim_from_agent(task_id):
    """从 Agent 取回任务"""
    task = db.session.query(Task).get(task_id)
    if not task:
        return ApiResponse.error('Task not found', 404).to_response()

    task.assignee_id = None
    task.status = 'TODO'
    db.session.commit()

    return ApiResponse.success(data=task.to_dict()).to_response()


@delegation_bp.route('/workspaces/<int:workspace_id>/delegatable-agents', methods=['GET'])
@unified_auth_required
def list_delegatable_agents(workspace_id):
    """获取工作空间中可委派的 Agent 列表"""
    agents = db.session.query(Agent).filter(
        Agent.organization_id == workspace_id,
        Agent.status == 'ACTIVE'
    ).all()

    return ApiResponse.success(data=[{
        'id': a.id,
        'name': a.name,
        'role': a.role if hasattr(a, 'role') else None,
        'status': a.status,
    } for a in agents]).to_response()
```

IMPORTANT: Check the Agent model for the correct field names (organization_id vs workspace_id, status field name, role field). Read `todo-for-ai-api-server/models/agent.py` first.

- [ ] **Step 4: 创建 Agent Performance API — 性能指标聚合**

Create `todo-for-ai-api-server/api/agent_performance.py`:

```python
from flask import Blueprint, request
from models import db
from models.agent_audit_event import AgentAuditEvent
from models.task import Task
from sqlalchemy import func, case
from utils.response import ApiResponse
from core.auth import unified_auth_required

perf_bp = Blueprint('agent_performance', __name__)


@perf_bp.route('/workspaces/<int:workspace_id>/agents/<int:agent_id>/performance', methods=['GET'])
@unified_auth_required
def get_agent_performance(workspace_id, agent_id):
    """获取 Agent 性能指标"""
    from datetime import datetime, timedelta

    days = request.args.get('days', 30, type=int)
    start_date = datetime.utcnow() - timedelta(days=days)

    # 完成的任务数
    completed_tasks = db.session.query(func.count(Task.id)).filter(
        Task.creator_agent_id == agent_id if hasattr(Task, 'creator_agent_id') else Task.creator_id == str(agent_id),
        Task.status.in_(['DONE', 'COMPLETED']),
        Task.updated_at >= start_date,
    ).scalar() or 0

    # 总分配任务数
    total_tasks = db.session.query(func.count(Task.id)).filter(
        Task.creator_agent_id == agent_id if hasattr(Task, 'creator_agent_id') else Task.creator_id == str(agent_id),
        Task.updated_at >= start_date,
    ).scalar() or 0

    # 平均执行时间
    avg_duration = db.session.query(func.avg(AgentAuditEvent.duration_ms)).filter(
        AgentAuditEvent.actor_agent_id == agent_id,
        AgentAuditEvent.occurred_at >= start_date,
        AgentAuditEvent.duration_ms.isnot(None),
    ).scalar()

    # 错误率
    error_count = db.session.query(func.count(AgentAuditEvent.id)).filter(
        AgentAuditEvent.actor_agent_id == agent_id,
        AgentAuditEvent.occurred_at >= start_date,
        AgentAuditEvent.level.in_(['error', 'critical']),
    ).scalar() or 0

    total_events = db.session.query(func.count(AgentAuditEvent.id)).filter(
        AgentAuditEvent.actor_agent_id == agent_id,
        AgentAuditEvent.occurred_at >= start_date,
    ).scalar() or 1

    # 近期活动趋势（最近7天每天的任务完成数）
    daily_activity = []
    for i in range(6, -1, -1):
        day = datetime.utcnow().date() - timedelta(days=i)
        day_start = datetime.combine(day, datetime.min.time())
        day_end = datetime.combine(day, datetime.max.time())
        count = db.session.query(func.count(Task.id)).filter(
            Task.creator_agent_id == agent_id if hasattr(Task, 'creator_agent_id') else Task.creator_id == str(agent_id),
            Task.status.in_(['DONE', 'COMPLETED']),
            Task.updated_at.between(day_start, day_end),
        ).scalar() or 0
        daily_activity.append({'date': day.isoformat(), 'count': count})

    success_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
    error_rate = round((error_count / total_events * 100), 1)

    return ApiResponse.success(data={
        'agent_id': agent_id,
        'period_days': days,
        'tasks_completed': completed_tasks,
        'tasks_total': total_tasks,
        'success_rate': success_rate,
        'avg_duration_ms': round(avg_duration, 0) if avg_duration else None,
        'error_rate': error_rate,
        'error_count': error_count,
        'daily_activity': daily_activity,
    }).to_response()
```

IMPORTANT: Read the Task and AgentAuditEvent models first to find the correct field for linking agents to tasks. The `creator_agent_id` field may or may not exist. Check what field links tasks to agents. Adapt the queries accordingly.

- [ ] **Step 5: 创建 Review API — 输出审查审批**

Create `todo-for-ai-api-server/api/tasks/routes_review.py`:

```python
from flask import Blueprint, request
from models import db
from models.task import Task
from utils.response import ApiResponse
from core.auth import unified_auth_required

review_bp = Blueprint('task_review', __name__)


@review_bp.route('/workspaces/<int:workspace_id>/reviews/pending', methods=['GET'])
@unified_auth_required
def list_pending_reviews(workspace_id):
    """获取待审查的任务列表（状态为 REVIEW）"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    query = db.session.query(Task).filter(
        Task.status == 'REVIEW'
    )

    pagination = query.order_by(Task.updated_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return ApiResponse.success(data={
        'items': [t.to_dict() for t in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
    }).to_response()


@review_bp.route('/tasks/<int:task_id>/review', methods=['POST'])
@unified_auth_required
def submit_review(task_id):
    """审批或驳回 Agent 的输出"""
    data = request.get_json()
    decision = data.get('decision')  # 'approve' or 'reject'
    comment = data.get('comment', '')

    if decision not in ('approve', 'reject'):
        return ApiResponse.error('decision must be approve or reject').to_response()

    task = db.session.query(Task).get(task_id)
    if not task:
        return ApiResponse.error('Task not found', 404).to_response()

    if decision == 'approve':
        task.status = 'DONE'
    else:
        task.status = 'IN_PROGRESS'
        # 将驳回原因追加到反馈
        existing_feedback = task.feedback_content or ''
        task.feedback_content = f"{existing_feedback}\n\n---\n**审查驳回:** {comment}" if comment else existing_feedback

    db.session.commit()

    return ApiResponse.success(data=task.to_dict()).to_response()
```

- [ ] **Step 6: 注册所有新蓝图**

Read `todo-for-ai-api-server/api/tasks/__init__.py` and `todo-for-ai-api-server/app.py` for blueprint registration patterns.

Add imports and register:
```python
from api.tasks.routes_chat import chat_bp
from api.tasks.routes_delegation import delegation_bp
from api.tasks.routes_review import review_bp
from api.agent_performance import perf_bp
```

Register with the same URL prefix pattern as existing blueprints.

- [ ] **Step 7: 验证**

Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.tasks.routes_chat import chat_bp; from api.tasks.routes_delegation import delegation_bp; from api.agent_performance import perf_bp; from api.tasks.routes_review import review_bp; print('Import OK')"`

Expected: Exit code 0, output "Import OK"

- [ ] **Step 8: 提交**

```bash
cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server/models/task_log.py todo-for-ai-api-server/api/tasks/routes_chat.py todo-for-ai-api-server/api/tasks/routes_delegation.py todo-for-ai-api-server/api/agent_performance.py todo-for-ai-api-server/api/tasks/routes_review.py todo-for-ai-api-server/api/tasks/__init__.py todo-for-ai-api-server/app.py && git commit -m "feat(api): add chat threading, delegation, performance and review APIs

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Frontend — Chat Thread Component + API Client

**Depends on:** Task 1
**Files:**
- Create: `todo-for-ai-webpage/src/api/taskChat.ts`
- Create: `todo-for-ai-webpage/src/components/TaskChatThread.tsx`

- [ ] **Step 1: 创建 Task Chat API Client**

Create `todo-for-ai-webpage/src/api/taskChat.ts`:

```typescript
import { apiClient } from './client/index.js'

export interface ChatMessage {
  id: number
  task_id: number
  actor_type: 'HUMAN' | 'AGENT' | 'SYSTEM'
  actor_user_id?: number
  actor_agent_id?: number
  content: string
  content_type: string
  parent_id?: number
  replies?: ChatMessage[]
  created_at: string
}

class TaskChatApi {
  async getMessages(taskId: number, page = 1, perPage = 20): Promise<{ items: ChatMessage[]; total: number; page: number }> {
    return await apiClient.get(`/tasks/${taskId}/chat`, { page, per_page: perPage })
  }

  async sendMessage(taskId: number, content: string, parentId?: number): Promise<ChatMessage> {
    return await apiClient.post(`/tasks/${taskId}/chat`, { content, parent_id: parentId })
  }
}

export const taskChatApi = new TaskChatApi()
```

- [ ] **Step 2: 创建 TaskChatThread 组件 — 实时对话界面**

Create `todo-for-ai-webpage/src/components/TaskChatThread.tsx`:

A chat-style component with:
- Message list showing top-level comments with actor type badges (HUMAN=green user icon, AGENT=blue robot icon, SYSTEM=gray)
- Each message shows: actor avatar/icon, actor name, timestamp, content (rendered as markdown)
- Threaded replies indented under parent messages with a "回复" button to toggle reply input
- Reply input is a small Input.TextArea that appears inline when clicking reply
- Bottom input area with TextArea and send button for new top-level messages
- Auto-scroll to bottom on new messages
- Loading state and empty state
- Uses `getErrorMessage` for error handling

Props: `{ taskId: number }`

```typescript
import { useEffect, useState, useRef } from 'react'
import { Input, Button, Avatar, Space, Spin, Empty, message, Tag } from 'antd'
import { SendOutlined, RobotOutlined, UserOutlined, DesktopOutlined, ReplyOutlined } from '@ant-design/icons'
import { taskChatApi } from '../api/taskChat.js'
import type { ChatMessage } from '../api/taskChat.js'
import { getErrorMessage } from '../utils/errorUtils.js'

const ACTOR_CONFIG = {
  HUMAN: { color: '#00b96b', icon: <UserOutlined />, label: '用户' },
  AGENT: { color: '#1890ff', icon: <RobotOutlined />, label: 'Agent' },
  SYSTEM: { color: '#999', icon: <DesktopOutlined />, label: '系统' },
}
```

Style messages as flat cards or bubble-style. Keep consistent with project's flat design.

- [ ] **Step 3: 验证编译**

Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -20`

Expected: No errors

- [ ] **Step 4: 提交**

```bash
cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/api/taskChat.ts todo-for-ai-webpage/src/components/TaskChatThread.tsx && git commit -m "feat(ui): add threaded task chat component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Frontend — Task Delegation UI + Agent Performance Dashboard

**Depends on:** Task 1
**Files:**
- Create: `todo-for-ai-webpage/src/api/taskDelegation.ts`
- Create: `todo-for-ai-webpage/src/api/agentPerformance.ts`
- Create: `todo-for-ai-webpage/src/components/TaskDelegation.tsx`
- Create: `todo-for-ai-webpage/src/components/AgentPerformanceDashboard.tsx`

- [ ] **Step 1: 创建 Task Delegation API Client**

Create `todo-for-ai-webpage/src/api/taskDelegation.ts`:

```typescript
import { apiClient } from './client/index.js'

export interface DelegatableAgent {
  id: number
  name: string
  role?: string
  status: string
}

class TaskDelegationApi {
  async delegate(taskId: number, agentId: number): Promise<any> {
    return await apiClient.post(`/tasks/${taskId}/delegate`, { agent_id: agentId })
  }

  async reclaim(taskId: number): Promise<any> {
    return await apiClient.post(`/tasks/${taskId}/reclaim`)
  }

  async listAgents(workspaceId: number): Promise<DelegatableAgent[]> {
    const res = await apiClient.get(`/workspaces/${workspaceId}/delegatable-agents`)
    return (res as any).data || res || []
  }
}

export const taskDelegationApi = new TaskDelegationApi()
```

NOTE: Check how other API clients handle response unwrapping. The `listAgents` response format depends on how the backend wraps it.

- [ ] **Step 2: 创建 Agent Performance API Client**

Create `todo-for-ai-webpage/src/api/agentPerformance.ts`:

```typescript
import { apiClient } from './client/index.js'

export interface AgentPerformance {
  agent_id: number
  period_days: number
  tasks_completed: number
  tasks_total: number
  success_rate: number
  avg_duration_ms: number | null
  error_rate: number
  error_count: number
  daily_activity: { date: string; count: number }[]
}

class AgentPerformanceApi {
  async get(workspaceId: number, agentId: number, days = 30): Promise<AgentPerformance> {
    return await apiClient.get(`/workspaces/${workspaceId}/agents/${agentId}/performance`, { days })
  }
}

export const agentPerformanceApi = new AgentPerformanceApi()
```

- [ ] **Step 3: 创建 TaskDelegation 组件 — 任务委派给 Agent**

Create `todo-for-ai-webpage/src/components/TaskDelegation.tsx`:

A dropdown/popover component for delegating a task to an agent:
- Button labeled "委派给 Agent" with dropdown
- Agent list with search filter
- Each agent shows name, role badge, status
- Click agent to delegate (with confirmation)
- If task already delegated to agent, show "从 Agent 取回" button instead
- Loading states

Props: `{ taskId: number; workspaceId: number; currentAssigneeId?: number; onDelegated?: () => void }`

Use Ant Design: Dropdown, Button, Input.Search, List, Popconfirm, Tag.

- [ ] **Step 4: 创建 AgentPerformanceDashboard 组件 — Agent 性能仪表盘**

Create `todo-for-ai-webpage/src/components/AgentPerformanceDashboard.tsx`:

A dashboard showing agent performance metrics:
- Stats row: 完成率 (success_rate%), 平均耗时, 错误率, 完成任务数
- Activity chart: 简单的 bar chart showing daily_activity (use plain div bars, no chart library needed)
- Period selector: Select with options (7天, 30天, 90天)
- Loading skeleton

Props: `{ workspaceId: number; agentId: number }`

```typescript
import { useEffect, useState } from 'react'
import { Card, Statistic, Row, Col, Select, Spin, Tag, Tooltip } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, WarningOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { agentPerformanceApi } from '../api/agentPerformance.js'
import type { AgentPerformance } from '../api/agentPerformance.js'
import { getErrorMessage } from '../utils/errorUtils.js'
```

Style: flat cards consistent with project design.

- [ ] **Step 5: 验证编译**

Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -20`

Expected: No errors

- [ ] **Step 6: 提交**

```bash
cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/api/taskDelegation.ts todo-for-ai-webpage/src/api/agentPerformance.ts todo-for-ai-webpage/src/components/TaskDelegation.tsx todo-for-ai-webpage/src/components/AgentPerformanceDashboard.tsx && git commit -m "feat(ui): add task delegation and agent performance dashboard

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Frontend — Output Review Component + Review Queue

**Depends on:** Task 1
**Files:**
- Create: `todo-for-ai-webpage/src/api/taskReview.ts`
- Create: `todo-for-ai-webpage/src/components/TaskReviewPanel.tsx`
- Create: `todo-for-ai-webpage/src/components/ReviewQueue.tsx`

- [ ] **Step 1: 创建 Task Review API Client**

Create `todo-for-ai-webpage/src/api/taskReview.ts`:

```typescript
import { apiClient } from './client/index.js'

export interface ReviewTask {
  id: number
  title: string
  description?: string
  feedback_content?: string
  status: string
  creator_type?: string
  creator_identifier?: string
  updated_at: string
}

class TaskReviewApi {
  async listPending(workspaceId: number, page = 1, perPage = 10): Promise<{ items: ReviewTask[]; total: number }> {
    return await apiClient.get(`/workspaces/${workspaceId}/reviews/pending`, { page, per_page: perPage })
  }

  async submitReview(taskId: number, decision: 'approve' | 'reject', comment?: string): Promise<any> {
    return await apiClient.post(`/tasks/${taskId}/review`, { decision, comment })
  }
}

export const taskReviewApi = new TaskReviewApi()
```

- [ ] **Step 2: 创建 TaskReviewPanel 组件 — 单个任务的输出审查面板**

Create `todo-for-ai-webpage/src/components/TaskReviewPanel.tsx`:

A panel for reviewing an agent's task output:
- Header showing task title, agent name, submitted time
- Content area showing the agent's output (feedback_content rendered as markdown)
- Action bar: "通过" button (green) and "驳回" button (red)
- Reject opens a Modal with required comment TextArea
- Loading state per action

Props: `{ taskId: number; feedbackContent?: string; onReviewed?: (approved: boolean) => void }`

Use Ant Design: Card, Button, Modal, Input.TextArea, Tag, Typography.Paragraph.

- [ ] **Step 3: 创建 ReviewQueue 组件 — 待审查任务队列**

Create `todo-for-ai-webpage/src/components/ReviewQueue.tsx`:

A list of tasks awaiting review:
- Table with columns: 任务名称, Agent, 提交时间, 操作
- Each row expandable to show output preview
- "审查" button opens the TaskReviewPanel in a Modal
- Auto-refresh after review actions
- Empty state: "暂无待审查任务"
- Pagination

Props: `{ workspaceId: number }`

Use Ant Design: Table, Button, Modal, Tag, Empty, Typography.

- [ ] **Step 4: 验证编译**

Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -20`

Expected: No errors

- [ ] **Step 5: 提交**

```bash
cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/api/taskReview.ts todo-for-ai-webpage/src/components/TaskReviewPanel.tsx todo-for-ai-webpage/src/components/ReviewQueue.tsx && git commit -m "feat(ui): add task output review panel and review queue

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Integration — Wire into TaskDetail + AgentsPage

**Depends on:** Task 2, Task 3, Task 4
**Files:**
- Modify: `todo-for-ai-webpage/src/pages/TaskDetail.tsx`
- Modify: `todo-for-ai-webpage/src/pages/agents/AgentsPage.tsx`

- [ ] **Step 1: 在 TaskDetail 添加对话和委派功能**

Read `todo-for-ai-webpage/src/pages/TaskDetail.tsx`. It currently has tabs: 任务内容, 评论, 活动记录, 指派, 依赖关系.

Add imports:
```typescript
import TaskChatThread from '../components/TaskChatThread.js'
import TaskDelegation from '../components/TaskDelegation.js'
```

Modify the tab items:
- Replace or add alongside the '评论' tab with a '对话' tab using TaskChatThread:
```typescript
{
  key: 'chat',
  label: '对话',
  children: task?.id ? <TaskChatThread taskId={task.id} /> : null,
},
```

Add a delegation button in the task header area (find where status/actions are rendered):
```typescript
{task?.id && workspaceId && (
  <TaskDelegation
    taskId={task.id}
    workspaceId={workspaceId}
    currentAssigneeId={task.assignee_id}
    onDelegated={() => {/* refresh task */}}
  />
)}
```

Find the correct variable names for workspaceId and the task refresh function by reading the file.

- [ ] **Step 2: 在 AgentsPage 添加审查队列和性能仪表盘**

Read `todo-for-ai-webpage/src/pages/agents/AgentsPage.tsx`. Currently has tabs: agents, activity_center, collaboration, teams, audit.

Add imports:
```typescript
import ReviewQueue from '../../components/ReviewQueue.js'
```

Add a new tab:
```typescript
{
  key: 'review',
  label: '输出审查',
  children: workspaceId ? <ReviewQueue workspaceId={workspaceId} /> : null,
},
```

Also, in the existing 'collaboration' tab, add AgentPerformanceDashboard for the selected agent. If there's a selected agent concept, use its ID. Otherwise, add it as a collapsible section within the collaboration tab.

- [ ] **Step 3: 验证编译**

Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -30`

Expected: No errors. Fix any errors.

- [ ] **Step 4: 提交**

```bash
cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/pages/TaskDetail.tsx todo-for-ai-webpage/src/pages/agents/AgentsPage.tsx && git commit -m "feat(ui): integrate chat, delegation, review and performance into task and agents pages

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
