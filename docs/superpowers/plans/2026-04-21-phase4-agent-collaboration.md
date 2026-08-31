# Phase 4: Agent-to-Agent Advanced Collaboration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 实现 Agent 间高级协作 — 添加审计事件查询 API、治理规则模板 API、Agent 团队管理 UI、编排监控和审计回放界面。

**Architecture:** 后端模型基本完整（AgentTeam、AgentAuditEvent、InteractionGovernance）。Phase 4 聚焦：(1) 补齐审计事件和治理规则后端 API；(2) 构建 Agent 团队管理前端（CRUD + 成员管理）；(3) 构建审计回放和编排监控 UI；(4) 集成到 AgentsPage。

**Tech Stack:** Python 3.11, Flask 2, SQLAlchemy; React 18, TypeScript 5, Ant Design 5.29

**Risks:**
- AgentTeam 后端 API 丰富但前端完全缺失 → 需全面覆盖 CRUD 操作
- 审计事件数据量大 → 需分页和筛选

---

### Task 1: Backend — Audit Events API + Governance Rules API

**Depends on:** None
**Files:**
- Create: `todo-for-ai-api-server/api/agent_audit.py`
- Create: `todo-for-ai-api-server/api/agent_governance_rules.py`
- Modify: `todo-for-ai-api-server/api/__init__.py`（注册蓝图）

- [ ] **Step 1: 创建 Audit Events API**

Read existing API patterns from `todo-for-ai-api-server/api/agent_teams.py` (blueprint pattern, auth, response format). Read `todo-for-ai-api-server/models/agent_audit.py` for the `AgentAuditEvent` model fields.

Create `todo-for-ai-api-server/api/agent_audit.py`:

```python
from flask import Blueprint, request, g
from models import db
from models.agent_audit import AgentAuditEvent
from utils.response import ApiResponse
from core.auth import unified_auth_required

audit_bp = Blueprint('agent_audit', __name__)


@audit_bp.route('/workspaces/<int:workspace_id>/audit-events', methods=['GET'])
@unified_auth_required
def list_audit_events(workspace_id):
    """查询审计事件，支持分页和筛选"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    event_type = request.args.get('event_type')
    actor_type = request.args.get('actor_type')
    target_type = request.args.get('target_type')
    task_id = request.args.get('task_id', type=int)
    level = request.args.get('level')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = db.session.query(AgentAuditEvent).filter(
        AgentAuditEvent.workspace_id == workspace_id
    )

    if event_type:
        query = query.filter(AgentAuditEvent.event_type == event_type)
    if actor_type:
        query = query.filter(AgentAuditEvent.actor_type == actor_type)
    if target_type:
        query = query.filter(AgentAuditEvent.target_type == target_type)
    if task_id:
        query = query.filter(AgentAuditEvent.task_id == task_id)
    if level:
        query = query.filter(AgentAuditEvent.level == level)
    if start_date:
        query = query.filter(AgentAuditEvent.occurred_at >= start_date)
    if end_date:
        query = query.filter(AgentAuditEvent.occurred_at <= end_date)

    query = query.order_by(AgentAuditEvent.occurred_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return ApiResponse.success(data={
        'items': [e.to_dict() for e in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
    }).to_response()


@audit_bp.route('/workspaces/<int:workspace_id>/audit-events/stats', methods=['GET'])
@unified_auth_required
def audit_stats(workspace_id):
    """审计事件统计"""
    from sqlalchemy import func

    total = db.session.query(func.count(AgentAuditEvent.id)).filter(
        AgentAuditEvent.workspace_id == workspace_id
    ).scalar()

    by_level = dict(
        db.session.query(AgentAuditEvent.level, func.count(AgentAuditEvent.id))
        .filter(AgentAuditEvent.workspace_id == workspace_id)
        .group_by(AgentAuditEvent.level).all()
    )

    by_actor_type = dict(
        db.session.query(AgentAuditEvent.actor_type, func.count(AgentAuditEvent.id))
        .filter(AgentAuditEvent.workspace_id == workspace_id)
        .group_by(AgentAuditEvent.actor_type).all()
    )

    return ApiResponse.success(data={
        'total': total,
        'by_level': by_level,
        'by_actor_type': by_actor_type,
    }).to_response()
```

