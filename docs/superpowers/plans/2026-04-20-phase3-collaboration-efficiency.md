# Phase 3: Collaboration Efficiency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 提升协作效率 — 添加批量任务操作后端、任务依赖关系、用户在线状态指示器和看板实时更新。

**Architecture:** Feature 13（项目成员管理）已有完整实现，跳过。Phase 3 聚焦：(1) 补齐批量操作后端 API；(2) 在 Task 模型添加依赖字段并创建管理 API；(3) 基于 last_active_at 实现在线状态指示；(4) 利用 Phase 1 的 WebSocket 基础设施实现看板实时更新。

**Tech Stack:** Python 3.11, Flask 2, SQLAlchemy; React 18, TypeScript 5, Ant Design 5.29, socket.io-client 4

**Risks:**
- Task dependency 模型新增字段需数据库迁移 → 缓解：使用 nullable 字段，无破坏性变更
- 批量操作需注意性能（大批量任务更新）→ 缓解：限制单次批量操作上限为 100 条

---

### Task 1: Backend — Batch Task API + Task Dependency Model

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/api/tasks/routes_batch.py`
- Modify: `todo-for-ai-api-server/models/task.py`（添加依赖字段）
- Modify: `todo-for-ai-api-server/app.py`（注册蓝图）

- [ ] **Step 1: 在 Task 模型中添加依赖字段**

Read `todo-for-ai-api-server/models/task.py`. Add two nullable JSON fields after the existing `mentions` field:

```python
# In Task model, after mentions field
blocking_task_ids = Column(JSON, default=list, comment='被此任务阻塞的任务ID列表')
blocked_by_task_ids = Column(JSON, default=list, comment='阻塞此任务的任务ID列表')
```

Also update `to_dict()` to include these fields in the response.

- [ ] **Step 2: 创建 Batch Task API — 批量状态更新、优先级更新、删除**

Read `todo-for-ai-api-server/api/tasks/routes_tasks.py` for existing patterns. Create:

```python
# todo-for-ai-api-server/api/tasks/routes_batch.py
from flask import Blueprint, request, g
from models import db
from models.task import Task
from utils.response import ApiResponse
from decorators.auth import unified_auth_required

batch_bp = Blueprint('task_batch', __name__)

MAX_BATCH_SIZE = 100


@batch_bp.route('/tasks/batch/update-status', methods=['POST'])
@unified_auth_required
def batch_update_status():
    data = request.get_json()
    task_ids = data.get('task_ids', [])
    new_status = data.get('status')

    if not task_ids or not new_status:
        return ApiResponse.error('task_ids and status are required').to_response()
    if len(task_ids) > MAX_BATCH_SIZE:
        return ApiResponse.error(f'Max {MAX_BATCH_SIZE} tasks per batch').to_response()

    tasks = db.session.query(Task).filter(Task.id.in_(task_ids)).all()
    for task in tasks:
        task.status = new_status
    db.session.commit()

    return ApiResponse.success(data={'updated': len(tasks)}).to_response()


@batch_bp.route('/tasks/batch/update-priority', methods=['POST'])
@unified_auth_required
def batch_update_priority():
    data = request.get_json()
    task_ids = data.get('task_ids', [])
    new_priority = data.get('priority')

    if not task_ids or not new_priority:
        return ApiResponse.error('task_ids and priority are required').to_response()
    if len(task_ids) > MAX_BATCH_SIZE:
        return ApiResponse.error(f'Max {MAX_BATCH_SIZE} tasks per batch').to_response()

    tasks = db.session.query(Task).filter(Task.id.in_(task_ids)).all()
    for task in tasks:
        task.priority = new_priority
    db.session.commit()

    return ApiResponse.success(data={'updated': len(tasks)}).to_response()


