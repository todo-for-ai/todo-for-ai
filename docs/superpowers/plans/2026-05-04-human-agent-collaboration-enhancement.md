# Human-Agent Collaboration Enhancement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 打通人类与 Agent 的实时协作闭环：Agent 能发聊天消息、审批请求实时推送、Agent 求助专用流程、委派后自动激活、用户 WebSocket 基础设施从零到可用。

**Architecture:** Agent 调用 `/agent/tasks/<id>/chat` → 后端以 AGENT 身份写 TaskLog → 通过 `/user/ws` namespace 实时推送 `task_comment` 给人类用户。Agent 提交 interaction_request 时，后端同时推送 `approval_request` 事件到用户 WebSocket。前端在 App 初始化时调用 `wsService.connect(token)` 建立连接，组件通过 `useTaskRealtime` hook 监听事件。委派路由调用 `auto_assign_task()` + `push_task_to_agent()` 确保被委派 Agent 立即收到任务。

**Tech Stack:** Flask 3, Flask-SocketIO 5, SQLAlchemy 2, React 18, TypeScript 5, Ant Design 5, Socket.IO Client 4

**Risks:**
- Task 1 创建 `/user/ws` namespace 是基础设施，后续所有 Task 依赖它 → 缓解：Task 1 优先完成，验证连接建立后再推进
- Task 2 修改 `routes_chat.py` 和 `task_logs.py` 涉及认证体系（`unified_auth_required` vs `agent_session_required`）→ 缓解：新增独立端点而非修改现有端点，避免破坏人类发送功能
- Task 4 修改 `routes_delegation.py` 需要引入 `auto_assign_task` → 缓解：添加 try/except 包裹，即使自动分配失败也不阻塞委派操作
- 前端 `wsService.connect()` 从未调用 → 缓解：在 Task 5 中显式调用并处理 token 传递

---

### Task 1: 创建用户 WebSocket Namespace — 建立用户侧实时推送基础设施

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/api/user_websocket.py`
- Modify: `todo-for-ai-api-server/app.py:41-43`

- [ ] **Step 1: 创建 UserNamespace — 处理用户 WebSocket 连接、认证和房间管理**

```python
# todo-for-ai-api-server/api/user_websocket.py
"""
User WebSocket Namespace

Handles real-time communication with human users:
- Connection authentication via JWT
- Task room join/leave for scoped events
- Push notifications, task updates, chat messages, approval requests
"""

from datetime import datetime
from flask import request as flask_request, session as socketio_session
from flask_socketio import Namespace, emit, join_room, leave_room, disconnect


class UserNamespace(Namespace):
    """User WebSocket Namespace at /user/ws"""

    def __init__(self, namespace='/user/ws'):
        super().__init__(namespace)

    def on_connect(self, auth=None):
        """Handle user connection with JWT authentication"""
        if not auth:
            auth = flask_request.args

        token = auth.get('token') if isinstance(auth, dict) else None
        if not token:
            emit('auth_error', {'error': 'Token required'})
            disconnect()
            return False

        from flask_jwt_extended import decode_token
        from jwt.exceptions import InvalidTokenError
        try:
            decoded = decode_token(token)
            user_id = decoded.get('sub')
        except InvalidTokenError:
            user_id = None

        if not user_id:
            emit('auth_error', {'error': 'Invalid or expired token'})
            disconnect()
            return False

        socketio_session['user_id'] = user_id
        join_room(f'user:{user_id}')

        emit('auth_success', {
            'user_id': user_id,
            'connected_at': datetime.utcnow().isoformat()
        })
        return True

    def on_disconnect(self):
        """Handle user disconnect"""
        pass

    def on_join_task(self, data):
        """Join a task room to receive task-scoped events"""
        user_id = socketio_session.get('user_id')
        if not user_id:
            return
        task_id = data.get('task_id')
        if task_id:
            join_room(f'task:{task_id}')

    def on_leave_task(self, data):
        """Leave a task room"""
        task_id = data.get('task_id')
        if task_id:
            leave_room(f'task:{task_id}')