IMPORTANT: Read the actual model file first — the model may use `to_dict()` or may need one added. If no `to_dict()` exists, add a simple one that returns all columns as a dict.

- [ ] **Step 2: 创建 Governance Rules API**

Read `todo-for-ai-api-server/api/agent_interaction_governance.py` for existing patterns. Check if a `GovernanceRule` model exists. If not, the rules can be stored as workspace-level config.

Create `todo-for-ai-api-server/api/agent_governance_rules.py`:

```python
from flask import Blueprint, request
from models import db
from utils.response import ApiResponse
from core.auth import unified_auth_required

gov_rules_bp = Blueprint('agent_governance_rules', __name__)


@gov_rules_bp.route('/workspaces/<int:workspace_id>/governance/rules', methods=['GET'])
@unified_auth_required
def list_rules(workspace_id):
    """获取工作空间的治理规则"""
    from models.workspace import Workspace
    workspace = db.session.query(Workspace).get(workspace_id)
    if not workspace:
        return ApiResponse.error('Workspace not found', 404).to_response()
    rules = (workspace.config or {}).get('governance_rules', [])
    return ApiResponse.success(data={'rules': rules}).to_response()


@gov_rules_bp.route('/workspaces/<int:workspace_id>/governance/rules', methods=['PUT'])
@unified_auth_required
def update_rules(workspace_id):
    """更新工作空间的治理规则"""
    from models.workspace import Workspace
    data = request.get_json()
    rules = data.get('rules', [])

    workspace = db.session.query(Workspace).get(workspace_id)
    if not workspace:
        return ApiResponse.error('Workspace not found', 404).to_response()

    if not workspace.config:
        workspace.config = {}
    workspace.config['governance_rules'] = rules
    db.session.commit()

    return ApiResponse.success(data={'rules': rules}).to_response()
```

IMPORTANT: Check if the Workspace model has a `config` JSON field. If not, check what fields are available for storing governance config. Adapt accordingly. If workspace doesn't have config, store rules in a separate table or use a simple key-value approach.

- [ ] **Step 3: 注册蓝图**

Read `todo-for-ai-api-server/app.py` blueprint registration section. Add:
```python
from api.agent_audit import audit_bp
from api.agent_governance_rules import gov_rules_bp
app.register_blueprint(audit_bp, url_prefix='/todo-for-ai/api/v1')
app.register_blueprint(gov_rules_bp, url_prefix='/todo-for-ai/api/v1')
```

Match the exact registration pattern used by existing blueprints.

- [ ] **Step 4: 验证**

Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server && python -c "from api.agent_audit import audit_bp; from api.agent_governance_rules import gov_rules_bp; print('Import OK')"`

Expected: Exit code 0

- [ ] **Step 5: 提交**

```bash
cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-api-server/api/agent_audit.py todo-for-ai-api-server/api/agent_governance_rules.py todo-for-ai-api-server/app.py && git commit -m "feat(api): add audit events and governance rules APIs

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Frontend — Agent Teams API Client + Team Management UI

**Depends on:** None (parallel with Task 1)
**Files:**
- Create: `todo-for-ai-webpage/src/api/agentTeams.ts`
- Create: `todo-for-ai-webpage/src/components/AgentTeamManager.tsx`
- Create: `todo-for-ai-webpage/src/components/AgentTeamDetail.tsx`

- [ ] **Step 1: 创建 Agent Teams API Client**

Read existing API clients for patterns (e.g., `todo-for-ai-webpage/src/api/agentStatus.ts`, `todo-for-ai-webpage/src/api/approvals.ts`).