@batch_bp.route('/tasks/batch/delete', methods=['POST'])
@unified_auth_required
def batch_delete():
    data = request.get_json()
    task_ids = data.get('task_ids', [])

    if not task_ids:
        return ApiResponse.error('task_ids are required').to_response()
    if len(task_ids) > MAX_BATCH_SIZE:
        return ApiResponse.error(f'Max {MAX_BATCH_SIZE} tasks per batch').to_response()

    deleted = db.session.query(Task).filter(Task.id.in_(task_ids)).delete(synchronize_session=False)
    db.session.commit()

    return ApiResponse.success(data={'deleted': deleted}).to_response()


@batch_bp.route('/tasks/batch/assign', methods=['POST'])
@unified_auth_required
def batch_assign():
    data = request.get_json()
    task_ids = data.get('task_ids', [])
    assignees = data.get('assignees')

    if not task_ids or assignees is None:
        return ApiResponse.error('task_ids and assignees are required').to_response()
    if len(task_ids) > MAX_BATCH_SIZE:
        return ApiResponse.error(f'Max {MAX_BATCH_SIZE} tasks per batch').to_response()

    tasks = db.session.query(Task).filter(Task.id.in_(task_ids)).all()
    for task in tasks:
        task.assignees = assignees
    db.session.commit()

    return ApiResponse.success(data={'updated': len(tasks)}).to_response()
```

- [ ] **Step 3: 创建 Task Dependency 管理 API**

Add dependency management endpoints to the batch blueprint:

```python
@batch_bp.route('/tasks/<int:task_id>/dependencies', methods=['GET'])
@unified_auth_required
def get_dependencies(task_id):
    task = db.session.query(Task).get(task_id)
    if not task:
        return ApiResponse.error('Task not found', 404).to_response()
    return ApiResponse.success(data={
        'blocking': task.blocking_task_ids or [],
        'blocked_by': task.blocked_by_task_ids or [],
    }).to_response()


@batch_bp.route('/tasks/<int:task_id>/dependencies', methods=['PUT'])
@unified_auth_required
def update_dependencies(task_id):
    data = request.get_json()
    blocking = data.get('blocking_task_ids', [])
    blocked_by = data.get('blocked_by_task_ids', [])

    task = db.session.query(Task).get(task_id)
    if not task:
        return ApiResponse.error('Task not found', 404).to_response()

    task.blocking_task_ids = blocking
    task.blocked_by_task_ids = blocked_by
    db.session.commit()

    return ApiResponse.success(data=task.to_dict()).to_response()
```

- [ ] **Step 4: 注册蓝图**
Read app.py blueprint registration section. Add:
```python
from api.tasks.routes_batch import batch_bp
app.register_blueprint(batch_bp, url_prefix='/todo-for-ai/api/v1')
```

- [ ] **Step 5: 验证**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.tasks.routes_batch import batch_bp; print('Import OK')"`
Expected: Exit code 0, output contains "Import OK"

- [ ] **Step 6: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server/api/tasks/routes_batch.py todo-for-ai-api-server/models/task.py todo-for-ai-api-server/app.py && git commit -m "feat(api): add batch task operations and task dependency model"`

---

### Task 2: Frontend — Task Dependency Display + Online Status Indicator

**Depends on:** Task 1
**Files:**
- Create: `todo-for-ai-webpage/src/components/TaskDependencies.tsx`
- Create: `todo-for-ai-webpage/src/components/OnlineStatusBadge.tsx`
- Create: `todo-for-ai-webpage/src/api/taskDependencies.ts`

- [ ] **Step 1: 创建 Task Dependencies API Client**

```typescript
// todo-for-ai-webpage/src/api/taskDependencies.ts
import { apiClient } from './client/index.js'

export interface TaskDependencies {
  blocking: number[]
  blocked_by: number[]
}

class TaskDependenciesApi {
  async get(taskId: number): Promise<TaskDependencies> {
    return await apiClient.get<TaskDependencies>(`/tasks/${taskId}/dependencies`)
  }

  async update(taskId: number, data: Partial<TaskDependencies>): Promise<any> {
    return await apiClient.put(`/tasks/${taskId}/dependencies`, data)
  }
}