def push_to_user(user_id, event, data):
    """Push an event to a specific user via WebSocket"""
    from flask_socketio import emit as broadcast_emit
    broadcast_emit(event, data, room=f'user:{user_id}', namespace='/user/ws')


def push_to_task_room(task_id, event, data):
    """Push an event to all users in a task room"""
    from flask_socketio import emit as broadcast_emit
    broadcast_emit(event, data, room=f'task:{task_id}', namespace='/user/ws')
```

- [ ] **Step 2: 注册 UserNamespace 到 Flask-SocketIO — 挂载 /user/ws 到应用**
文件: `todo-for-ai-api-server/app.py:41-43`

```python
# 替换 todo-for-ai-api-server/app.py:41-43 的 SocketIO 初始化区块
    # 初始化 SocketIO
    socketio.init_app(app)
    from api.agent_runtime_websocket import AgentRuntimeNamespace
    from api.user_websocket import UserNamespace
    socketio.on_namespace(AgentRuntimeNamespace())
    socketio.on_namespace(UserNamespace())
```

- [ ] **Step 3: 验证 UserNamespace 注册**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.user_websocket import UserNamespace; n = UserNamespace(); print(f'Namespace: {n.namespace}')" `
Expected:
  - Exit code: 0
  - Output contains: "Namespace: /user/ws"

- [ ] **Step 4: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server/api/user_websocket.py todo-for-ai-api-server/app.py && git commit -m "feat(ws): add user WebSocket namespace for real-time push to humans"`

---

### Task 2: Agent 聊天发送能力 — 让 Agent 能在任务对话中发消息

**Depends on:** Task 1
**Files:**
- Create: `todo-for-ai-api-server/api/tasks/routes_agent_chat.py`
- Modify: `todo-for-ai-api-server/api/tasks/__init__.py`

- [ ] **Step 1: 创建 Agent 聊天端点 — Agent 通过 agent_session_required 认证发消息**

```python
# todo-for-ai-api-server/api/tasks/routes_agent_chat.py
"""Agent chat routes — allow agents to send chat messages on tasks."""

from flask import g, request

from models import db, TaskLog, TaskLogActorType
from api.base import ApiResponse
from core.auth import agent_session_required

from . import tasks_bp


@tasks_bp.route('/agent/<int:task_id>/chat', methods=['POST'])
@agent_session_required
def send_agent_chat(task_id):
    """Agent sends a chat message or reply on a task."""
    agent = g.current_agent
    data = request.get_json()
    if not data or not data.get('content'):
        return ApiResponse.error('content is required').to_response()

    content = data['content']
    parent_id = data.get('parent_id')

    if parent_id is not None:
        parent = db.session.get(TaskLog, parent_id)
        if not parent or parent.task_id != task_id:
            return ApiResponse.error('parent_id not found for this task', 404).to_response()

    log = TaskLog(
        task_id=task_id,
        actor_type=TaskLogActorType.AGENT,
        actor_agent_id=agent.id,
        content=content,
        content_type='text/markdown',
        parent_id=parent_id,
        created_by=f'agent:{agent.id}',
    )
    db.session.add(log)
    db.session.commit()

    # Push to user WebSocket
    from api.user_websocket import push_to_task_room
    push_to_task_room(task_id, 'task_comment', {
        'task_id': task_id,
        'message_id': log.id,
        'actor_type': 'agent',
        'actor_agent_id': agent.id,
        'content': content,
    })

    return ApiResponse.created(data=log.to_dict()).to_response()
```

- [ ] **Step 2: 注册 agent chat 路由模块 — 确保蓝图加载新路由**
文件: `todo-for-ai-api-server/api/tasks/__init__.py`

```python
# 在 todo-for-ai-api-server/api/tasks/__init__.py 文件末尾追加导入
# 确保新路由模块被加载
from . import routes_agent_chat  # noqa: F401
```

- [ ] **Step 3: 验证 agent chat 端点可导入**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.tasks.routes_agent_chat import send_agent_chat; print('OK')" `
Expected:
  - Exit code: 0
  - Output contains: "OK"

