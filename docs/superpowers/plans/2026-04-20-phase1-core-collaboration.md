# Phase 1: Core Collaboration Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 为 TaskDetail 页面添加评论、活动时间线、任务指派、@提及和 WebSocket 实时更新，补齐团队协作基础。

**Architecture:** 后端已有 TaskLog（评论载体）、TaskHistory（变更记录）、通知服务（mention/assign 触发器）和 Socket.IO 基础设施。Phase 1 主要工作是：(1) 补充 user search API 用于 @提及自动补全；(2) 构建前端协作组件；(3) 添加 WebSocket user namespace 实现实时通知。数据流：用户操作 → API 调用 → 后端写入 DB + 触发通知 → WebSocket 推送给相关用户 → 前端实时更新。

**Tech Stack:** Python 3.11, Flask 2, SQLAlchemy, flask-socketio 5; React 18, TypeScript 5, Ant Design 5.29, Zustand 4, socket.io-client 4

**Risks:**
- Task 1 修改后端路由，可能影响现有 API → 缓解：只新增路由，不修改已有路由
- Task 5 新增 WebSocket namespace，需要与现有 Agent namespace 共存 → 缓解：使用独立的 `/user/ws` namespace，不影响 `/agent/ws`
- 前端 TaskDetail 页面改动较大 → 缓解：将协作组件放在独立的 Tab 中，不改变现有布局

---

### Task 1: Backend — User Search API + Mention Notification Wiring

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/api/users/routes_search.py`
- Modify: `todo-for-ai-api-server/api/users/__init__.py`（注册新蓝图）
- Modify: `todo-for-ai-api-server/api/tasks/routes_tasks.py`（在任务更新时触发 mention 通知）

- [ ] **Step 1: 创建 User Search API — 支持按用户名/邮箱搜索项目成员**

```python
# todo-for-ai-api-server/api/users/routes_search.py
from flask import Blueprint, request, jsonify, g
from models.user import User
from models.project import Project, ProjectMember
from extensions import db

search_bp = Blueprint('user_search', __name__)


@search_bp.route('/search', methods=['GET'])
def search_users():
    """搜索用户，支持按项目过滤成员"""
    query = request.args.get('q', '').strip()
    project_id = request.args.get('project_id', type=int)
    limit = min(request.args.get('limit', 10, type=int), 20)

    if not query or len(query) < 2:
        return jsonify({'success': True, 'data': []})

    base_query = db.session.query(User).filter(
        User.status == 'ACTIVE',
        db.or_(
            User.username.ilike(f'%{query}%'),
            User.nickname.ilike(f'%{query}%'),
            User.email.ilike(f'%{query}%'),
        )
    )

    if project_id:
        base_query = base_query.join(
            ProjectMember, ProjectMember.user_id == User.id
        ).filter(ProjectMember.project_id == project_id)

    users = base_query.limit(limit).all()

    return jsonify({
        'success': True,
        'data': [{
            'id': u.id,
            'username': u.username,
            'nickname': u.nickname,
            'avatar_url': u.avatar_url,
        } for u in users]
    })
```

- [ ] **Step 2: 注册 user search 蓝图到 Flask app**

找到 `todo-for-ai-api-server/api/users/__init__.py`，在蓝图注册区域添加 `search_bp` 的注册。在现有的 user 蓝图注册之后追加：

```python
# 在 todo-for-ai-api-server/api/users/__init__.py 的蓝图注册区块末尾添加
from api.users.routes_search import search_bp
app.register_blueprint(search_bp, url_prefix='/todo-for-ai/api/v1/users')
```

- [ ] **Step 3: 在任务更新路由中添加 mention 通知触发**

找到 `todo-for-ai-api-server/api/tasks/routes_tasks.py` 中的 `PUT /<int:task_id>` 处理函数。在任务更新成功后、返回响应之前，添加 mention 检测和通知触发逻辑：

```python
# 在 todo-for-ai-api-server/api/tasks/routes_tasks.py 的 update_task 函数中
# 在 "db.session.commit()" 之后、返回响应之前添加