Create `todo-for-ai-webpage/src/api/agentTeams.ts`:

```typescript
import { apiClient } from './client/index.js'

export interface AgentTeam {
  id: number
  name: string
  description?: string
  avatar_url?: string
  status: string
  config?: Record<string, any>
  default_strategy?: string
  members?: AgentTeamMember[]
  created_at: string
  updated_at: string
}

export interface AgentTeamMember {
  id: number
  agent_id: number
  agent_name?: string
  role?: string
  responsibility?: string
  config?: Record<string, any>
  order_index: number
}

export interface TeamOrchestration {
  id: number
  team_id: number
  task_id: number
  strategy: string
  status: string
  subtasks?: TeamSubtask[]
  result?: any
  created_at: string
}

export interface TeamSubtask {
  id: number
  orchestration_id: number
  agent_id?: number
  title: string
  description?: string
  status: string
  output?: string
  error?: string
}

class AgentTeamsApi {
  private baseUrl(workspaceId: number) {
    return `/workspaces/${workspaceId}/agent-teams`
  }

  async list(workspaceId: number, params?: Record<string, any>): Promise<{ items: AgentTeam[]; total: number }> {
    return await apiClient.get(this.baseUrl(workspaceId), params)
  }

  async get(workspaceId: number, teamId: number): Promise<AgentTeam> {
    return await apiClient.get(`${this.baseUrl(workspaceId)}/${teamId}`)
  }

  async create(workspaceId: number, data: Partial<AgentTeam>): Promise<AgentTeam> {
    return await apiClient.post(this.baseUrl(workspaceId), data)
  }

  async update(workspaceId: number, teamId: number, data: Partial<AgentTeam>): Promise<AgentTeam> {
    return await apiClient.put(`${this.baseUrl(workspaceId)}/${teamId}`, data)
  }

  async delete(workspaceId: number, teamId: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl(workspaceId)}/${teamId}`)
  }

  // Members
  async listMembers(workspaceId: number, teamId: number): Promise<AgentTeamMember[]> {
    return await apiClient.get(`${this.baseUrl(workspaceId)}/${teamId}/members`)
  }

  async addMember(workspaceId: number, teamId: number, data: Partial<AgentTeamMember>): Promise<AgentTeamMember> {
    return await apiClient.post(`${this.baseUrl(workspaceId)}/${teamId}/members`, data)
  }

  async updateMember(workspaceId: number, teamId: number, memberId: number, data: Partial<AgentTeamMember>): Promise<AgentTeamMember> {
    return await apiClient.put(`${this.baseUrl(workspaceId)}/${teamId}/members/${memberId}`, data)
  }

  async removeMember(workspaceId: number, teamId: number, memberId: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl(workspaceId)}/${teamId}/members/${memberId}`)
  }

  // Orchestration
  async orchestrate(workspaceId: number, taskId: number, data: { team_id: number; strategy: string; participating_agent_ids?: number[] }): Promise<TeamOrchestration> {
    return await apiClient.post(`/workspaces/${workspaceId}/tasks/${taskId}/orchestrate`, data)
  }

  async getOrchestration(workspaceId: number, orchestrationId: number): Promise<TeamOrchestration> {
    return await apiClient.get(`/workspaces/${workspaceId}/orchestrations/${orchestrationId}`)
  }

  async startOrchestration(workspaceId: number, orchestrationId: number): Promise<TeamOrchestration> {
    return await apiClient.post(`/workspaces/${workspaceId}/orchestrations/${orchestrationId}/start`)
  }

  async cancelOrchestration(workspaceId: number, orchestrationId: number): Promise<TeamOrchestration> {
    return await apiClient.post(`/workspaces/${workspaceId}/orchestrations/${orchestrationId}/cancel`)
  }
}

export const agentTeamsApi = new AgentTeamsApi()
```

- [ ] **Step 2: 创建 AgentTeamManager 组件 — 团队列表和创建**