- [ ] **Step 4: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server/api/tasks/routes_agent_chat.py todo-for-ai-api-server/api/tasks/__init__.py && git commit -m "feat(chat): add agent chat endpoint so agents can send messages"`

---

### Task 3: 审批请求实时推送 — Agent 提交审批时推送到人类用户

**Depends on:** Task 1
**Files:**
- Modify: `todo-for-ai-api-server/api/agent_runtime_interactions.py:217-218`

- [ ] **Step 1: 在 interaction_request 创建后推送 WebSocket 事件给任务相关用户**
文件: `todo-for-ai-api-server/api/agent_runtime_interactions.py:217-218`（`db.session.add(row)` 之后、`db.session.commit()` 之前添加推送逻辑）

```python
# 在 todo-for-ai-api-server/api/agent_runtime_interactions.py 的 db.session.add(row) 之后
# （约 line 217-218 之间）添加以下代码块：

    # Push approval request to user WebSocket
    if request_status == 'pending_approval':
        from api.user_websocket import push_to_task_room, push_to_user
        from models import Task
        task = db.session.get(Task, task_id)
        push_to_task_room(task_id, 'approval_request', {
            'task_id': task_id,
            'interaction_id': interaction_id,
            'interaction_type': normalized['interaction_type'],
            'source_agent_id': int(agent.id),
            'source_agent_name': agent.name,
            'risk_tier': governance.get('risk_tier'),
            'sensitivity_level': sensitivity_level,
        })
        # Also push to task owner if they're not in the task room
        if task and task.created_by:
            try:
                owner_id = int(task.created_by.split(':')[-1]) if ':' in str(task.created_by) else None
                if owner_id:
                    push_to_user(owner_id, 'approval_request', {
                        'task_id': task_id,
                        'interaction_id': interaction_id,
                        'interaction_type': normalized['interaction_type'],
                        'source_agent_name': agent.name,
                    })
            except (ValueError, TypeError):
                pass
```

- [ ] **Step 2: 验证 interactions 模块可导入**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.agent_runtime_interactions import request_interaction; print('OK')" `
Expected:
  - Exit code: 0
  - Output contains: "OK"

- [ ] **Step 3: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server/api/agent_runtime_interactions.py && git commit -m "feat(approvals): push approval request to users via WebSocket in real-time"`

---

### Task 4: 委派路由激活 Agent — delegate_task 调用 auto_assign_task + WebSocket 推送

**Depends on:** Task 1
**Files:**
- Modify: `todo-for-ai-api-server/api/tasks/routes_delegation.py:38-50`

- [ ] **Step 1: 修改 delegate_task 函数 — 添加 auto_assign_task 调用和 WebSocket 推送**
文件: `todo-for-ai-api-server/api/tasks/routes_delegation.py:38-50`（替换 `# Log the delegation` 注释到 `db.session.commit()` 的区块）

```python
# 替换 todo-for-ai-api-server/api/tasks/routes_delegation.py:38-50
# 从 "# Log the delegation" 到第一个 "db.session.commit()"

    # Log the delegation
    from models import TaskLog, TaskLogActorType
    log = TaskLog(
        task_id=task_id,
        actor_type=TaskLogActorType.HUMAN,
        actor_user_id=user.id if user else None,
        content=f'Delegated to agent **{agent.display_name or agent.name}**',
        content_type='text/markdown',
    )
    db.session.add(log)
    db.session.commit()

    # Trigger auto-assignment pipeline for the delegated agent
    try:
        from services.agent_runtime_controller import AgentRuntimeController
        AgentRuntimeController.auto_assign_task(task)
    except Exception:
        pass  # Don't block delegation if auto-assign fails

    # Push task to agent via WebSocket
    try:
        from api.agent_runtime_websocket import push_task_to_agent
        push_task_to_agent(agent.id, task.to_dict())
    except Exception:
        pass  # Don't block if WebSocket push fails

    # Notify task room users about delegation
    try:
        from api.user_websocket import push_to_task_room
        push_to_task_room(task_id, 'task_updated', {
            'task_id': task_id,
            'action': 'delegated',
            'agent_id': agent.id,
            'agent_name': agent.display_name or agent.name,
        })
    except Exception:
        pass

    return ApiResponse.success(data=task.to_dict()).to_response()
```