export const taskDependenciesApi = new TaskDependenciesApi()
```

- [ ] **Step 2: 创建 TaskDependencies 组件 — 显示和管理任务依赖关系**

```typescript
// todo-for-ai-webpage/src/components/TaskDependencies.tsx
import { useEffect, useState } from 'react'
import { Tag, Input, Button, Space, message } from 'antd'
import { LinkOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { taskDependenciesApi } from '../api/taskDependencies'
import { getErrorMessage } from '../utils/errorUtils'

interface TaskDependenciesProps {
  taskId: number
}

export default function TaskDependencies({ taskId }: TaskDependenciesProps) {
  const [blocking, setBlocking] = useState<number[]>([])
  const [blockedBy, setBlockedBy] = useState<number[]>([])
  const [newId, setNewId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const data = await taskDependenciesApi.get(taskId)
        setBlocking(data.blocking || [])
        setBlockedBy(data.blocked_by || [])
      } catch (error) {
        message.error(getErrorMessage(error, '加载依赖关系失败'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [taskId])

  const addBlocking = async () => {
    const id = parseInt(newId, 10)
    if (isNaN(id) || id <= 0) return
    if (blocking.includes(id)) { setNewId(''); return }
    try {
      const updated = [...blocking, id]
      await taskDependenciesApi.update(taskId, { blocking_task_ids: updated })
      setBlocking(updated)
      setNewId('')
    } catch (error) {
      message.error(getErrorMessage(error, '添加依赖失败'))
    }
  }

  const removeBlocking = async (id: number) => {
    try {
      const updated = blocking.filter((i) => i !== id)
      await taskDependenciesApi.update(taskId, { blocking_task_ids: updated })
      setBlocking(updated)
    } catch (error) {
      message.error(getErrorMessage(error, '移除依赖失败'))
    }
  }

  const removeBlockedBy = async (id: number) => {
    try {
      const updated = blockedBy.filter((i) => i !== id)
      await taskDependenciesApi.update(taskId, { blocked_by_task_ids: updated })
      setBlockedBy(updated)
    } catch (error) {
      message.error(getErrorMessage(error, '移除依赖失败'))
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>
          <LinkOutlined style={{ marginRight: 4 }} />
          阻塞的任务（完成此任务后才能做的任务）
        </div>
        <Space wrap>
          {blocking.map((id) => (
            <Tag key={id} closable onClose={() => removeBlocking(id)} color="orange">
              #{id}
            </Tag>
          ))}
          <Input
            size="small"
            style={{ width: 120 }}
            placeholder="输入任务ID"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            onPressEnter={addBlocking}
            suffix={<PlusOutlined onClick={addBlocking} style={{ cursor: 'pointer' }} />}
          />
        </Space>
      </div>
      <div>
        <div style={{ fontWeight: 500, marginBottom: 8 }}>
          <LinkOutlined style={{ marginRight: 4 }} />
          被阻塞（依赖的任务）
        </div>
        <Space wrap>
          {blockedBy.map((id) => (
            <Tag key={id} closable onClose={() => removeBlockedBy(id)} color="red">
              #{id}
            </Tag>
          ))}
          {blockedBy.length === 0 && <span style={{ color: '#999' }}>无依赖</span>}
        </Space>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 创建 OnlineStatusBadge 组件 — 基于最后活跃时间的在线指示器**

```typescript
// todo-for-ai-webpage/src/components/OnlineStatusBadge.tsx
import { Badge, Tooltip } from 'antd'

interface OnlineStatusBadgeProps {
  lastActiveAt: string | null
  userName?: string
  size?: 'small' | 'default'
}

function isOnline(lastActiveAt: string | null): boolean {
  if (!lastActiveAt) return false
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  return diff < 5 * 60 * 1000 // 5 minutes
}

function getStatusText(lastActiveAt: string | null): string {
  if (!lastActiveAt) return '离线'
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  if (diff < 60 * 1000) return '在线'
  if (diff < 5 * 60 * 1000) return '刚刚活跃'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前活跃`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前活跃`
  return `${Math.floor(diff / 86400000)}天前活跃`
}

export default function OnlineStatusBadge({ lastActiveAt, userName, size = 'default' }: OnlineStatusBadgeProps) {
  const online = isOnline(lastActiveAt)
  const statusText = getStatusText(lastActiveAt)

  return (
    <Tooltip title={`${userName || '用户'}: ${statusText}`}>
      <Badge status={online ? 'success' : 'default'} style={{ marginRight: 4 }} />
      {size !== 'small' && <span style={{ fontSize: 12, color: online ? '#00b96b' : '#999' }}>{statusText}</span>}
    </Tooltip>
  )
}
```

- [ ] **Step 4: 验证编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -20`
Expected: Exit code 0

- [ ] **Step 5: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/components/TaskDependencies.tsx todo-for-ai-webpage/src/components/OnlineStatusBadge.tsx todo-for-ai-webpage/src/api/taskDependencies.ts && git commit -m "feat(ui): add task dependency display and online status badge components"`

---

### Task 3: Frontend — Integrate into TaskDetail + Kanban Real-time + Wire Batch API

**Depends on:** Task 1, Task 2
**Files:**
- Modify: `todo-for-ai-webpage/src/pages/TaskDetail.tsx`（添加依赖 Tab）
- Modify: `todo-for-ai-webpage/src/api/tasks.ts`（修正批量 API 路径）
- Modify: `todo-for-ai-webpage/src/components/Kanban/KanbanBoard.tsx`（添加 WebSocket 实时更新）

- [ ] **Step 1: 修正批量任务 API 路径**

Read `todo-for-ai-webpage/src/api/tasks.ts`. Find the batch API methods (`batchDeleteTasks`, `batchUpdateTaskStatus`, `batchUpdateTaskPriority`). Update their endpoint URLs to match the new backend routes:

- `batchDeleteTasks` → `POST /tasks/batch/delete`
- `batchUpdateTaskStatus` → `POST /tasks/batch/update-status`
- `batchUpdateTaskPriority` → `POST /tasks/batch/update-priority`

- [ ] **Step 2: 在 TaskDetail 添加依赖关系 Tab**

Read `todo-for-ai-webpage/src/pages/TaskDetail.tsx`. Find the existing Tabs component (added in Phase 1). Add a new tab item for dependencies:

```typescript
import TaskDependencies from '../components/TaskDependencies'
```

Add to the Tabs items array:
```typescript
{
  key: 'dependencies',
  label: '依赖关系',
  children: task?.id ? <TaskDependencies taskId={task.id} /> : null,
},
```

- [ ] **Step 3: 在 KanbanBoard 添加 WebSocket 实时更新**

Read `todo-for-ai-webpage/src/components/Kanban/KanbanBoard.tsx`. Add WebSocket integration to refresh the board when tasks are updated by other users:

```typescript
import { wsService } from '../../services/websocketService'
```

Add a useEffect for WebSocket subscription inside the component:
```typescript
useEffect(() => {
  if (!projectId) return
  wsService.joinTaskRoom(0) // Use project-level room if available

  const unsubUpdate = wsService.on('task_updated', () => {
    // Refresh the kanban board when a task is updated
    refreshTasks()
  })

  return () => {
    unsubUpdate()
  }
}, [projectId])
```

Find the `refreshTasks` or data-reloading function name by reading the component.

- [ ] **Step 4: 验证编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -30`
Expected: Exit code 0

- [ ] **Step 5: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/pages/TaskDetail.tsx todo-for-ai-webpage/src/api/tasks.ts todo-for-ai-webpage/src/components/Kanban/KanbanBoard.tsx && git commit -m "feat(ui): add dependency tab, wire batch API, and kanban real-time updates"`