# Detect new mentions and trigger notifications
if 'mentions' in data:
    from api.notification_service import NotificationService
    mentions = data.get('mentions', [])
    if isinstance(mentions, list):
        for mention in mentions:
            if isinstance(mention, dict) and mention.get('type') == 'human':
                user_id = mention.get('id')
                if user_id:
                    NotificationService.send_notification(
                        user_id=user_id,
                        event_type='task.mentioned',
                        title=f'你在任务中被提及: {task.title}',
                        body=f'{g.user.nickname or g.user.username} 在任务中提到了你',
                        link_url=f'/todo-for-ai/pages/tasks/{task.id}',
                        resource_type='task',
                        resource_id=str(task.id),
                        actor_id=g.user.id,
                    )
```

- [ ] **Step 4: 验证 User Search API**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.users.routes_search import search_bp; print('Import OK')"`
Expected:
  - Exit code: 0
  - Output contains: "Import OK"

- [ ] **Step 5: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server/api/users/routes_search.py todo-for-ai-api-server/api/users/__init__.py todo-for-ai-api-server/api/tasks/routes_tasks.py && git commit -m "feat(api): add user search API and mention notification trigger"`

---

### Task 2: Frontend — Task Activity Timeline Component

**Depends on:** None
**Files:**
- Create: `todo-for-ai-webpage/src/components/TaskActivityTimeline.tsx`
- Create: `todo-for-ai-webpage/src/api/taskHistory.ts`

- [ ] **Step 1: 创建 Task History API Client — 封装任务历史记录 API 调用**

```typescript
// todo-for-ai-webpage/src/api/taskHistory.ts
import { apiClient } from './client'

export interface TaskHistoryEntry {
  id: number
  task_id: number
  action: string
  field_name: string | null
  old_value: string | null
  new_value: string | null
  changed_by: string | null
  changed_at: string
  comment: string | null
}

export interface TaskHistoryResponse {
  success: boolean
  data: TaskHistoryEntry[]
}

class TaskHistoryApi {
  async getHistory(taskId: number): Promise<TaskHistoryEntry[]> {
    const response = await apiClient.get<TaskHistoryResponse>(
      `/tasks/${taskId}/history`
    )
    return response.data || []
  }
}

export const taskHistoryApi = new TaskHistoryApi()
```

- [ ] **Step 2: 创建 TaskActivityTimeline 组件 — 展示任务变更历史时间线**

```typescript
// todo-for-ai-webpage/src/components/TaskActivityTimeline.tsx
import { useEffect, useState } from 'react'
import { Timeline, Spin, Empty, Tag, Avatar, Tooltip } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  SwapOutlined,
  UserSwitchOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { taskHistoryApi, TaskHistoryEntry } from '../api/taskHistory'
import { usePageTranslation } from '../i18n/hooks/useTranslation'
import { getErrorMessage } from '../utils/errorUtils'
import { message } from 'antd'

interface TaskActivityTimelineProps {
  taskId: number
}

const ACTION_CONFIG: Record<string, { color: string; icon: React.ReactNode; labelKey: string }> = {
  CREATED: { color: 'green', icon: <PlusOutlined />, labelKey: 'created' },
  UPDATED: { color: 'blue', icon: <EditOutlined />, labelKey: 'updated' },
  STATUS_CHANGED: { color: 'orange', icon: <SwapOutlined />, labelKey: 'statusChanged' },
  ASSIGNED: { color: 'purple', icon: <UserSwitchOutlined />, labelKey: 'assigned' },
  COMPLETED: { color: 'green', icon: <CheckCircleOutlined />, labelKey: 'completed' },
  DELETED: { color: 'red', icon: <DeleteOutlined />, labelKey: 'deleted' },
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}小时前`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}天前`
  return date.toLocaleDateString('zh-CN')
}