- [ ] **Step 2: 验证 delegation 模块可导入**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.tasks.routes_delegation import delegate_task; print('OK')" `
Expected:
  - Exit code: 0
  - Output contains: "OK"

- [ ] **Step 3: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server/api/tasks/routes_delegation.py && git commit -m "feat(delegation): trigger auto_assign_task and push WebSocket on task delegation"`

---

### Task 5: Agent 求助专用流程 — 添加 help_request 交互类型

**Depends on:** Task 1, Task 2
**Files:**
- Create: `todo-for-ai-api-server/api/tasks/routes_help_request.py`
- Modify: `todo-for-ai-api-server/api/tasks/__init__.py`

- [ ] **Step 1: 创建 Agent 求助端点 — Agent 主动向人类请求帮助**

```python
# todo-for-ai-api-server/api/tasks/routes_help_request.py
"""Agent help request routes — agents can explicitly request human assistance."""

from flask import g, request

from models import db, TaskLog, TaskLogActorType
from api.base import ApiResponse
from core.auth import agent_session_required

from . import tasks_bp


@tasks_bp.route('/agent/<int:task_id>/help-request', methods=['POST'])
@agent_session_required
def agent_help_request(task_id):
    """Agent requests human help on a task. Creates a chat message and pushes notification."""
    agent = g.current_agent
    data = request.get_json()
    if not data or not data.get('content'):
        return ApiResponse.error('content is required (describe what help you need)').to_response()

    content = data['content']
    help_type = data.get('help_type', 'general')  # general, blocked, clarification, review

    # Create a chat message from the agent
    help_content = f'**[求助 - {help_type}]** {content}'
    log = TaskLog(
        task_id=task_id,
        actor_type=TaskLogActorType.AGENT,
        actor_agent_id=agent.id,
        content=help_content,
        content_type='text/markdown',
        created_by=f'agent:{agent.id}',
    )
    db.session.add(log)
    db.session.commit()

    # Push help request notification to users
    from api.user_websocket import push_to_task_room, push_to_user
    from models import Task
    task = db.session.get(Task, task_id)

    push_to_task_room(task_id, 'help_request', {
        'task_id': task_id,
        'message_id': log.id,
        'agent_id': agent.id,
        'agent_name': agent.display_name or agent.name,
        'help_type': help_type,
        'content': content,
    })

    # Also push to task owner directly
    if task and task.created_by:
        try:
            owner_id = int(task.created_by.split(':')[-1]) if ':' in str(task.created_by) else None
            if owner_id:
                push_to_user(owner_id, 'help_request', {
                    'task_id': task_id,
                    'agent_name': agent.display_name or agent.name,
                    'help_type': help_type,
                    'content': content,
                })
        except (ValueError, TypeError):
            pass

    return ApiResponse.created(data={
        'message': log.to_dict(),
        'help_type': help_type,
    }).to_response()
```

- [ ] **Step 2: 注册 help request 路由模块**
文件: `todo-for-ai-api-server/api/tasks/__init__.py`

在已有的 `from . import routes_agent_chat` 之后追加：

```python
from . import routes_help_request  # noqa: F401
```

- [ ] **Step 3: 验证 help request 端点可导入**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.tasks.routes_help_request import agent_help_request; print('OK')" `
Expected:
  - Exit code: 0
  - Output contains: "OK"

