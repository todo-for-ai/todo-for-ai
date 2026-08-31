# Phase 2: Human-Agent Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 实现人类与 Agent 协作闭环 — 让人类能看到 Agent 实时状态、审批 Agent 操作、监控 Agent 执行进度，并在任务视图中区分人类和 Agent 的工作。

**Architecture:** 后端已有 Agent 心跳、健康检查、交互治理审批和任务 analytics API。Phase 2 主要工作是：(1) 补充 pending approvals 列表 API 和任务响应中的 Agent 名称解析；(2) 构建前端 Agent 状态面板、审批队列、监控大屏和人机任务视图组件。数据流：Agent 心跳 → 后端存储状态 → API 查询 → 前端可视化；Agent 请求交互 → governance 评估 → 需审批时进入审批队列 → 人类审批 → Agent 继续执行。

**Tech Stack:** Python 3.11, Flask 2, SQLAlchemy; React 18, TypeScript 5, Ant Design 5.29, Zustand 4, socket.io-client 4

**Risks:**
- Task 1 修改后端任务响应格式，需确保不破坏现有前端 → 缓解：只新增字段，不修改现有字段
- Agent 状态面板依赖心跳数据，如果无 Agent 运行则面板为空 → 缓解：显示友好的空状态和引导提示
- 审批功能需 workspace owner/admin 权限 → 缓解：前端做权限检查，无权限时隐藏审批入口

---

### Task 1: Backend — Pending Approvals API + Agent Name Resolution in Tasks

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/api/agent_approval_queue.py`
- Modify: `todo-for-ai-api-server/api/tasks/routes_tasks.py`（task response 中添加 agent creator 信息）
- Modify: `todo-for-ai-api-server/app.py`（注册新蓝图）

- [ ] **Step 1: 创建 Pending Approvals List API — 获取待审批的 Agent 交互请求**

Read `todo-for-ai-api-server/api/agent_interaction_governance.py` first to understand the existing approval endpoint and data model. Then create:

```python
# todo-for-ai-api-server/api/agent_approval_queue.py
from flask import Blueprint, request, g
from models import db
from models.agent_task_event import AgentTaskEvent
from utils.response import ApiResponse
from decorators.auth import unified_auth_required

approval_queue_bp = Blueprint('approval_queue', __name__)


@approval_queue_bp.route('/workspaces/<int:workspace_id>/approvals/pending', methods=['GET'])
@unified_auth_required
def list_pending_approvals(workspace_id):
    """列出工作空间中所有待审批的 Agent 交互请求"""
    from models.agent import Agent
    from models.task import Task

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    query = db.session.query(AgentTaskEvent).filter(
        AgentTaskEvent.event_type == 'interaction_request',
        AgentTaskEvent.workspace_id == workspace_id,
        ~AgentTaskEvent.id.in_(
            db.session.query(AgentTaskEvent.payload['approval_id'].as_string()).filter(
                AgentTaskEvent.event_type == 'interaction_approval',
                AgentTaskEvent.workspace_id == workspace_id,
            )
        )
    ).order_by(AgentTaskEvent.created_at.desc())

    total = query.count()
    events = query.offset((page - 1) * per_page).limit(per_page).all()

    items = []
    for event in events:
        payload = event.payload or {}
        agent = db.session.query(Agent).filter(Agent.id == payload.get('agent_id')).first()
        task = db.session.query(Task).filter(Task.id == event.task_id).first() if event.task_id else None

        items.append({
            'event_id': event.id,
            'interaction_id': payload.get('interaction_id'),
            'task_id': event.task_id,
            'task_title': task.title if task else None,
            'agent_id': payload.get('agent_id'),
            'agent_name': agent.name if agent else None,
            'interaction_type': payload.get('interaction_type'),
            'risk_tier': payload.get('risk_tier'),
            'sensitivity_level': payload.get('sensitivity_level'),
            'description': payload.get('description'),
            'created_at': event.created_at.isoformat() if event.created_at else None,
        })

    return ApiResponse.success(data={
        'items': items,
        'total': total,
        'page': page,
        'per_page': per_page,
    }).to_response()