Create `todo-for-ai-webpage/src/components/AgentTeamManager.tsx`:

A card-based component that shows all agent teams in a grid, with:
- "创建团队" button that opens a Modal with form (name, description, default_strategy select)
- Each team rendered as a flat-card with name, description, member count, strategy badge, status
- Click a team card to open AgentTeamDetail
- Delete with Popconfirm
- Auto-refresh after CRUD operations

Props: `{ workspaceId: number }`

Use Ant Design components: Card, Button, Modal, Form, Input, Select, Tag, Popconfirm, Empty, Spin.
Use `getErrorMessage` for error handling.
Import conventions: `.js` extension, `import type` for types.

Strategies: `sequential` (顺序), `parallel` (并行), `map_reduce` (MapReduce), `debate` (辩论), `voting` (投票)

- [ ] **Step 3: 创建 AgentTeamDetail 组件 — 团队详情和成员管理**

Create `todo-for-ai-webpage/src/components/AgentTeamDetail.tsx`:

A drawer/modal that shows team details and allows managing members:
- Team info header (name, description, strategy, status)
- Members list as a table with columns: Agent名称, 角色, 职责, 操作(编辑/删除)
- "添加成员" button with agent selector
- Member role edit via inline editing or modal
- Team settings edit button

Props: `{ workspaceId: number; teamId: number; visible: boolean; onClose: () => void }`

For the agent selector, use a simple Select component. The agent list can be fetched from the existing agents API or passed as a prop.

- [ ] **Step 4: 验证编译**

Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 5: 提交**

```bash
cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/api/agentTeams.ts todo-for-ai-webpage/src/components/AgentTeamManager.tsx todo-for-ai-webpage/src/components/AgentTeamDetail.tsx && git commit -m "feat(ui): add agent team management components and API client

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Frontend — Audit Trail + Governance Rules UI

**Depends on:** None (parallel with Task 2)
**Files:**
- Create: `todo-for-ai-webpage/src/api/auditEvents.ts`
- Create: `todo-for-ai-webpage/src/api/governanceRules.ts`
- Create: `todo-for-ai-webpage/src/components/AuditTrail.tsx`
- Create: `todo-for-ai-webpage/src/components/GovernanceRuleEditor.tsx`

- [ ] **Step 1: 创建 Audit Events API Client**

Create `todo-for-ai-webpage/src/api/auditEvents.ts`:

```typescript
import { apiClient } from './client/index.js'

export interface AuditEvent {
  id: number
  workspace_id: number
  event_type: string
  actor_type: string
  actor_id: string
  target_type: string
  target_id: string
  level: string
  risk_score: number
  correlation_id?: string
  task_id?: number
  actor_agent_id?: number
  target_agent_id?: number
  duration_ms?: number
  payload?: Record<string, any>
  occurred_at: string
}

export interface AuditStats {
  total: number
  by_level: Record<string, number>
  by_actor_type: Record<string, number>
}

class AuditEventsApi {
  async list(workspaceId: number, params?: Record<string, any>): Promise<{ items: AuditEvent[]; total: number; page: number }> {
    return await apiClient.get(`/workspaces/${workspaceId}/audit-events`, params)
  }

  async stats(workspaceId: number): Promise<AuditStats> {
    return await apiClient.get(`/workspaces/${workspaceId}/audit-events/stats`)
  }
}

export const auditEventsApi = new AuditEventsApi()
```

- [ ] **Step 2: 创建 Governance Rules API Client**

Create `todo-for-ai-webpage/src/api/governanceRules.ts`:

```typescript
import { apiClient } from './client/index.js'

export interface GovernanceRule {
  id: string
  name: string
  description?: string
  interaction_type: string
  require_approval: boolean
  risk_threshold?: number
  auto_approve_conditions?: Record<string, any>
}