- [ ] **Step 4: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server/api/tasks/routes_help_request.py todo-for-ai-api-server/api/tasks/__init__.py && git commit -m "feat(help): add agent help request endpoint for human assistance"`

---

### Task 6: 前端 WebSocket 连接激活 — 初始化 wsService.connect() 并处理新事件

**Depends on:** Task 1
**Files:**
- Modify: `todo-for-ai-webpage/src/services/websocketService.ts:35-46`
- Modify: `todo-for-ai-webpage/src/hooks/useTaskRealtime.ts:1-32`
- Modify: `todo-for-ai-webpage/src/App.tsx`

- [ ] **Step 1: 扩展 websocketService.ts — 添加新事件监听和连接状态管理**
文件: `todo-for-ai-webpage/src/services/websocketService.ts`（替换整个文件）

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { io, Socket } from 'socket.io-client'
import { getApiBaseUrl } from '../utils/apiConfig'

type EventHandler = (data: any) => void

class WebSocketService {
  private socket: Socket | null = null
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private _connected = false

  get connected(): boolean {
    return this._connected
  }

  connect(token: string): void {
    if (this.socket?.connected) return

    const baseUrl = getApiBaseUrl().replace('/todo-for-ai/api/v1', '')
    this.socket = io(`${baseUrl}/user/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: 10,
    })

    this.socket.on('connect', () => {
      this._connected = true
      console.log('[WS] Connected to user namespace')
    })

    this.socket.on('disconnect', (reason) => {
      this._connected = false
      console.log('[WS] Disconnected:', reason)
      if (reason === 'io server disconnect') {
        this.socket?.connect()
      }
    })

    this.socket.on('auth_error', (data: any) => {
      console.error('[WS] Auth error:', data)
    })

    // Task events
    this.socket.on('notification', (data: any) => {
      this.emit('notification', data)
    })

    this.socket.on('task_updated', (data: any) => {
      this.emit('task_updated', data)
    })

    this.socket.on('task_comment', (data: any) => {
      this.emit('task_comment', data)
    })

    // Approval events
    this.socket.on('approval_request', (data: any) => {
      this.emit('approval_request', data)
    })

    // Help request events
    this.socket.on('help_request', (data: any) => {
      this.emit('help_request', data)
    })
  }

  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
    this._connected = false
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler)
    return () => { this.handlers.get(event)?.delete(handler) }
  }

  private emit(event: string, data: any): void {
    this.handlers.get(event)?.forEach((handler) => handler(data))
  }

  joinTaskRoom(taskId: number): void {
    this.socket?.emit('join_task', { task_id: taskId })
  }

  leaveTaskRoom(taskId: number): void {
    this.socket?.emit('leave_task', { task_id: taskId })
  }
}

export const wsService = new WebSocketService()
```

- [ ] **Step 2: 扩展 useTaskRealtime hook — 添加 approval_request 和 help_request 事件处理**
文件: `todo-for-ai-webpage/src/hooks/useTaskRealtime.ts`（替换整个文件）

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback } from 'react'
import { wsService } from '../services/websocketService'

interface TaskRealtimeOptions {
  taskId: number
  onTaskUpdate?: () => void
  onComment?: () => void
  onApprovalRequest?: () => void
  onHelpRequest?: () => void
}

export function useTaskRealtime({
  taskId,
  onTaskUpdate,
  onComment,
  onApprovalRequest,
  onHelpRequest,
}: TaskRealtimeOptions) {
  const stableOnUpdate = useCallback(() => { onTaskUpdate?.() }, [onTaskUpdate])
  const stableOnComment = useCallback(() => { onComment?.() }, [onComment])
  const stableOnApproval = useCallback(() => { onApprovalRequest?.() }, [onApprovalRequest])
  const stableOnHelp = useCallback(() => { onHelpRequest?.() }, [onHelpRequest])

  useEffect(() => {
    if (!taskId) return
    wsService.joinTaskRoom(taskId)

    const unsubUpdate = wsService.on('task_updated', (data: any) => {
      if (data.task_id === taskId) stableOnUpdate()
    })
    const unsubComment = wsService.on('task_comment', (data: any) => {
      if (data.task_id === taskId) stableOnComment()
    })
    const unsubApproval = wsService.on('approval_request', (data: any) => {
      if (data.task_id === taskId) stableOnApproval()
    })
    const unsubHelp = wsService.on('help_request', (data: any) => {
      if (data.task_id === taskId) stableOnHelp()
    })

    return () => {
      wsService.leaveTaskRoom(taskId)
      unsubUpdate()
      unsubComment()
      unsubApproval()
      unsubHelp()
    }
  }, [taskId, stableOnUpdate, stableOnComment, stableOnApproval, stableOnHelp])
}
```