function getChangeDescription(entry: TaskHistoryEntry): string {
  if (entry.comment) return entry.comment
  const field = entry.field_name
  if (!field) return '更新了任务'
  const fieldNames: Record<string, string> = {
    title: '标题', content: '内容', status: '状态', priority: '优先级',
    assignee_id: '负责人', due_date: '截止日期', tags: '标签',
  }
  const fieldName = fieldNames[field] || field
  if (entry.old_value && entry.new_value) {
    return `${fieldName}: "${entry.old_value}" → "${entry.new_value}"`
  }
  return `更新了${fieldName}`
}

export default function TaskActivityTimeline({ taskId }: TaskActivityTimelineProps) {
  const { tp } = usePageTranslation('taskDetail')
  const [history, setHistory] = useState<TaskHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true)
        const data = await taskHistoryApi.getHistory(taskId)
        setHistory(data)
      } catch (error) {
        message.error(getErrorMessage(error, '加载活动记录失败'))
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [taskId])

  if (loading) {
    return <Spin style={{ display: 'block', margin: '20px auto' }} />
  }

  if (history.length === 0) {
    return <Empty description="暂无活动记录" />
  }

  return (
    <Timeline
      items={history.map((entry) => {
        const config = ACTION_CONFIG[entry.action] || {
          color: 'gray', icon: <ClockCircleOutlined />, labelKey: entry.action,
        }
        return {
          color: config.color,
          dot: config.icon,
          children: (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color={config.color} style={{ margin: 0 }}>
                  {tp(`activity.${config.labelKey}`, config.labelKey)}
                </Tag>
                <span style={{ color: '#999', fontSize: 12 }}>
                  <Tooltip title={new Date(entry.changed_at).toLocaleString('zh-CN')}>
                    {formatTime(entry.changed_at)}
                  </Tooltip>
                </span>
              </div>
              <div style={{ fontSize: 13 }}>
                {entry.changed_by && (
                  <span style={{ fontWeight: 500, marginRight: 4 }}>{entry.changed_by}</span>
                )}
                {getChangeDescription(entry)}
              </div>
            </div>
          ),
        }
      })}
    />
  )
}
```

- [ ] **Step 3: 验证组件编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit src/components/TaskActivityTimeline.tsx src/api/taskHistory.ts 2>&1 | head -20`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/components/TaskActivityTimeline.tsx todo-for-ai-webpage/src/api/taskHistory.ts && git commit -m "feat(ui): add task activity timeline component"`

---

### Task 3: Frontend — Task Comments Component

**Depends on:** None
**Files:**
- Create: `todo-for-ai-webpage/src/components/TaskComments.tsx`
- Create: `todo-for-ai-webpage/src/api/taskLogs.ts`

- [ ] **Step 1: 创建 Task Logs API Client — 封装任务评论/日志 API**

```typescript
// todo-for-ai-webpage/src/api/taskLogs.ts
import { apiClient } from './client'

export interface TaskLogEntry {
  id: number
  task_id: number
  actor_type: 'HUMAN' | 'AGENT' | 'SYSTEM'
  actor_user_id: number | null
  actor_agent_id: string | null
  content: string
  content_type: string
  created_at: string
  actor_name?: string
  actor_avatar?: string
}

export interface TaskLogListResponse {
  success: boolean
  data: TaskLogEntry[]
  total: number
}

class TaskLogsApi {
  async getLogs(taskId: number, page = 1, pageSize = 50): Promise<TaskLogListResponse> {
    return await apiClient.get<TaskLogListResponse>(
      `/task-logs/?task_id=${taskId}&page=${page}&per_page=${pageSize}`
    )
  }

  async addComment(taskId: number, content: string): Promise<TaskLogEntry> {
    return await apiClient.post<TaskLogEntry>(
      `/task-logs/`, { task_id: taskId, content, content_type: 'text/markdown' }
    )
  }
}

export const taskLogsApi = new TaskLogsApi()
```

- [ ] **Step 2: 创建 TaskComments 组件 — 支持查看和添加评论**

```typescript
// todo-for-ai-webpage/src/components/TaskComments.tsx
import { useEffect, useState, useCallback } from 'react'
import { Input, Button, List, Avatar, Tag, Spin, Empty, message } from 'antd'
import { SendOutlined, RobotOutlined, UserOutlined, DesktopOutlined } from '@ant-design/icons'
import { taskLogsApi, TaskLogEntry } from '../api/taskLogs'
import { usePageTranslation } from '../i18n/hooks/useTranslation'
import { getErrorMessage } from '../utils/errorUtils'
import ReactMarkdown from 'react-markdown'