@approval_queue_bp.route('/workspaces/<int:workspace_id>/approvals/stats', methods=['GET'])
@unified_auth_required
def approval_stats(workspace_id):
    """获取审批队列统计信息"""
    pending_count = db.session.query(AgentTaskEvent).filter(
        AgentTaskEvent.event_type == 'interaction_request',
        AgentTaskEvent.workspace_id == workspace_id,
    ).count()

    approved_today = db.session.query(AgentTaskEvent).filter(
        AgentTaskEvent.event_type == 'interaction_approval',
        AgentTaskEvent.workspace_id == workspace_id,
        AgentTaskEvent.payload['decision'].as_string() == 'approved',
    ).count()

    return ApiResponse.success(data={
        'pending': pending_count,
        'approved_today': approved_today,
    }).to_response()
```

IMPORTANT: Adapt the query logic based on the actual AgentTaskEvent model structure. The pending check might need to use a different approach depending on how approvals are tracked. Read the model and existing approval endpoint first.

- [ ] **Step 2: 注册 approval queue 蓝图**

Read `todo-for-ai-api-server/app.py` to find the blueprint registration section. Add:

```python
from api.agent_approval_queue import approval_queue_bp
app.register_blueprint(approval_queue_bp, url_prefix='/todo-for-ai/api/v1')
```

Place it near other agent-related blueprint registrations.

- [ ] **Step 3: 在任务列表响应中添加 agent creator 信息**

Read the task list endpoint in `todo-for-ai-api-server/api/tasks/routes_tasks.py`. Find the `to_dict()` method or where task responses are built. For tasks where `creator_type == 'ai'`, resolve the agent name and avatar:

After reading the file, find the task serialization logic and add agent info resolution. The approach depends on how `to_dict()` works — look for where `creator_type` and `creator_identifier` are already included in the response, and add resolved agent details:

```python
# In the task serialization logic, after existing fields are built:
if task.creator_type == 'ai' and task.creator_identifier:
    from models.agent import Agent
    agent = db.session.query(Agent).filter(
        Agent.id == task.creator_identifier
    ).first()
    if agent:
        result['creator_agent'] = {
            'id': agent.id,
            'name': agent.name,
            'avatar_url': agent.avatar_url,
        }
```

Only add this if there isn't already agent resolution. Check first!

- [ ] **Step 4: 验证后端代码**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.agent_approval_queue import approval_queue_bp; print('Import OK')"`
Expected:
  - Exit code: 0
  - Output contains: "Import OK"

- [ ] **Step 5: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server/api/agent_approval_queue.py todo-for-ai-api-server/app.py todo-for-ai-api-server/api/tasks/routes_tasks.py && git commit -m "feat(api): add pending approvals list API and agent name resolution in tasks"`

---

### Task 2: Frontend — Agent Real-time Status Panel

**Depends on:** None
**Files:**
- Create: `todo-for-ai-webpage/src/components/AgentStatusPanel.tsx`
- Create: `todo-for-ai-webpage/src/api/agentStatus.ts`

- [ ] **Step 1: 创建 Agent Status API Client**

First read `todo-for-ai-webpage/src/api/agents/agents.ts` to understand the existing API pattern. Then create:

```typescript
// todo-for-ai-webpage/src/api/agentStatus.ts
import { apiClient } from './client/index.js'

export interface AgentStatus {
  agent_id: string
  agent_name: string
  status: 'running' | 'idle' | 'busy' | 'error' | 'inactive'
  active_tasks: number
  uptime_seconds: number
  last_heartbeat: string | null
  cpu_usage: number | null
  memory_usage: number | null
}

export interface WorkspaceHealthSummary {
  total_agents: number
  active_agents: number
  idle_agents: number
  error_agents: number
  agents: AgentStatus[]
}

class AgentStatusApi {
  async getWorkspaceHealth(workspaceId: number): Promise<WorkspaceHealthSummary> {
    return await apiClient.get<WorkspaceHealthSummary>(
      `/workspaces/${workspaceId}/agents/health/summary`
    )
  }

  async getAgentHealth(workspaceId: number, agentId: string): Promise<AgentStatus> {
    return await apiClient.get<AgentStatus>(
      `/workspaces/${workspaceId}/agents/${agentId}/health`
    )
  }