class GovernanceRulesApi {
  async list(workspaceId: number): Promise<{ rules: GovernanceRule[] }> {
    return await apiClient.get(`/workspaces/${workspaceId}/governance/rules`)
  }

  async update(workspaceId: number, rules: GovernanceRule[]): Promise<{ rules: GovernanceRule[] }> {
    return await apiClient.put(`/workspaces/${workspaceId}/governance/rules`, { rules })
  }
}

export const governanceRulesApi = new GovernanceRulesApi()
```

- [ ] **Step 3: 创建 AuditTrail 组件 — 审计事件时间线**

Create `todo-for-ai-webpage/src/components/AuditTrail.tsx`:

A table-based component showing audit events with:
- Filter bar: event_type select, actor_type select, level select, date range picker
- Table columns: 时间, 事件类型, 执行者, 目标, 级别, 风险分数, 详情
- Level tags: info=blue, warning=orange, error=red, critical=red with stronger styling
- Expandable row for payload JSON display
- Pagination
- Stats summary at top (total events, by level counts)

Props: `{ workspaceId: number }`

Use Ant Design: Table, Select, DatePicker.RangePicker, Tag, Statistic, Row, Col, Card.

- [ ] **Step 4: 创建 GovernanceRuleEditor 组件 — 治理规则配置**

Create `todo-for-ai-webpage/src/components/GovernanceRuleEditor.tsx`:

A card-based rule editor with:
- List of current rules as cards
- Each rule shows: name, interaction_type, require_approval toggle, risk_threshold
- "添加规则" button opens form
- Edit/Delete inline
- Save all rules at once via PUT

Props: `{ workspaceId: number }`

Default rules to pre-populate:
```typescript
const defaultRules = [
  { id: 'auto_approve_low_risk', name: '低风险自动审批', interaction_type: '*', require_approval: false, risk_threshold: 30 },
  { id: 'require_approval_high_risk', name: '高风险需人工审批', interaction_type: '*', require_approval: true, risk_threshold: 70 },
  { id: 'require_approval_data_access', name: '数据访问需审批', interaction_type: 'data_access', require_approval: true },
]
```

- [ ] **Step 5: 验证编译**

Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 6: 提交**

```bash
cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/api/auditEvents.ts todo-for-ai-webpage/src/api/governanceRules.ts todo-for-ai-webpage/src/components/AuditTrail.tsx todo-for-ai-webpage/src/components/GovernanceRuleEditor.tsx && git commit -m "feat(ui): add audit trail and governance rule editor components

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Integration — Wire into AgentsPage

**Depends on:** Task 1, Task 2, Task 3
**Files:**
- Modify: `todo-for-ai-webpage/src/pages/agents/AgentsPage.tsx`

- [ ] **Step 1: 添加新 Tab 到 AgentsPage**

Read `todo-for-ai-webpage/src/pages/agents/AgentsPage.tsx`. Currently has tabs: 'agents', 'activity_center', 'collaboration'.

Add two new tabs:

```typescript
import AgentTeamManager from '../../components/AgentTeamManager.js'
import AuditTrail from '../../components/AuditTrail.js'
import GovernanceRuleEditor from '../../components/GovernanceRuleEditor.js'
```

Add to the tab items:
```typescript
{
  key: 'teams',
  label: '团队管理',
  children: workspaceId ? <AgentTeamManager workspaceId={workspaceId} /> : null,
},
{
  key: 'audit',
  label: '审计日志',
  children: workspaceId ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AuditTrail workspaceId={workspaceId} />
      <GovernanceRuleEditor workspaceId={workspaceId} />
    </div>
  ) : null,
},
```

Find the correct variable name for `workspaceId` by reading the file (it comes from `useAgentsPage()` hook).

- [ ] **Step 2: 验证编译**

Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 3: 提交**

```bash
cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && git add todo-for-ai-webpage/src/pages/agents/AgentsPage.tsx && git commit -m "feat(ui): add team management and audit trail tabs to agents page

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```