const { TextArea } = Input

interface TaskCommentsProps {
  taskId: number
}

const ACTOR_CONFIG = {
  HUMAN: { icon: <UserOutlined />, color: '#00b96b', label: '用户' },
  AGENT: { icon: <RobotOutlined />, color: '#1677ff', label: 'Agent' },
  SYSTEM: { icon: <DesktopOutlined />, color: '#999', label: '系统' },
}

export default function TaskComments({ taskId }: TaskCommentsProps) {
  const { tp } = usePageTranslation('taskDetail')
  const [logs, setLogs] = useState<TaskLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent] = useState('')

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true)
      const response = await taskLogsApi.getLogs(taskId)
      setLogs(response.data || [])
    } catch (error) {
      message.error(getErrorMessage(error, '加载评论失败'))
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { loadLogs() }, [loadLogs])

  const handleSubmit = async () => {
    if (!content.trim()) return
    try {
      setSubmitting(true)
      await taskLogsApi.addComment(taskId, content.trim())
      setContent('')
      await loadLogs()
    } catch (error) {
      message.error(getErrorMessage(error, '发送评论失败'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="添加评论... (支持 Markdown)"
          autoSize={{ minRows: 2, maxRows: 6 }}
          style={{ marginBottom: 8 }}
        />
        <div style={{ textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={submitting}
            disabled={!content.trim()}
            size="small"
          >
            发送
          </Button>
        </div>
      </div>

      {loading ? (
        <Spin style={{ display: 'block', margin: '20px auto' }} />
      ) : logs.length === 0 ? (
        <Empty description="暂无评论" />
      ) : (
        <List
          dataSource={logs}
          renderItem={(log: TaskLogEntry) => {
            const actorConfig = ACTOR_CONFIG[log.actor_type] || ACTOR_CONFIG.SYSTEM
            return (
              <List.Item style={{ padding: '8px 0', border: 'none' }}>
                <List.Item.Meta
                  avatar={
                    <Avatar
                      size="small"
                      icon={actorConfig.icon}
                      style={{ backgroundColor: actorConfig.color }}
                      src={log.actor_avatar}
                    />
                  }
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {log.actor_name || actorConfig.label}
                      </span>
                      <Tag color={actorConfig.color} style={{ fontSize: 11, margin: 0 }}>
                        {actorConfig.label}
                      </Tag>
                      <span style={{ color: '#999', fontSize: 11 }}>
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  }
                  description={
                    <div style={{ fontSize: 13 }}>
                      <ReactMarkdown>{log.content}</ReactMarkdown>
                    </div>
                  }
                />
              </List.Item>
            )
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: 验证组件编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit src/components/TaskComments.tsx src/api/taskLogs.ts 2>&1 | head -20`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/components/TaskComments.tsx todo-for-ai-webpage/src/api/taskLogs.ts && git commit -m "feat(ui): add task comments component with markdown support"`

---

### Task 4: Frontend — Task Assignment UI + @Mention Autocomplete

**Depends on:** Task 1 (user search API)
**Files:**
- Create: `todo-for-ai-webpage/src/api/userSearch.ts`
- Create: `todo-for-ai-webpage/src/components/TaskAssignment.tsx`
- Create: `todo-for-ai-webpage/src/components/MentionInput.tsx`

- [ ] **Step 1: 创建 User Search API Client — 封装用户搜索接口**

```typescript
// todo-for-ai-webpage/src/api/userSearch.ts
import { apiClient } from './client'

export interface UserSearchResult {
  id: number
  username: string
  nickname: string
  avatar_url: string | null
}

class UserSearchApi {
  async search(query: string, projectId?: number): Promise<UserSearchResult[]> {
    const params = new URLSearchParams({ q: query, limit: '10' })
    if (projectId) params.set('project_id', String(projectId))
    const response = await apiClient.get<{ success: boolean; data: UserSearchResult[] }>(
      `/users/search?${params.toString()}`
    )
    return response.data || []
  }
}

export const userSearchApi = new UserSearchApi()
```

- [ ] **Step 2: 创建 TaskAssignment 组件 — 任务指派和成员选择器**

```typescript
// todo-for-ai-webpage/src/components/TaskAssignment.tsx
import { useState, useEffect } from 'react'
import { Select, Avatar, Tag } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { userSearchApi, UserSearchResult } from '../api/userSearch'

interface TaskAssignmentProps {
  value?: Array<{ id: number; type: string; name: string; avatar?: string }>
  onChange?: (value: Array<{ id: number; type: string; name: string; avatar?: string }>) => void
  projectId?: number
  mode?: 'multiple' | 'single'
}

export default function TaskAssignment({
  value = [], onChange, projectId, mode = 'multiple',
}: TaskAssignmentProps) {
  const [options, setOptions] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const handleSearch = async (query: string) => {
    if (!query || query.length < 2) { setOptions([]); return }
    try {
      setSearching(true)
      const results = await userSearchApi.search(query, projectId)
      setOptions(results)
    } catch { setOptions([]) }
    finally { setSearching(false) }
  }

  return (
    <Select
      mode={mode === 'multiple' ? 'multiple' : undefined}
      value={value.map((v) => v.id)}
      onSearch={handleSearch}
      onChange={(selectedIds: number | number[]) => {
        const ids = Array.isArray(selectedIds) ? selectedIds : [selectedIds]
        const newValue = ids.map((id) => {
          const existing = value.find((v) => v.id === id)
          const option = options.find((o) => o.id === id)
          return {
            id,
            type: 'human',
            name: existing?.name || option?.nickname || option?.username || String(id),
            avatar: existing?.avatar || option?.avatar_url || undefined,
          }
        })
        onChange?.(newValue)
      }}
      filterOption={false}
      loading={searching}
      placeholder="搜索并选择成员..."
      style={{ width: '100%' }}
      options={options.map((u) => ({
        value: u.id,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar size={20} icon={<UserOutlined />} src={u.avatar_url} />
            <span>{u.nickname || u.username}</span>
          </div>
        ),
      }))}
      tagRender={(props) => {
        const assignee = value.find((v) => v.id === props.value)
        return (
          <Tag closable={props.closable} onClose={props.onClose} style={{ marginRight: 3 }}>
            {assignee?.name || props.label}
          </Tag>
        )
      }}
    />
  )
}
```

- [ ] **Step 3: 创建 MentionInput 组件 — 支持 @提及的文本输入框**

```typescript
// todo-for-ai-webpage/src/components/MentionInput.tsx
import { useState, useRef, useEffect } from 'react'
import { Input, Popover, Avatar, List } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { userSearchApi, UserSearchResult } from '../api/userSearch'

const { TextArea } = Input

interface MentionInputProps {
  value: string
  onChange: (value: string, mentions: UserSearchResult[]) => void
  placeholder?: string
  projectId?: number
  rows?: number
}

export default function MentionInput({
  value, onChange, placeholder, projectId, rows = 3,
}: MentionInputProps) {
  const [suggestions, setSuggestions] = useState<UserSearchResult[]>([])
  const [mentionSearch, setMentionSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mentionStart, setMentionStart] = useState(-1)
  const [detectedMentions, setDetectedMentions] = useState<UserSearchResult[]>([])
  const textAreaRef = useRef<any>(null)

  const handleChange = (text: string) => {
    const cursorPos = textAreaRef.current?.resizableTextArea?.textArea?.selectionStart ?? text.length
    const textBeforeCursor = text.substring(0, cursorPos)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex >= 0) {
      const textAfterAt = textBeforeCursor.substring(atIndex + 1)
      if (!textAfterAt.includes(' ') && textAfterAt.length > 0) {
        setMentionStart(atIndex)
        setMentionSearch(textAfterAt)
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
      }
    } else {
      setShowSuggestions(false)
    }
    onChange(text, detectedMentions)
  }

  useEffect(() => {
    if (!showSuggestions || mentionSearch.length < 1) return
    const timer = setTimeout(async () => {
      try {
        const results = await userSearchApi.search(mentionSearch, projectId)
        setSuggestions(results)
      } catch { setSuggestions([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [mentionSearch, showSuggestions, projectId])

  const insertMention = (user: UserSearchResult) => {
    const before = value.substring(0, mentionStart)
    const after = value.substring(mentionStart + 1 + mentionSearch.length)
    const newValue = `${before}@${user.nickname || user.username} ${after}`
    const newMentions = [...detectedMentions.filter((m) => m.id !== user.id), user]
    setDetectedMentions(newMentions)
    setShowSuggestions(false)
    onChange(newValue, newMentions)
  }

  const suggestionsContent = suggestions.length > 0 ? (
    <List
      size="small"
      dataSource={suggestions}
      renderItem={(user) => (
        <List.Item
          style={{ padding: '4px 8px', cursor: 'pointer' }}
          onClick={() => insertMention(user)}
        >
          <List.Item.Meta
            avatar={<Avatar size={20} icon={<UserOutlined />} src={user.avatar_url} />}
            title={<span style={{ fontSize: 13 }}>{user.nickname || user.username}</span>}
          />
        </List.Item>
      )}
      style={{ maxHeight: 200, overflow: 'auto' }}
    />
  ) : null

  return (
    <Popover
      content={suggestionsContent}
      open={showSuggestions && suggestions.length > 0}
      placement="bottomLeft"
      trigger={[]}
    >
      <TextArea
        ref={textAreaRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder || '输入内容，@提及成员...'}
        autoSize={{ minRows: rows, maxRows: 8 }}
      />
    </Popover>
  )
}
```

- [ ] **Step 4: 验证所有组件编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit src/components/TaskAssignment.tsx src/components/MentionInput.tsx src/api/userSearch.ts 2>&1 | head -20`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 5: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/api/userSearch.ts todo-for-ai-webpage/src/components/TaskAssignment.tsx todo-for-ai-webpage/src/components/MentionInput.tsx && git commit -m "feat(ui): add task assignment and mention autocomplete components"`

---

### Task 5: Frontend — Integrate Collaboration Features into TaskDetail + WebSocket Real-time

**Depends on:** Task 2, Task 3, Task 4
**Files:**
- Create: `todo-for-ai-webpage/src/services/websocketService.ts`
- Create: `todo-for-ai-webpage/src/hooks/useTaskRealtime.ts`
- Modify: `todo-for-ai-webpage/src/pages/TaskDetail.tsx`（集成协作面板）

- [ ] **Step 1: 创建 WebSocket Service — 管理与后端的 Socket.IO 连接**

```typescript
// todo-for-ai-webpage/src/services/websocketService.ts
import { io, Socket } from 'socket.io-client'
import { getApiBaseUrl } from '../utils/apiConfig'

type EventHandler = (data: any) => void

class WebSocketService {
  private socket: Socket | null = null
  private handlers: Map<string, Set<EventHandler>> = new Map()
  private reconnectAttempts = 0

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
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        this.socket?.connect()
      }
    })

    this.socket.on('notification', (data: any) => {
      this.emit('notification', data)
    })

    this.socket.on('task_updated', (data: any) => {
      this.emit('task_updated', data)
    })

    this.socket.on('task_comment', (data: any) => {
      this.emit('task_comment', data)
    })

    this.socket.on('user_presence', (data: any) => {
      this.emit('user_presence', data)
    })
  }

  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
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

- [ ] **Step 2: 创建 useTaskRealtime Hook — 任务级实时更新**

```typescript
// todo-for-ai-webpage/src/hooks/useTaskRealtime.ts
import { useEffect, useCallback } from 'react'
import { wsService } from '../services/websocketService'
import { message } from 'antd'

interface TaskRealtimeOptions {
  taskId: number
  onTaskUpdate?: (data: any) => void
  onComment?: (data: any) => void
  onPresence?: (data: any) => void
}

export function useTaskRealtime({ taskId, onTaskUpdate, onComment, onPresence }: TaskRealtimeOptions) {
  useEffect(() => {
    wsService.joinTaskRoom(taskId)

    const unsubUpdate = wsService.on('task_updated', (data: any) => {
      if (data.task_id === taskId) {
        onTaskUpdate?.(data)
      }
    })

    const unsubComment = wsService.on('task_comment', (data: any) => {
      if (data.task_id === taskId) {
        onComment?.(data)
      }
    })

    const unsubPresence = wsService.on('user_presence', (data: any) => {
      if (data.task_id === taskId) {
        onPresence?.(data)
      }
    })

    return () => {
      wsService.leaveTaskRoom(taskId)
      unsubUpdate()
      unsubComment()
      unsubPresence()
    }
  }, [taskId, onTaskUpdate, onComment, onPresence])
}
```

- [ ] **Step 3: 修改 TaskDetail.tsx — 集成协作 Tab 面板**

在 `todo-for-ai-webpage/src/pages/TaskDetail.tsx` 中，找到任务信息展示区域。在现有的任务内容展示之后，添加一个 Tabs 组件，将协作功能组织到独立 Tab 中。

在文件顶部 import 区域添加：

```typescript
// 在 TaskDetail.tsx import 区域添加
import { Tabs } from 'antd'
import TaskComments from '../components/TaskComments'
import TaskActivityTimeline from '../components/TaskActivityTimeline'
import TaskAssignment from '../components/TaskAssignment'
import { useTaskRealtime } from '../hooks/useTaskRealtime'
```

在 TaskDetail 组件内部，找到任务内容渲染区域（约在 return 语句中的任务信息展示部分）。在任务基本信息展示（标题、状态、优先级等）之后，将原有的任务内容（content/markdown 展示区域）替换为带 Tabs 的协作面板：

```typescript
// 在 TaskDetail.tsx 中，任务信息区域之后，替换原有 content 展示部分

// 实时更新 hook
useTaskRealtime({
  taskId: task?.id || 0,
  onTaskUpdate: () => loadTask(),
  onComment: () => {},
})

// 在 JSX 中，任务基本信息之后添加：

<Tabs
  defaultActiveKey="content"
  items={[
    {
      key: 'content',
      label: '任务内容',
      children: (
        <div style={{ padding: '8px 0' }}>
          {task?.content && (
            <div className="task-content" style={{ lineHeight: 1.8 }}>
              <ReactMarkdown>{task.content}</ReactMarkdown>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'comments',
      label: '评论',
      children: task?.id ? <TaskComments taskId={task.id} /> : null,
    },
    {
      key: 'activity',
      label: '活动记录',
      children: task?.id ? <TaskActivityTimeline taskId={task.id} /> : null,
    },
    {
      key: 'assignment',
      label: '指派',
      children: task?.id ? (
        <div style={{ padding: '8px 0' }}>
          <TaskAssignment
            value={task.assignees?.map((a: any) => ({
              id: a.id, type: a.type || 'human',
              name: a.name || a.nickname || '', avatar: a.avatar_url,
            })) || []}
            onChange={(assignees) => {
              handleUpdateTask({ assignees })
            }}
            projectId={task.project_id}
          />
        </div>
      ) : null,
    },
  ]}
/>
```

- [ ] **Step 4: 安装 socket.io-client 依赖**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npm install socket.io-client@^4`
Expected:
  - Exit code: 0
  - Output does NOT contain: "ERR!" or "npm error"
  - package.json contains "socket.io-client"

- [ ] **Step 5: 验证 TaskDetail 页面编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -30`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 6: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/services/websocketService.ts todo-for-ai-webpage/src/hooks/useTaskRealtime.ts todo-for-ai-webpage/src/pages/TaskDetail.tsx todo-for-ai-webpage/package.json todo-for-ai-webpage/package-lock.json && git commit -m "feat(ui): integrate collaboration tabs and WebSocket real-time into TaskDetail"`