  async getRuntimeStatus(agentKey: string): Promise<any> {
    return await apiClient.get<any>('/agent/runtime/status')
  }
}

export const agentStatusApi = new AgentStatusApi()
```

Adapt to match the actual API client import pattern and response types.

- [ ] **Step 2: 创建 AgentStatusPanel 组件 — 显示工作空间中所有 Agent 的实时状态**

Read existing agent components in `todo-for-ai-webpage/src/pages/agents/components/` to match conventions. Then create:

```typescript
// todo-for-ai-webpage/src/components/AgentStatusPanel.tsx
import { useEffect, useState } from 'react'
import { Card, Tag, Spin, Empty, Row, Col, Progress, Tooltip, Badge, message } from 'antd'
import {
  RobotOutlined, CheckCircleOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, StopOutlined, ThunderboltOutlined,
} from '@ant-design/icons'
import { agentStatusApi, AgentStatus, WorkspaceHealthSummary } from '../api/agentStatus'
import { getErrorMessage } from '../utils/errorUtils'

interface AgentStatusPanelProps {
  workspaceId: number
}

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  running: { color: '#00b96b', icon: <CheckCircleOutlined />, label: '运行中' },
  idle: { color: '#1677ff', icon: <ClockCircleOutlined />, label: '空闲' },
  busy: { color: '#faad14', icon: <ThunderboltOutlined />, label: '忙碌' },
  error: { color: '#ff4d4f', icon: <ExclamationCircleOutlined />, label: '异常' },
  inactive: { color: '#999', icon: <StopOutlined />, label: '离线' },
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时`
  return `${Math.floor(seconds / 86400)}天`
}

export default function AgentStatusPanel({ workspaceId }: AgentStatusPanelProps) {
  const [data, setData] = useState<WorkspaceHealthSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true)
        const result = await agentStatusApi.getWorkspaceHealth(workspaceId)
        setData(result)
      } catch (error) {
        message.error(getErrorMessage(error, '加载Agent状态失败'))
      } finally {
        setLoading(false)
      }
    }
    loadStatus()
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [workspaceId])

  if (loading) return <Spin style={{ display: 'block', margin: '20px auto' }} />
  if (!data || data.agents?.length === 0) {
    return <Empty description="暂无Agent运行" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  }

  return (
    <div>
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small"><Statistic title="总数" value={data.total_agents} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="活跃" value={data.active_agents} valueStyle={{ color: '#00b96b' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="空闲" value={data.idle_agents} valueStyle={{ color: '#1677ff' }} /></Card></Col>
        <Col span={6}><Card size="small"><Statistic title="异常" value={data.error_agents} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
      </Row>
      <Row gutter={[12, 12]}>
        {(data.agents || []).map((agent) => {
          const config = STATUS_CONFIG[agent.status] || STATUS_CONFIG.inactive
          return (
            <Col xs={24} sm={12} md={8} lg={6} key={agent.agent_id}>
              <Card size="small" className="flat-card" style={{ borderLeft: `3px solid ${config.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Badge status={agent.status === 'running' || agent.status === 'busy' ? 'processing' : 'default'} />
                  <RobotOutlined style={{ fontSize: 16, color: config.color }} />
                  <span style={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {agent.agent_name}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Tag color={config.color} icon={config.icon} style={{ margin: 0 }}>
                    {config.label}
                  </Tag>
                  <span style={{ color: '#999', fontSize: 11 }}>
                    {agent.active_tasks > 0 ? `${agent.active_tasks} 任务` : '无任务'}
                  </span>
                </div>
                {agent.cpu_usage !== null && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999' }}>
                      <span>CPU</span>
                      <span>{agent.cpu_usage?.toFixed(1)}%</span>
                    </div>
                    <Progress percent={agent.cpu_usage || 0} size="small" showInfo={false} strokeColor={agent.cpu_usage > 80 ? '#ff4d4f' : '#00b96b'} />
                  </div>
                )}
                {agent.uptime_seconds > 0 && (
                  <Tooltip title={agent.last_heartbeat ? `最后心跳: ${new Date(agent.last_heartbeat).toLocaleString('zh-CN')}` : ''}>
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                      运行 {formatUptime(agent.uptime_seconds)}
                    </div>
                  </Tooltip>
                )}
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
```

Note: Import `Statistic` from antd if needed. The component already uses Row, Col, Card.

- [ ] **Step 3: 验证编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -20`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error TS"

- [ ] **Step 4: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/components/AgentStatusPanel.tsx todo-for-ai-webpage/src/api/agentStatus.ts && git commit -m "feat(ui): add agent real-time status panel component"`

---

### Task 3: Frontend — Human-in-the-Loop Approval Queue

**Depends on:** Task 1 (pending approvals API)
**Files:**
- Create: `todo-for-ai-webpage/src/components/ApprovalQueue.tsx`
- Create: `todo-for-ai-webpage/src/api/approvals.ts`

- [ ] **Step 1: 创建 Approvals API Client**

```typescript
// todo-for-ai-webpage/src/api/approvals.ts
import { apiClient } from './client/index.js'

export interface PendingApproval {
  event_id: number
  interaction_id: string
  task_id: number
  task_title: string | null
  agent_id: string
  agent_name: string | null
  interaction_type: string
  risk_tier: string
  sensitivity_level: string
  description: string
  created_at: string
}

export interface ApprovalListResponse {
  items: PendingApproval[]
  total: number
  page: number
  per_page: number
}

export interface ApprovalStats {
  pending: number
  approved_today: number
}

class ApprovalsApi {
  async getPending(workspaceId: number, page = 1): Promise<ApprovalListResponse> {
    return await apiClient.get<ApprovalListResponse>(
      `/workspaces/${workspaceId}/approvals/pending?page=${page}`
    )
  }

  async getStats(workspaceId: number): Promise<ApprovalStats> {
    return await apiClient.get<ApprovalStats>(
      `/workspaces/${workspaceId}/approvals/stats`
    )
  }

  async approve(workspaceId: number, taskId: number, interactionId: string, reason?: string): Promise<any> {
    return await apiClient.post(
      `/workspaces/${workspaceId}/tasks/${taskId}/interactions/${interactionId}/approval`,
      { decision: 'approved', reason: reason || '' }
    )
  }

  async reject(workspaceId: number, taskId: number, interactionId: string, reason: string): Promise<any> {
    return await apiClient.post(
      `/workspaces/${workspaceId}/tasks/${taskId}/interactions/${interactionId}/approval`,
      { decision: 'rejected', reason }
    )
  }
}

export const approvalsApi = new ApprovalsApi()
```

- [ ] **Step 2: 创建 ApprovalQueue 组件 — 审批待处理的 Agent 交互请求**

```typescript
// todo-for-ai-webpage/src/components/ApprovalQueue.tsx
import { useEffect, useState } from 'react'
import { Table, Tag, Button, Modal, Input, message, Badge, Space, Popconfirm, Tooltip } from 'antd'
import { CheckOutlined, CloseOutlined, RobotOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { approvalsApi, PendingApproval, ApprovalStats } from '../api/approvals'
import { getErrorMessage } from '../utils/errorUtils'

const { TextArea } = Input

interface ApprovalQueueProps {
  workspaceId: number
}

const RISK_COLORS: Record<string, string> = {
  critical: '#ff4d4f', high: '#faad14', medium: '#1677ff', low: '#00b96b',
}

const SENSITIVITY_COLORS: Record<string, string> = {
  critical: '#ff4d4f', high: '#fa8c16', medium: '#1677ff', low: '#00b96b',
}

export default function ApprovalQueue({ workspaceId }: ApprovalQueueProps) {
  const [approvals, setApprovals] = useState<PendingApproval[]>([])
  const [stats, setStats] = useState<ApprovalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; item: PendingApproval | null; reason: string }>({
    visible: false, item: null, reason: '',
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const [listResponse, statsResponse] = await Promise.all([
        approvalsApi.getPending(workspaceId),
        approvalsApi.getStats(workspaceId),
      ])
      setApprovals(listResponse.items || [])
      setStats(statsResponse)
    } catch (error) {
      message.error(getErrorMessage(error, '加载审批队列失败'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [workspaceId])

  const handleApprove = async (item: PendingApproval) => {
    try {
      await approvalsApi.approve(workspaceId, item.task_id, item.interaction_id)
      message.success('已批准')
      loadData()
    } catch (error) {
      message.error(getErrorMessage(error, '审批操作失败'))
    }
  }

  const handleReject = async () => {
    const { item, reason } = rejectModal
    if (!item) return
    if (!reason.trim()) {
      message.warning('请填写拒绝原因')
      return
    }
    try {
      await approvalsApi.reject(workspaceId, item.task_id, item.interaction_id, reason)
      message.success('已拒绝')
      setRejectModal({ visible: false, item: null, reason: '' })
      loadData()
    } catch (error) {
      message.error(getErrorMessage(error, '审批操作失败'))
    }
  }

  const columns = [
    {
      title: 'Agent', dataIndex: 'agent_name', key: 'agent',
      render: (name: string) => (
        <Space><RobotOutlined style={{ color: '#1677ff' }} />{name || '未知'}</Space>
      ),
    },
    {
      title: '任务', dataIndex: 'task_title', key: 'task',
      ellipsis: true,
    },
    {
      title: '类型', dataIndex: 'interaction_type', key: 'type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: '风险', dataIndex: 'risk_tier', key: 'risk',
      render: (risk: string) => (
        <Tag color={RISK_COLORS[risk] || '#999'}>{risk}</Tag>
      ),
    },
    {
      title: '敏感度', dataIndex: 'sensitivity_level', key: 'sensitivity',
      render: (level: string) => (
        <Tag color={SENSITIVITY_COLORS[level] || '#999'}>{level}</Tag>
      ),
    },
    {
      title: '时间', dataIndex: 'created_at', key: 'time',
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作', key: 'action',
      render: (_: any, record: PendingApproval) => (
        <Space>
          <Popconfirm title="确认批准此请求？" onConfirm={() => handleApprove(record)}>
            <Button type="primary" size="small" icon={<CheckOutlined />}>批准</Button>
          </Popconfirm>
          <Button danger size="small" icon={<CloseOutlined />}
            onClick={() => setRejectModal({ visible: true, item: record, reason: '' })}
          >
            拒绝
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      {stats && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Badge count={stats.pending}><Tag color="orange">待审批</Tag></Badge>
          <Tag color="green">今日已批准: {stats.approved_today}</Tag>
        </div>
      )}
      <Table
        dataSource={approvals}
        columns={columns}
        rowKey="event_id"
        loading={loading}
        pagination={{ pageSize: 10, total: stats?.pending || 0 }}
        size="small"
        locale={{ emptyText: '暂无待审批请求' }}
      />
      <Modal
        title="拒绝请求"
        open={rejectModal.visible}
        onOk={handleReject}
        onCancel={() => setRejectModal({ visible: false, item: null, reason: '' })}
        okText="确认拒绝"
        okButtonProps={{ danger: true }}
      >
        <p>拒绝 <strong>{rejectModal.item?.agent_name}</strong> 的请求</p>
        <TextArea
          value={rejectModal.reason}
          onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
          placeholder="请输入拒绝原因（必填）"
          rows={3}
        />
      </Modal>
    </div>
  )
}
```

- [ ] **Step 3: 验证编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -20`
Expected:
  - Exit code: 0

- [ ] **Step 4: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/components/ApprovalQueue.tsx todo-for-ai-webpage/src/api/approvals.ts && git commit -m "feat(ui): add human-in-the-loop approval queue component"`

---

### Task 4: Frontend — Agent Task Monitoring Dashboard

**Depends on:** None
**Files:**
- Create: `todo-for-ai-webpage/src/components/AgentTaskMonitor.tsx`

- [ ] **Step 1: 创建 AgentTaskMonitor 组件 — 展示 Agent 任务执行状态大屏**

```typescript
// todo-for-ai-webpage/src/components/AgentTaskMonitor.tsx
import { useEffect, useState } from 'react'
import { Table, Tag, Progress, Card, Row, Col, Statistic, Spin, Empty, message, Tooltip } from 'antd'
import {
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
  ClockCircleOutlined, RobotOutlined,
} from '@ant-design/icons'
import { apiClient } from '../api/client/index.js'
import { getErrorMessage } from '../utils/errorUtils'

interface TaskAttempt {
  attempt_id: string
  task_id: number
  task_title: string
  agent_id: string
  agent_name: string
  state: 'CREATED' | 'ACTIVE' | 'COMMITTED' | 'ABORTED'
  progress: number
  started_at: string
  duration_seconds: number
}

interface MonitorData {
  active_tasks: number
  completed_today: number
  failed_today: number
  avg_duration_seconds: number
  recent_attempts: TaskAttempt[]
}

const STATE_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  CREATED: { color: '#1677ff', icon: <ClockCircleOutlined />, label: '排队中' },
  ACTIVE: { color: '#faad14', icon: <SyncOutlined spin />, label: '执行中' },
  COMMITTED: { color: '#00b96b', icon: <CheckCircleOutlined />, label: '已完成' },
  ABORTED: { color: '#ff4d4f', icon: <CloseCircleOutlined />, label: '已中止' },
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(0)}秒`
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}分钟`
  return `${(seconds / 3600).toFixed(1)}小时`
}

interface AgentTaskMonitorProps {
  workspaceId: number
}

export default function AgentTaskMonitor({ workspaceId }: AgentTaskMonitorProps) {
  const [data, setData] = useState<MonitorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMonitor = async () => {
      try {
        setLoading(true)
        const result = await apiClient.get<MonitorData>(
          `/workspaces/${workspaceId}/agents/health/summary`
        )
        setData(result)
      } catch (error) {
        message.error(getErrorMessage(error, '加载监控数据失败'))
      } finally {
        setLoading(false)
      }
    }
    loadMonitor()
    const interval = setInterval(loadMonitor, 15000)
    return () => clearInterval(interval)
  }, [workspaceId])

  if (loading) return <Spin style={{ display: 'block', margin: '20px auto' }} />
  if (!data) return <Empty description="暂无监控数据" />

  const columns = [
    {
      title: 'Agent', dataIndex: 'agent_name', key: 'agent',
      render: (name: string) => (
        <span><RobotOutlined style={{ color: '#1677ff', marginRight: 4 }} />{name}</span>
      ),
    },
    {
      title: '任务', dataIndex: 'task_title', key: 'task', ellipsis: true,
    },
    {
      title: '状态', dataIndex: 'state', key: 'state',
      render: (state: string) => {
        const config = STATE_CONFIG[state] || STATE_CONFIG.CREATED
        return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>
      },
    },
    {
      title: '进度', dataIndex: 'progress', key: 'progress',
      render: (progress: number) => (
        <Progress percent={progress || 0} size="small" style={{ width: 100 }} />
      ),
    },
    {
      title: '耗时', dataIndex: 'duration_seconds', key: 'duration',
      render: (sec: number) => formatDuration(sec || 0),
    },
  ]

  return (
    <div>
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" className="flat-card">
            <Statistic title="执行中" value={data.active_tasks} prefix={<SyncOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="flat-card">
            <Statistic title="今日完成" value={data.completed_today} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#00b96b' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="flat-card">
            <Statistic title="今日失败" value={data.failed_today} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" className="flat-card">
            <Tooltip title="平均任务完成时间">
              <Statistic title="平均耗时" value={formatDuration(data.avg_duration_seconds || 0)} />
            </Tooltip>
          </Card>
        </Col>
      </Row>
      <Table
        dataSource={data.recent_attempts || []}
        columns={columns}
        rowKey="attempt_id"
        size="small"
        pagination={{ pageSize: 10 }}
        locale={{ emptyText: '暂无Agent任务执行记录' }}
      />
    </div>
  )
}
```

- [ ] **Step 2: 验证编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -20`
Expected:
  - Exit code: 0

- [ ] **Step 3: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/components/AgentTaskMonitor.tsx && git commit -m "feat(ui): add agent task monitoring dashboard component"`

---

### Task 5: Frontend — Human-Agent Task View + Integration into Agent Pages

**Depends on:** Task 2, Task 3, Task 4
**Files:**
- Create: `todo-for-ai-webpage/src/components/CreatorBadge.tsx`
- Modify: `todo-for-ai-webpage/src/pages/agents/AgentsPage.tsx`（添加协作 Tab）
- Modify: `todo-for-ai-webpage/src/components/ProjectDetail/hooks/useTaskTableConfig.tsx`（任务列表中显示 creator type badge）

- [ ] **Step 1: 创建 CreatorBadge 组件 — 在任务列表中区分人类和 Agent 创建者**

```typescript
// todo-for-ai-webpage/src/components/CreatorBadge.tsx
import { Tag, Tooltip, Avatar } from 'antd'
import { UserOutlined, RobotOutlined } from '@ant-design/icons'

interface CreatorBadgeProps {
  creatorType?: string
  creatorName?: string
  creatorAvatar?: string
  isAiTask?: boolean
}

export default function CreatorBadge({ creatorType, creatorName, creatorAvatar, isAiTask }: CreatorBadgeProps) {
  const isAI = creatorType === 'ai' || isAiTask

  if (isAI) {
    return (
      <Tooltip title={`Agent: ${creatorName || 'AI'}`}>
        <Tag
          icon={<RobotOutlined />}
          color="blue"
          style={{ margin: 0, cursor: 'pointer' }}
        >
          {creatorName || 'AI'}
        </Tag>
      </Tooltip>
    )
  }

  return (
    <Tooltip title={creatorName || '用户'}>
      <Tag
        icon={<UserOutlined />}
        color="green"
        style={{ margin: 0, cursor: 'pointer' }}
      >
        {creatorName || '用户'}
      </Tag>
    </Tooltip>
  )
}
```

- [ ] **Step 2: 在任务表格配置中添加 Creator 列**

Read `todo-for-ai-webpage/src/components/ProjectDetail/hooks/useTaskTableConfig.tsx` completely. Find the columns array definition and add a new column for creator type. Insert it after the title column:

```typescript
// Add to the columns array in useTaskTableConfig.tsx
// Insert after the title column definition:
{
  title: '创建者',
  dataIndex: 'creator_type',
  key: 'creator',
  width: 100,
  render: (creatorType: string, record: any) => (
    <CreatorBadge
      creatorType={creatorType}
      creatorName={record.creator?.nickname || record.creator_agent?.name}
      isAiTask={record.is_ai_task}
    />
  ),
},
```

Also add the import at the top:
```typescript
import CreatorBadge from '../../CreatorBadge'
```

- [ ] **Step 3: 在 Agent 页面添加协作 Tab — 集成状态面板、审批队列、监控大屏**

Read `todo-for-ai-webpage/src/pages/agents/AgentsPage.tsx` completely. It already has tabs for "Agent List" and "Activity Center". Add a new tab "协作中心" that integrates the three Phase 2 components:

Add imports:
```typescript
import AgentStatusPanel from '../../components/AgentStatusPanel'
import ApprovalQueue from '../../components/ApprovalQueue'
import AgentTaskMonitor from '../../components/AgentTaskMonitor'
```

Find the Tabs component and add a new tab item:
```typescript
{
  key: 'collaboration',
  label: '协作中心',
  children: workspaceId ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card title="Agent 状态" size="small" className="flat-card">
        <AgentStatusPanel workspaceId={workspaceId} />
      </Card>
      <Card title="任务监控" size="small" className="flat-card">
        <AgentTaskMonitor workspaceId={workspaceId} />
      </Card>
      <Card title="审批队列" size="small" className="flat-card">
        <ApprovalQueue workspaceId={workspaceId} />
      </Card>
    </div>
  ) : <Empty description="请选择工作空间" />,
},
```

IMPORTANT: Check how workspaceId is determined in the current page. It might come from URL params, state, or user context. Adapt accordingly.

- [ ] **Step 4: 验证编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -30`
Expected:
  - Exit code: 0

- [ ] **Step 5: 提交**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/components/CreatorBadge.tsx todo-for-ai-webpage/src/pages/agents/AgentsPage.tsx todo-for-ai-webpage/src/components/ProjectDetail/hooks/useTaskTableConfig.tsx && git commit -m "feat(ui): add human-agent task view and collaboration center in agent page"`