- [ ] **Step 3: 在 App.tsx 中初始化 WebSocket 连接 — 用户登录后自动连接**
文件: `todo-for-ai-webpage/src/App.tsx`

在 App 组件内添加 WebSocket 连接初始化效果。找到合适位置（在现有 useEffect 之后）添加：

```typescript
// 在 App 组件内，找到现有 useEffect 区块后添加：
  // Initialize WebSocket connection when authenticated
  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('access_token')
    if (token && !wsService.connected) {
      wsService.connect(token)
    }
  }, [])
```

同时在 App.tsx 顶部添加 import：

```typescript
import { wsService } from './services/websocketService'
```

- [ ] **Step 4: 验证前端编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 5: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/services/websocketService.ts todo-for-ai-webpage/src/hooks/useTaskRealtime.ts todo-for-ai-webpage/src/App.tsx && git commit -m "feat(ws): initialize WebSocket connection and handle approval/help events"`

---

### Task 7: 前端聊天组件实时刷新 — TaskChatThread 响应 WebSocket 事件

**Depends on:** Task 6
**Files:**
- Modify: `todo-for-ai-webpage/src/components/TaskChatThread.tsx:62-64`

- [ ] **Step 1: 在 TaskChatThread 中集成 useTaskRealtime — 新消息自动刷新列表**
文件: `todo-for-ai-webpage/src/components/TaskChatThread.tsx:62-64`（在 `useEffect(() => { loadMessages(1) }, [loadMessages])` 之后添加）

```typescript
  // Real-time: reload messages when WebSocket receives new comment
  useTaskRealtime({
    taskId,
    onComment: () => { loadMessages(1) },
  })
```

同时在文件顶部添加 import（在现有 import 之后）：

```typescript
import { useTaskRealtime } from '../hooks/useTaskRealtime'
```

- [ ] **Step 2: 验证前端编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 3: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/components/TaskChatThread.tsx && git commit -m "feat(chat): TaskChatThread auto-refreshes on WebSocket events"`

---

### Task 8: 审批队列实时刷新 — 审批 UI 响应 WebSocket 推送

**Depends on:** Task 6
**Files:**
- Create: `todo-for-ai-webpage/src/hooks/useApprovalRealtime.ts`

- [ ] **Step 1: 创建 useApprovalRealtime hook — 监听审批请求 WebSocket 事件**

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useCallback } from 'react'
import { wsService } from '../services/websocketService'

interface ApprovalRealtimeOptions {
  onNewApproval?: (data: any) => void
}

export function useApprovalRealtime({ onNewApproval }: ApprovalRealtimeOptions) {
  const stableOnNew = useCallback((data: any) => { onNewApproval?.(data) }, [onNewApproval])

  useEffect(() => {
    const unsubApproval = wsService.on('approval_request', (data: any) => {
      stableOnNew(data)
    })

    return () => {
      unsubApproval()
    }
  }, [stableOnNew])
}
```

- [ ] **Step 2: 验证前端编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit --pretty 2>&1 | tail -5`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 3: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/hooks/useApprovalRealtime.ts && git commit -m "feat(approvals): add useApprovalRealtime hook for WebSocket-driven refresh"`

---

## Out of Scope

**多Agent团队编排（Low 优先级）**：路由和模型（`agent_teams`, `agent_team_orchestration`）已存在，但端到端编排流程未打通。这需要独立的 Plan 来设计 Agent 间任务分发、结果聚合、冲突解决等机制，不在本次实现范围内。本次 Plan 的基础设施（`/user/ws` namespace、WebSocket 推送、Agent 聊天能力）为后续团队编排提供了必要的通信基础。
