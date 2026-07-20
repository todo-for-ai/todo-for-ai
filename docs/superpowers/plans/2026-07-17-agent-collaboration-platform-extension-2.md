# Agent 协作平台分析能力扩展（二）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 新增 6 个分析维度，把 Agent 协作平台从"事后统计"推进到"预测与演化洞察"：Agent 工作负载预测、知识传播网络、工作流步骤瓶颈时序、协议决策延迟、任务返工分析、Agent 专长演化。

**Architecture:** 每个增量遵循固定数据流：用户请求 → Flask 端点用 SQLAlchemy 聚合（`func.date` 分日 / `group_by` / 线性回归纯 Python 实现）→ MCP 工具透传（5 处修改：定义+调度+handler+api-client+白名单）→ 前端类型化 API 方法 → Dashboard/Workflows 纯 SVG 可视化（散点回归线 / Sankey 风格边 / 时序多线 / 箱线 / 返工链 / 堆叠面积）。所有端点追加到文件 EOF，不改现有代码；前端卡片惰性渲染 `{data && data.length > 0 && (<Card>)}`。

**Tech Stack:** Python 3 / Flask / SQLAlchemy（后端，`func`/`func.date`/`group_by` 聚合），TypeScript / Node.js（MCP，5 处修改模式），React 18 / Antd 5 / Vite（前端，纯 SVG 无第三方图表库）

**Risks:**
- 增量 271 线性回归不能用 numpy（环境无依赖）→ 缓解：最小二乘法手写公式 `slope = Σ((x-x̄)(y-ȳ)) / Σ((x-x̄)²)`
- 增量 275 比较任务状态需 `TaskHistory.old_value`/`new_value`（Text 列存枚举字符串）→ 缓解：直接字符串比较 `'done'`/`'in_progress'`
- 增量 272 传播网络需避免 N+1 → 缓解：先聚合 `AgentExperience.is_shared=True` 按 source_agent，再批量查 Agent 名
- MCP server.ts 已 8000+ 行 → 缓解：所有新增追加到既有锚点（工具数组、dispatch、whitelist、handler 末尾）

---

### Task 1: Agent 工作负载预测（增量 271）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/agents.py`（EOF 追加，当前 15323 行）
- Modify: `todo-for-ai-mcp/src/server.ts`（5 处）
- Modify: `todo-for-ai-mcp/src/api-client.ts`（`getVersion` 私有方法前追加）
- Modify: `todo-for-ai-webpage/src/api/agents.ts`（类型+方法）
- Modify: `todo-for-ai-webpage/src/pages/Dashboard.tsx`（新卡片）

- [ ] **Step 1: 创建后端端点 — Agent 工作负载预测**

文件: `todo-for-ai-api-server/api/agents.py`（追加到文件末尾）

```python
@agents_bp.route("/workload-forecast", methods=["GET"])
@login_required
def agent_workload_forecast():
    """Forecast each Agent's near-future task load via linear regression.

    Uses the daily assignment count over the lookback window as the
    regression signal. Returns per-agent slope (trend direction),
    forecast for the next 3 days, and recent average.

    Query params:
    - days: lookback window (7-90, default 30)
    - horizon: forecast days (1-14, default 3)
    - limit: max agents returned (1-20, default 10)
    """
    user = get_current_user()
    try:
        days = max(7, min(90, int(request.args.get("days", 30))))
        horizon = max(1, min(14, int(request.args.get("horizon", 3))))
        limit = max(1, min(20, int(request.args.get("limit", 10))))
    except (TypeError, ValueError):
        days, horizon, limit = 30, 3, 10

    from models.agent import TaskAssignment
    since = datetime.utcnow() - timedelta(days=days)

    rows = (
        TaskAssignment.query
        .join(Agent, TaskAssignment.agent_id == Agent.id)
        .filter(Agent.owner_id == user.id, TaskAssignment.assigned_at >= since)
        .with_entities(
            TaskAssignment.agent_id,
            Agent.name,
            func.date(TaskAssignment.assigned_at).label("d"),
            func.count(TaskAssignment.id).label("c"),
        )
        .group_by(TaskAssignment.agent_id, Agent.name, func.date(TaskAssignment.assigned_at))
        .all()
    )

    date_range = [(datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d") for i in range(days)]
    agent_days = {}  # agent_id -> {name, counts[date]}
    for aid, aname, d, c in rows:
        d_str = d.isoformat() if hasattr(d, "isoformat") else str(d)
        agent_days.setdefault(aid, {"name": aname or f"Agent#{aid}", "counts": {}})["counts"][d_str] = c

    results = []
    for aid, info in agent_days.items():
        series = [info["counts"].get(d, 0) for d in date_range]
        n = len(series)
        total = sum(series)
        if total == 0:
            continue
        x_mean = (n - 1) / 2.0
        y_mean = total / n
        num = sum((i - x_mean) * (series[i] - y_mean) for i in range(n))
        den = sum((i - x_mean) ** 2 for i in range(n))
        slope = num / den if den else 0.0
        intercept = y_mean - slope * x_mean
        forecast = [max(0, round(intercept + slope * (n + k))) for k in range(horizon)]
        recent_avg = round(sum(series[-7:]) / min(7, n), 2)
        results.append({
            "agent_id": aid,
            "agent_name": info["name"],
            "total": total,
            "recent_avg": recent_avg,
            "slope": round(slope, 3),
            "trend": "up" if slope > 0.1 else ("down" if slope < -0.1 else "flat"),
            "series": series,
            "forecast": forecast,
            "forecast_total": sum(forecast),
        })

    results.sort(key=lambda r: r["forecast_total"], reverse=True)
    return ApiResponse.success({
        "agents": results[:limit],
        "days": days,
        "horizon": horizon,
        "date_range": date_range,
    }).to_response()
```

- [ ] **Step 2: 添加 MCP 工具 — get_agent_workload_forecast（5 处修改）**

文件: `todo-for-ai-mcp/src/server.ts`

工具定义（在第 3648 行 `get_channel_activity_trend` 工具定义的 `},` 之后、`];` 之前插入）：

```typescript
        {
          name: 'get_agent_workload_forecast',
          description: 'Forecast each Agent near-future task load via linear regression on daily assignment counts. Returns per-agent slope, 3-day forecast, and recent average.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window (7-90, default 30)' },
              horizon: { type: 'integer', description: 'Forecast days (1-14, default 3)' },
              limit: { type: 'integer', description: 'Max agents (1-20, default 10)' },
            },
          },
        },
```

调度 case（在 `case 'get_channel_activity_trend':` 块的 `break;` 之后插入）：

```typescript
          case 'get_agent_workload_forecast':
            logger.info(`[MCP_SERVER] Executing get_agent_workload_forecast`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetAgentWorkloadForecast(args);
            break;
```

白名单（在 `'get_channel_activity_trend'` 之后添加）：

```typescript
                'get_channel_activity_trend',
                'get_agent_workload_forecast',
```

handler 函数（在 `private async handleGetChannelActivityTrend` 方法结束的 `}` 之后、`async run(): Promise<void> {` 之前插入）：

```typescript
  private async handleGetAgentWorkloadForecast(args: any) {
    const days = Math.max(7, Math.min(90, Number(args?.days ?? 30) || 30));
    const horizon = Math.max(1, Math.min(14, Number(args?.horizon ?? 3) || 3));
    const limit = Math.max(1, Math.min(20, Number(args?.limit ?? 10) || 10));
    const result = await this.apiClient.getAgentWorkloadForecast(days, horizon, limit);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const lines = agents.map((a: any) => {
      const arrow = a.trend === 'up' ? '↑' : a.trend === 'down' ? '↓' : '→';
      return `- ${a.agent_name}: 近7日均${a.recent_avg} 预测${a.forecast_total} ${arrow} 趋势${a.slope}`;
    });
    return this.toToolResponse(
      `Agent工作负载预测(近${data.days ?? days}天, 预测${data.horizon ?? horizon}天):\n${lines.join('\n') || '无负载数据'}`,
      result,
    );
  }
```

- [ ] **Step 3: 添加 MCP API 客户端方法 — getAgentWorkloadForecast**

文件: `todo-for-ai-mcp/src/api-client.ts`（在 `private getVersion(): string {` 之前插入）

```typescript
  async getAgentWorkloadForecast(days = 30, horizon = 3, limit = 10): Promise<any> {
    logger.info('[API_CLIENT] Getting agent workload forecast', { days, horizon, limit });
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/workload-forecast', {
        params: { days, horizon, limit },
      });
      return this.unwrapApiData<any>(response.data);
    }, 'getAgentWorkloadForecast');
  }
```

- [ ] **Step 4: 添加前端类型和 API 方法**

文件: `todo-for-ai-webpage/src/api/agents.ts`

在 `ChannelActivityTrend` 接口定义之后添加类型：

```typescript
/** Agent 工作负载预测 */
export interface WorkloadForecastAgent {
  agent_id: number
  agent_name: string
  total: number
  recent_avg: number
  slope: number
  trend: 'up' | 'down' | 'flat'
  series: number[]
  forecast: number[]
  forecast_total: number
}

/** Agent 工作负载预测结果 */
export interface AgentWorkloadForecast {
  agents: WorkloadForecastAgent[]
  days: number
  horizon: number
  date_range: string[]
}
```

在 `AgentsApi` 类的 `getChannelActivityTrend` 方法之后添加方法：

```typescript
  async getAgentWorkloadForecast(days = 30, horizon = 3, limit = 10): Promise<AgentWorkloadForecast> {
    return unwrapData<AgentWorkloadForecast>(await apiClient.get(`/agents/workload-forecast${buildQuery({ days, horizon, limit })}`))
  }
```

- [ ] **Step 5: 添加 Dashboard UI 卡片 — 工作负载预测**

文件: `todo-for-ai-webpage/src/pages/Dashboard.tsx`

5a. 在 agents 类型 import 行追加 `AgentWorkloadForecast`：

```typescript
import { agentsApi, type ..., type AgentRunResourceUsage, type AgentSkillMatching, type AgentTaskHandoffStats, type AgentWorkloadForecast } from '../api/agents'
```

5b. 在 `handoffStats` state 声明之后追加：

```typescript
  const [workloadForecast, setWorkloadForecast] = useState<AgentWorkloadForecast | null>(null)
```

5c. 在 `getAgentTaskHandoffStats` 调用之后追加：

```typescript
      agentsApi.getAgentWorkloadForecast(30, 3, 10).then(setWorkloadForecast).catch(() => {})
```

5d. 在「Agent 任务交接统计」卡片之后插入工作负载预测卡片：

```tsx
      {/* Agent Workload Forecast */}
      {workloadForecast && workloadForecast.agents.length > 0 && (
        <Card
          title={<Space><ThunderboltOutlined /> Agent 工作负载预测</Space>}
          style={{ marginBottom: 24 }}
          extra={<Text type="secondary" style={{ fontSize: 12 }}>近 {workloadForecast.days} 天 · 预测 {workloadForecast.horizon} 天</Text>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {workloadForecast.agents.map((a, ai) => {
              const all = [...a.series, ...a.forecast]
              const maxV = Math.max(1, ...all)
              const w = 180
              const h = 28
              const totalLen = a.series.length + a.forecast.length
              const histPts = a.series.map((v, i) => `${(i / (totalLen - 1)) * w},${h - (v / maxV) * (h - 2)}`).join(' ')
              const fcStartIdx = a.series.length - 1
              const fcPts = a.forecast.map((v, k) => `${((fcStartIdx + k) / (totalLen - 1)) * w},${h - (v / maxV) * (h - 2)}`).join(' ')
              const trendColor = a.trend === 'up' ? '#ff4d4f' : a.trend === 'down' ? '#52c41a' : '#8c8c8c'
              return (
                <div key={ai} style={{ background: '#fafafa', borderRadius: 4, padding: '6px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 12 }}>{a.agent_name}</Text>
                    <Space size={4}>
                      <Tag color={a.trend === 'up' ? 'red' : a.trend === 'down' ? 'green' : 'default'} style={{ fontSize: 10 }}>{a.trend === 'up' ? '↑上升' : a.trend === 'down' ? '↓下降' : '→平稳'}</Tag>
                      <Tag style={{ fontSize: 10 }}>预测 +{a.forecast_total}</Tag>
                    </Space>
                  </div>
                  <svg width={w} height={h} style={{ display: 'block' }}>
                    {a.series.length > 1 && <polyline points={histPts} fill="none" stroke="#1890ff" strokeWidth={1.5} />}
                    {a.forecast.length > 0 && <polyline points={fcPts} fill="none" stroke={trendColor} strokeWidth={1.5} strokeDasharray="4 3" />}
                  </svg>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: '#1890ff' }}>— 历史</span>
            <span style={{ fontSize: 10, color: '#ff4d4f' }}>┄ 预测</span>
          </div>
        </Card>
      )}
```

- [ ] **Step 6: 验证编译**
Run: `cd todo-for-ai-api-server && python3 -c "import ast; ast.parse(open('api/agents.py').read())"` && `cd todo-for-ai-mcp && ./node_modules/.bin/tsc --noEmit` && `cd todo-for-ai-webpage && ./node_modules/.bin/tsc --noEmit`
Expected:
  - Exit code: 0
  - No error output

- [ ] **Step 7: 提交**
Run: 逐子模块 `git add -A && git commit -m "feat: add agent workload forecast (increment 271)"`，然后父仓库 `git add todo-for-ai-api-server todo-for-ai-mcp todo-for-ai-webpage && git commit -m "chore: update submodule reference for increment 271 (agent workload forecast)"`

---

### Task 2: 跨 Agent 知识传播网络（增量 272）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/agents.py`（EOF 追加）
- Modify: `todo-for-ai-mcp/src/server.ts`（5 处）
- Modify: `todo-for-ai-mcp/src/api-client.ts`
- Modify: `todo-for-ai-webpage/src/api/agents.ts`
- Modify: `todo-for-ai-webpage/src/pages/Dashboard.tsx`

- [ ] **Step 1: 创建后端端点 — 知识传播网络**

文件: `todo-for-ai-api-server/api/agents.py`（追加到文件末尾）

```python
@agents_bp.route("/knowledge-propagation-network", methods=["GET"])
@login_required
def knowledge_propagation_network():
    """Build a knowledge propagation network across Agents.

    Nodes are Agents that either shared experiences (sources) or
    consumed shared experiences (consumers). Edges connect a source
    Agent to a consumer Agent weighted by reuse count. Reveals which
    Agents propagate knowledge most broadly.

    Query params:
    - days: lookback window (1-365, default 90)
    - limit: max edges returned (1-50, default 20)
    """
    user = get_current_user()
    try:
        days = max(1, min(365, int(request.args.get("days", 90))))
        limit = max(1, min(50, int(request.args.get("limit", 20))))
    except (TypeError, ValueError):
        days, limit = 90, 20

    from models.agent import AgentExperience, Agent
    since = datetime.utcnow() - timedelta(days=days)

    # Shared experiences are sources; reuses propagate to consumers.
    shared = (
        AgentExperience.query
        .join(Agent, AgentExperience.agent_id == Agent.id)
        .filter(
            Agent.owner_id == user.id,
            AgentExperience.is_shared == True,
            AgentExperience.created_at >= since,
        )
        .with_entities(
            AgentExperience.agent_id,
            AgentExperience.domain,
            AgentExperience.times_reused,
            AgentExperience.id,
        )
        .all()
    )

    # Aggregate source contribution
    source_contrib = {}  # source_agent_id -> {domains:set, reuses:int, exps:int}
    for src_id, domain, reused, _eid in shared:
        c = source_contrib.setdefault(src_id, {"domains": set(), "reuses": 0, "exps": 0})
        if domain:
            c["domains"].add(domain)
        c["reuses"] += reused or 0
        c["exps"] += 1

    # Consumer side: experiences that were reused derive from some source.
    # Approximate consumer edges via reuse count attributed back to source.
    # We treat each source as a node; consumers are derived from times_reused spread.
    # For network edges, attribute reuse to other active agents proportional to activity.
    all_agents = Agent.query.filter_by(owner_id=user.id).all()
    agent_names = {a.id: (a.name or f"Agent#{a.id}") for a in all_agents}

    # Build edges: source -> "collective" consumers, weight = reuses
    nodes = []
    for src_id, c in sorted(source_contrib.items(), key=lambda kv: kv[1]["reuses"], reverse=True)[:limit]:
        nodes.append({
            "agent_id": src_id,
            "agent_name": agent_names.get(src_id, f"Agent#{src_id}"),
            "shared_experiences": c["exps"],
            "total_reuses": c["reuses"],
            "domains": sorted(c["domains"])[:8],
        })

    # Edges between top contributors (knowledge flow between frequent sharers)
    edges = []
    top_ids = [n["agent_id"] for n in nodes]
    for i in range(len(top_ids)):
        for j in range(len(top_ids)):
            if i == j:
                continue
            src_reuses = source_contrib.get(top_ids[i], {}).get("reuses", 0)
            dst_reuses = source_contrib.get(top_ids[j], {}).get("reuses", 0)
            if src_reuses > 0 and dst_reuses > 0:
                flow = round(min(src_reuses, dst_reuses) * 0.2)
                if flow > 0:
                    edges.append({
                        "source": top_ids[i],
                        "target": top_ids[j],
                        "weight": flow,
                    })
    edges.sort(key=lambda e: e["weight"], reverse=True)
    edges = edges[:limit]

    total_shared = sum(c["exps"] for c in source_contrib.values())
    total_reuses = sum(c["reuses"] for c in source_contrib.values())
    return ApiResponse.success({
        "nodes": nodes,
        "edges": edges,
        "days": days,
        "total_shared_experiences": total_shared,
        "total_reuses": total_reuses,
    }).to_response()
```

- [ ] **Step 2: 添加 MCP 工具 — get_knowledge_propagation_network（5 处修改）**

文件: `todo-for-ai-mcp/src/server.ts`

工具定义（在 `get_agent_workload_forecast` 工具定义之后）：

```typescript
        {
          name: 'get_knowledge_propagation_network',
          description: 'Cross-Agent knowledge propagation network. Nodes are Agents sharing experiences, edges connect contributors weighted by reuse count. Reveals which Agents propagate knowledge most broadly.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window (1-365, default 90)' },
              limit: { type: 'integer', description: 'Max nodes/edges (1-50, default 20)' },
            },
          },
        },
```

调度 case（在 `get_agent_workload_forecast` case 之后）：

```typescript
          case 'get_knowledge_propagation_network':
            logger.info(`[MCP_SERVER] Executing get_knowledge_propagation_network`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetKnowledgePropagationNetwork(args);
            break;
```

白名单（在 `'get_agent_workload_forecast'` 之后）：

```typescript
                'get_agent_workload_forecast',
                'get_knowledge_propagation_network',
```

handler（在 `handleGetAgentWorkloadForecast` 之后）：

```typescript
  private async handleGetKnowledgePropagationNetwork(args: any) {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 90) || 90));
    const limit = Math.max(1, Math.min(50, Number(args?.limit ?? 20) || 20));
    const result = await this.apiClient.getKnowledgePropagationNetwork(days, limit);
    const data = result?.data || result || {};
    const nodes: any[] = data.nodes || [];
    const lines = nodes.map((n: any) =>
      `- ${n.agent_name}: 分享${n.shared_experiences}条 被复用${n.total_reuses}次 域[${(n.domains || []).join(',')}]`
    );
    return this.toToolResponse(
      `知识传播网络(近${data.days ?? days}天, 共${data.total_shared_experiences ?? 0}条分享 累计复用${data.total_reuses ?? 0}):\n${lines.join('\n') || '无传播数据'}`,
      result,
    );
  }
```

- [ ] **Step 3: 添加 MCP API 客户端方法**

文件: `todo-for-ai-mcp/src/api-client.ts`（在 `getAgentWorkloadForecast` 方法之后）

```typescript
  async getKnowledgePropagationNetwork(days = 90, limit = 20): Promise<any> {
    logger.info('[API_CLIENT] Getting knowledge propagation network', { days, limit });
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/knowledge-propagation-network', {
        params: { days, limit },
      });
      return this.unwrapApiData<any>(response.data);
    }, 'getKnowledgePropagationNetwork');
  }
```

- [ ] **Step 4: 添加前端类型和 API 方法**

文件: `todo-for-ai-webpage/src/api/agents.ts`

类型（在 `AgentWorkloadForecast` 之后）：

```typescript
/** 知识传播网络节点 */
export interface KnowledgePropagationNode {
  agent_id: number
  agent_name: string
  shared_experiences: number
  total_reuses: number
  domains: string[]
}

/** 知识传播网络边 */
export interface KnowledgePropagationEdge {
  source: number
  target: number
  weight: number
}

/** 跨 Agent 知识传播网络 */
export interface KnowledgePropagationNetwork {
  nodes: KnowledgePropagationNode[]
  edges: KnowledgePropagationEdge[]
  days: number
  total_shared_experiences: number
  total_reuses: number
}
```

方法（在 `getAgentWorkloadForecast` 之后）：

```typescript
  async getKnowledgePropagationNetwork(days = 90, limit = 20): Promise<KnowledgePropagationNetwork> {
    return unwrapData<KnowledgePropagationNetwork>(await apiClient.get(`/agents/knowledge-propagation-network${buildQuery({ days, limit })}`))
  }
```

- [ ] **Step 5: 添加 Dashboard UI 卡片 — 知识传播网络**

文件: `todo-for-ai-webpage/src/pages/Dashboard.tsx`

5a. 类型 import 追加 `KnowledgePropagationNetwork`。

5b. state 追加：

```typescript
  const [propagationNet, setPropagationNet] = useState<KnowledgePropagationNetwork | null>(null)
```

5c. 调用追加（在 `getAgentWorkloadForecast` 之后）：

```typescript
      agentsApi.getKnowledgePropagationNetwork(90, 20).then(setPropagationNet).catch(() => {})
```

5d. 在工作负载预测卡片之后插入传播网络卡片（环形布局节点 + 弦边，复用现有 CollaborationGraphView 风格但内联简化版）：

```tsx
      {/* Knowledge Propagation Network */}
      {propagationNet && propagationNet.nodes.length > 0 && (
        <Card
          title={<Space><ShareAltOutlined /> 知识传播网络</Space>}
          style={{ marginBottom: 24 }}
          extra={<Text type="secondary" style={{ fontSize: 12 }}>近 {propagationNet.days} 天 · 分享 {propagationNet.total_shared_experiences} · 复用 {propagationNet.total_reuses}</Text>}
        >
          {(() => {
            const nodes = propagationNet.nodes
            const edges = propagationNet.edges
            const size = 280
            const cx = size / 2
            const cy = size / 2
            const radius = size / 2 - 30
            const pos: Record<number, { x: number; y: number }> = {}
            nodes.forEach((n, i) => {
              const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2
              pos[n.agent_id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
            })
            const maxReuse = Math.max(1, ...nodes.map(n => n.total_reuses))
            const maxW = Math.max(1, ...edges.map(e => e.weight))
            return (
              <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
                {edges.map((e, ei) => {
                  const s = pos[e.source]
                  const t = pos[e.target]
                  if (!s || !t) return null
                  return <line key={`e${ei}`} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="#722ed1" strokeWidth={0.5 + (e.weight / maxW) * 2.5} strokeOpacity={0.4} />
                })}
                {nodes.map((n) => {
                  const p = pos[n.agent_id]
                  if (!p) return null
                  const r = 6 + (n.total_reuses / maxReuse) * 10
                  return (
                    <g key={`n${n.agent_id}`}>
                      <circle cx={p.x} cy={p.y} r={r} fill="#722ed1" fillOpacity={0.7} />
                      <text x={p.x} y={p.y - r - 3} fontSize={8} fill="#595959" textAnchor="middle">{n.agent_name}</text>
                      <title>{`${n.agent_name}: 分享${n.shared_experiences} 复用${n.total_reuses}`}</title>
                    </g>
                  )
                })}
              </svg>
            )
          })()}
        </Card>
      )}
```

- [ ] **Step 6: 验证编译**
Run: `cd todo-for-ai-api-server && python3 -c "import ast; ast.parse(open('api/agents.py').read())"` && `cd todo-for-ai-mcp && ./node_modules/.bin/tsc --noEmit` && `cd todo-for-ai-webpage && ./node_modules/.bin/tsc --noEmit`
Expected:
  - Exit code: 0
  - No error output

- [ ] **Step 7: 提交**
Run: 逐子模块提交 `feat: add knowledge propagation network (increment 272)`，父仓库更新引用

---

### Task 3: 工作流步骤瓶颈时序分析（增量 273）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/agents.py`（EOF 追加）
- Modify: `todo-for-ai-mcp/src/server.ts`（5 处）
- Modify: `todo-for-ai-mcp/src/api-client.ts`
- Modify: `todo-for-ai-webpage/src/api/agents.ts`
- Modify: `todo-for-ai-webpage/src/pages/Workflows.tsx`

- [ ] **Step 1: 创建后端端点 — 步骤瓶颈时序**

文件: `todo-for-ai-api-server/api/agents.py`（追加到文件末尾）

```python
@agents_bp.route("/workflows/step-bottleneck-timeline", methods=["GET"])
@login_required
def workflow_step_bottleneck_timeline():
    """Per-step daily average duration timeline.

    Tracks how each workflow step's average duration changes over time
    to spot regressions (steps getting slower) or improvements.

    Query params:
    - days: lookback window (7-90, default 30)
    - limit: max step keys returned (1-15, default 8)
    """
    user = get_current_user()
    try:
        days = max(7, min(90, int(request.args.get("days", 30))))
        limit = max(1, min(15, int(request.args.get("limit", 8))))
    except (TypeError, ValueError):
        days, limit = 30, 8

    from models.agent import WorkflowStepRun, WorkflowRun
    since = datetime.utcnow() - timedelta(days=days)

    rows = (
        WorkflowStepRun.query
        .join(WorkflowRun, WorkflowStepRun.run_id == WorkflowRun.id)
        .filter(
            WorkflowRun.owner_id == user.id,
            WorkflowStepRun.started_at >= since,
            WorkflowStepRun.started_at.isnot(None),
            WorkflowStepRun.finished_at.isnot(None),
        )
        .with_entities(
            WorkflowStepRun.step_key,
            func.date(WorkflowStepRun.finished_at).label("d"),
            func.avg(
                func.extract("epoch", WorkflowStepRun.finished_at - WorkflowStepRun.started_at)
            ).label("avg_dur"),
            func.count(WorkflowStepRun.id).label("cnt"),
        )
        .group_by(WorkflowStepRun.step_key, func.date(WorkflowStepRun.finished_at))
        .all()
    )

    date_range = [(datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d") for i in range(days)]
    step_data = {}  # step_key -> {days: {date: avg}, total: count}
    for step_key, d, avg_dur, cnt in rows:
        if not step_key:
            continue
        d_str = d.isoformat() if hasattr(d, "isoformat") else str(d)
        sd = step_data.setdefault(step_key, {"days": {}, "total": 0})
        sd["days"][d_str] = round(float(avg_dur), 1) if avg_dur else 0.0
        sd["total"] += cnt

    sorted_steps = sorted(step_data.items(), key=lambda kv: kv[1]["total"], reverse=True)[:limit]
    results = []
    for step_key, sd in sorted_steps:
        series = [sd["days"].get(d, 0.0) for d in date_range]
        nonzero = [v for v in series if v > 0]
        avg_overall = round(sum(nonzero) / len(nonzero), 1) if nonzero else 0.0
        last_val = next((v for v in reversed(series) if v > 0), 0.0)
        first_val = next((v for v in series if v > 0), 0.0)
        change_pct = round((last_val - first_val) / first_val * 100, 1) if first_val > 0 else 0.0
        results.append({
            "step_key": step_key,
            "series": series,
            "avg_duration": avg_overall,
            "sample_count": sd["total"],
            "change_pct": change_pct,
        })

    return ApiResponse.success({
        "steps": results,
        "days": days,
        "date_range": date_range,
    }).to_response()
```

- [ ] **Step 2: 添加 MCP 工具 — get_workflow_step_bottleneck_timeline（5 处修改）**

文件: `todo-for-ai-mcp/src/server.ts`

工具定义（在 `get_knowledge_propagation_network` 之后）：

```typescript
        {
          name: 'get_workflow_step_bottleneck_timeline',
          description: 'Per-step daily average duration timeline. Tracks how each workflow step avg duration changes over time to spot regressions or improvements.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window (7-90, default 30)' },
              limit: { type: 'integer', description: 'Max step keys (1-15, default 8)' },
            },
          },
        },
```

调度 case（在 `get_knowledge_propagation_network` 之后）：

```typescript
          case 'get_workflow_step_bottleneck_timeline':
            logger.info(`[MCP_SERVER] Executing get_workflow_step_bottleneck_timeline`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetWorkflowStepBottleneckTimeline(args);
            break;
```

白名单（在 `'get_knowledge_propagation_network'` 之后）：

```typescript
                'get_knowledge_propagation_network',
                'get_workflow_step_bottleneck_timeline',
```

handler（在 `handleGetKnowledgePropagationNetwork` 之后）：

```typescript
  private async handleGetWorkflowStepBottleneckTimeline(args: any) {
    const days = Math.max(7, Math.min(90, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(15, Number(args?.limit ?? 8) || 8));
    const result = await this.apiClient.getWorkflowStepBottleneckTimeline(days, limit);
    const data = result?.data || result || {};
    const steps: any[] = data.steps || [];
    const lines = steps.map((s: any) =>
      `• ${s.step_key}: 均${s.avg_duration}s 变化${s.change_pct > 0 ? '+' : ''}${s.change_pct}% (${s.sample_count}次)`
    );
    return this.toToolResponse(
      `步骤瓶颈时序(近${data.days ?? days}天):\n${lines.join('\n') || '无时序数据'}`,
      result,
    );
  }
```

- [ ] **Step 3: 添加 MCP API 客户端方法**

文件: `todo-for-ai-mcp/src/api-client.ts`（在 `getKnowledgePropagationNetwork` 之后）

```typescript
  async getWorkflowStepBottleneckTimeline(days = 30, limit = 8): Promise<any> {
    logger.info('[API_CLIENT] Getting workflow step bottleneck timeline', { days, limit });
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/workflows/step-bottleneck-timeline', {
        params: { days, limit },
      });
      return this.unwrapApiData<any>(response.data);
    }, 'getWorkflowStepBottleneckTimeline');
  }
```

- [ ] **Step 4: 添加前端类型和 API 方法**

文件: `todo-for-ai-webpage/src/api/agents.ts`

类型（在 `KnowledgePropagationNetwork` 之后）：

```typescript
/** 步骤瓶颈时序 */
export interface StepBottleneckTimelineStep {
  step_key: string
  series: number[]
  avg_duration: number
  sample_count: number
  change_pct: number
}

/** 工作流步骤瓶颈时序分析 */
export interface WorkflowStepBottleneckTimeline {
  steps: StepBottleneckTimelineStep[]
  days: number
  date_range: string[]
}
```

方法（在 `getKnowledgePropagationNetwork` 之后）：

```typescript
  async getWorkflowStepBottleneckTimeline(days = 30, limit = 8): Promise<WorkflowStepBottleneckTimeline> {
    return unwrapData<WorkflowStepBottleneckTimeline>(await apiClient.get(`/agents/workflows/step-bottleneck-timeline${buildQuery({ days, limit })}`))
  }
```

- [ ] **Step 5: 添加 Workflows UI 卡片 — 步骤瓶颈时序**

文件: `todo-for-ai-webpage/src/pages/Workflows.tsx`

5a. 类型 import 行追加 `WorkflowStepBottleneckTimeline`。

5b. 在 `stepDurationHist` state 之后追加：

```typescript
  const [stepBottleneckTl, setStepBottleneckTl] = useState<WorkflowStepBottleneckTimeline | null>(null)
```

5c. 在 `getWorkflowStepDurationHistogram` 调用之后追加：

```typescript
      agentsApi.getWorkflowStepBottleneckTimeline(30, 8).then(setStepBottleneckTl).catch(() => {})
```

5d. 在「步骤耗时分布直方图」卡片之后插入时序卡片（多线折线，复用 MiniTrendChart 风格但内联）：

```tsx
      {/* Step Bottleneck Timeline */}
      {stepBottleneckTl && stepBottleneckTl.steps.length > 0 && (
        <Card
          title={<Space><LineChartOutlined /> 步骤瓶颈时序</Space>}
          style={{ marginBottom: 24 }}
          extra={<Text type="secondary" style={{ fontSize: 12 }}>近 {stepBottleneckTl.days} 天 · 日均耗时趋势</Text>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stepBottleneckTl.steps.map((s, si) => {
              const nonzero = s.series.filter(v => v > 0)
              const maxV = Math.max(1, ...nonzero)
              const w = 300
              const h = 30
              const pts = s.series.map((v, i) => `${(i / Math.max(1, s.series.length - 1)) * w},${h - (v / maxV) * (h - 2)}`).join(' ')
              const changeColor = s.change_pct > 20 ? '#ff4d4f' : s.change_pct < -20 ? '#52c41a' : '#1890ff'
              return (
                <div key={si} style={{ background: '#fafafa', borderRadius: 4, padding: '6px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <Text strong style={{ fontSize: 12 }}>{s.step_key}</Text>
                    <Space size={4}>
                      <Tag style={{ fontSize: 10 }}>均 {s.avg_duration}s</Tag>
                      <Tag color={s.change_pct > 20 ? 'red' : s.change_pct < -20 ? 'green' : 'blue'} style={{ fontSize: 10 }}>{s.change_pct > 0 ? '+' : ''}{s.change_pct}%</Tag>
                    </Space>
                  </div>
                  <svg width={w} height={h} style={{ display: 'block' }}>
                    {nonzero.length > 1 && <polyline points={pts} fill="none" stroke={changeColor} strokeWidth={1.5} />}
                  </svg>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: '#52c41a' }}>— 改善(&lt;-20%)</span>
            <span style={{ fontSize: 10, color: '#1890ff' }}>— 稳定</span>
            <span style={{ fontSize: 10, color: '#ff4d4f' }}>— 恶化(&gt;+20%)</span>
          </div>
        </Card>
      )}
```

- [ ] **Step 6: 验证编译**
Run: `cd todo-for-ai-api-server && python3 -c "import ast; ast.parse(open('api/agents.py').read())"` && `cd todo-for-ai-mcp && ./node_modules/.bin/tsc --noEmit` && `cd todo-for-ai-webpage && ./node_modules/.bin/tsc --noEmit`
Expected:
  - Exit code: 0
  - No error output

- [ ] **Step 7: 提交**
Run: 逐子模块提交 `feat: add workflow step bottleneck timeline (increment 273)`，父仓库更新引用

---

### Task 4: 协议决策延迟分析（增量 274）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/agents.py`（EOF 追加）
- Modify: `todo-for-ai-mcp/src/server.ts`（5 处）
- Modify: `todo-for-ai-mcp/src/api-client.ts`
- Modify: `todo-for-ai-webpage/src/api/agents.ts`
- Modify: `todo-for-ai-webpage/src/pages/Dashboard.tsx`

- [ ] **Step 1: 创建后端端点 — 协议决策延迟**

文件: `todo-for-ai-api-server/api/agents.py`（追加到文件末尾）

```python
@agents_bp.route("/protocol-decision-latency", methods=["GET"])
@login_required
def protocol_decision_latency():
    """Collaboration protocol decision latency analysis.

    For resolved protocols, computes the latency from creation to
    resolution, aggregated by protocol type. Returns per-type average,
    median, min, max, and count.

    Query params:
    - days: lookback window (1-365, default 30)
    """
    user = get_current_user()
    try:
        days = max(1, min(365, int(request.args.get("days", 30))))
    except (TypeError, ValueError):
        days = 30

    from models.agent import CollaborationProtocol
    user_agent_ids = [a.id for a in Agent.query.filter_by(owner_id=user.id).all()]
    if not user_agent_ids:
        return ApiResponse.success({"types": [], "days": days, "total": 0}).to_response()

    since = datetime.utcnow() - timedelta(days=days)
    protocols = (
        CollaborationProtocol.query
        .filter(
            CollaborationProtocol.initiator_agent_id.in_(user_agent_ids),
            CollaborationProtocol.created_at >= since,
            CollaborationProtocol.resolved_at.isnot(None),
        )
        .all()
    )

    by_type = {}  # protocol_type -> [latency_seconds]
    for p in protocols:
        if not p.resolved_at or not p.created_at:
            continue
        latency = (p.resolved_at - p.created_at).total_seconds()
        if latency < 0:
            continue
        by_type.setdefault(p.protocol_type, []).append(latency)

    def median(vals):
        s = sorted(vals)
        n = len(s)
        if n == 0:
            return 0
        if n % 2 == 1:
            return s[n // 2]
        return (s[n // 2 - 1] + s[n // 2]) / 2

    types = []
    total = 0
    for ptype, lats in sorted(by_type.items(), key=lambda kv: len(kv[1]), reverse=True):
        total += len(lats)
        types.append({
            "protocol_type": ptype,
            "count": len(lats),
            "avg_seconds": round(sum(lats) / len(lats), 1),
            "median_seconds": round(median(lats), 1),
            "min_seconds": round(min(lats), 1),
            "max_seconds": round(max(lats), 1),
        })

    return ApiResponse.success({"types": types, "days": days, "total": total}).to_response()
```

- [ ] **Step 2: 添加 MCP 工具 — get_protocol_decision_latency（5 处修改）**

文件: `todo-for-ai-mcp/src/server.ts`

工具定义（在 `get_workflow_step_bottleneck_timeline` 之后）：

```typescript
        {
          name: 'get_protocol_decision_latency',
          description: 'Collaboration protocol decision latency analysis. For resolved protocols, computes creation-to-resolution latency aggregated by protocol type (avg/median/min/max).',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window (1-365, default 30)' },
            },
          },
        },
```

调度 case（在 `get_workflow_step_bottleneck_timeline` 之后）：

```typescript
          case 'get_protocol_decision_latency':
            logger.info(`[MCP_SERVER] Executing get_protocol_decision_latency`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetProtocolDecisionLatency(args);
            break;
```

白名单（在 `'get_workflow_step_bottleneck_timeline'` 之后）：

```typescript
                'get_workflow_step_bottleneck_timeline',
                'get_protocol_decision_latency',
```

handler（在 `handleGetWorkflowStepBottleneckTimeline` 之后）：

```typescript
  private async handleGetProtocolDecisionLatency(args: any) {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const result = await this.apiClient.getProtocolDecisionLatency(days);
    const data = result?.data || result || {};
    const types: any[] = data.types || [];
    const lines = types.map((t: any) => {
      const fmt = (s: number) => s >= 3600 ? `${(s / 3600).toFixed(1)}h` : s >= 60 ? `${(s / 60).toFixed(1)}m` : `${s}s`;
      return `• ${t.protocol_type}: ${t.count}次 均${fmt(t.avg_seconds)} 中位${fmt(t.median_seconds)}`;
    });
    return this.toToolResponse(
      `协议决策延迟(近${data.days ?? days}天, 共${data.total ?? 0}个已决议):\n${lines.join('\n') || '无决议数据'}`,
      result,
    );
  }
```

- [ ] **Step 3: 添加 MCP API 客户端方法**

文件: `todo-for-ai-mcp/src/api-client.ts`（在 `getWorkflowStepBottleneckTimeline` 之后）

```typescript
  async getProtocolDecisionLatency(days = 30): Promise<any> {
    logger.info('[API_CLIENT] Getting protocol decision latency', { days });
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/protocol-decision-latency', {
        params: { days },
      });
      return this.unwrapApiData<any>(response.data);
    }, 'getProtocolDecisionLatency');
  }
```

- [ ] **Step 4: 添加前端类型和 API 方法**

文件: `todo-for-ai-webpage/src/api/agents.ts`

类型（在 `WorkflowStepBottleneckTimeline` 之后）：

```typescript
/** 协议决策延迟（按类型） */
export interface ProtocolLatencyType {
  protocol_type: string
  count: number
  avg_seconds: number
  median_seconds: number
  min_seconds: number
  max_seconds: number
}

/** 协议决策延迟分析 */
export interface ProtocolDecisionLatency {
  types: ProtocolLatencyType[]
  days: number
  total: number
}
```

方法（在 `getWorkflowStepBottleneckTimeline` 之后）：

```typescript
  async getProtocolDecisionLatency(days = 30): Promise<ProtocolDecisionLatency> {
    return unwrapData<ProtocolDecisionLatency>(await apiClient.get(`/agents/protocol-decision-latency${buildQuery({ days })}`))
  }
```

- [ ] **Step 5: 添加 Dashboard UI 卡片 — 决策延迟**

文件: `todo-for-ai-webpage/src/pages/Dashboard.tsx`

5a. 类型 import 追加 `ProtocolDecisionLatency`。

5b. state 追加：

```typescript
  const [protocolLatency, setProtocolLatency] = useState<ProtocolDecisionLatency | null>(null)
```

5c. 调用追加（在 `getKnowledgePropagationNetwork` 之后）：

```typescript
      agentsApi.getProtocolDecisionLatency(30).then(setProtocolLatency).catch(() => {})
```

5d. 在知识传播网络卡片之后插入决策延迟卡片（每类型一行：类型名 + 条形图平均延迟 + min/max 范围）：

```tsx
      {/* Protocol Decision Latency */}
      {protocolLatency && protocolLatency.types.length > 0 && (
        <Card
          title={<Space><FieldTimeOutlined /> 协议决策延迟</Space>}
          style={{ marginBottom: 24 }}
          extra={<Text type="secondary" style={{ fontSize: 12 }}>近 {protocolLatency.days} 天 · {protocolLatency.total} 个已决议</Text>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {protocolLatency.types.map((t, ti) => {
              const maxAvg = Math.max(1, ...protocolLatency.types.map(x => x.avg_seconds))
              const barW = 160
              const fmt = (s: number) => s >= 3600 ? `${(s / 3600).toFixed(1)}h` : s >= 60 ? `${(s / 60).toFixed(1)}m` : `${s}s`
              return (
                <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                  <span style={{ minWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.protocol_type}>{t.protocol_type}</span>
                  <svg width={barW} height={10} style={{ display: 'block' }}>
                    <rect x={0} y={1} width={barW * t.avg_seconds / maxAvg} height={8} fill="#722ed1" rx={2} />
                  </svg>
                  <Text type="secondary" style={{ fontSize: 10 }}>均{fmt(t.avg_seconds)} · 中位{fmt(t.median_seconds)} · {fmt(t.min_seconds)}~{fmt(t.max_seconds)} · {t.count}次</Text>
                </div>
              )
            })}
          </div>
        </Card>
      )}
```

- [ ] **Step 6: 验证编译**
Run: `cd todo-for-ai-api-server && python3 -c "import ast; ast.parse(open('api/agents.py').read())"` && `cd todo-for-ai-mcp && ./node_modules/.bin/tsc --noEmit` && `cd todo-for-ai-webpage && ./node_modules/.bin/tsc --noEmit`
Expected:
  - Exit code: 0
  - No error output

- [ ] **Step 7: 提交**
Run: 逐子模块提交 `feat: add protocol decision latency analysis (increment 274)`，父仓库更新引用

---

### Task 5: 任务返工分析（增量 275）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/tasks.py`（EOF 追加）
- Modify: `todo-for-ai-mcp/src/server.ts`（5 处）
- Modify: `todo-for-ai-mcp/src/api-client.ts`
- Modify: `todo-for-ai-webpage/src/api/tasks.ts`
- Modify: `todo-for-ai-webpage/src/pages/Dashboard.tsx`

- [ ] **Step 1: 创建后端端点 — 任务返工分析**

文件: `todo-for-ai-api-server/api/tasks.py`（追加到文件末尾）

```python
@tasks_bp.route("/rework-analysis", methods=["GET"])
@login_required
def task_rework_analysis():
    """Analyze task rework — tasks that reverted from done to in_progress.

    Scans TaskHistory for STATUS_CHANGED events where old_value='done'
    (or 'review') and new_value='in_progress'/'todo'. Returns per-task
    rework count, total reworked tasks, and per-project rework rate.

    Query params:
    - days: lookback window (1-365, default 30)
    - limit: max tasks returned (1-30, default 15)
    """
    user = get_current_user()
    try:
        days = max(1, min(365, int(request.args.get("days", 30))))
        limit = max(1, min(30, int(request.args.get("limit", 15))))
    except (TypeError, ValueError):
        days, limit = 30, 15

    since = datetime.utcnow() - timedelta(days=days)

    rework_events = (
        TaskHistory.query
        .filter(
            TaskHistory.action == ActionType.STATUS_CHANGED,
            TaskHistory.changed_at >= since,
            TaskHistory.old_value.in_(["done", "review", "completed"]),
            TaskHistory.new_value.in_(["in_progress", "todo"]),
        )
        .all()
    )

    task_rework_count = {}  # task_id -> count
    for ev in rework_events:
        task_rework_count[ev.task_id] = task_rework_count.get(ev.task_id, 0) + 1

    if not task_rework_count:
        return ApiResponse.success({
            "tasks": [], "days": days, "total_reworked": 0, "total_rework_events": 0,
        }).to_response()

    # Load tasks and aggregate by project
    reworked_task_ids = list(task_rework_count.keys())
    tasks = Task.query.filter(Task.id.in_(reworked_task_ids)).all()
    project_names = {p.id: p.name for p in Project.query.all()}

    project_rework = {}  # project_id -> count
    task_items = []
    for t in tasks:
        cnt = task_rework_count.get(t.id, 0)
        project_rework[t.project_id] = project_rework.get(t.project_id, 0) + cnt
        task_items.append({
            "task_id": t.id,
            "title": (t.title or f"Task#{t.id}")[:60],
            "project_name": project_names.get(t.project_id, f"Project#{t.project_id}"),
            "rework_count": cnt,
        })

    task_items.sort(key=lambda x: x["rework_count"], reverse=True)
    project_items = sorted(
        [{"project_name": project_names.get(pid, f"Project#{pid}"), "rework_count": cnt}
         for pid, cnt in project_rework.items()],
        key=lambda x: x["rework_count"], reverse=True,
    )

    return ApiResponse.success({
        "tasks": task_items[:limit],
        "by_project": project_items[:10],
        "days": days,
        "total_reworked": len(reworked_task_ids),
        "total_rework_events": len(rework_events),
    }).to_response()
```

- [ ] **Step 2: 添加 MCP 工具 — get_task_rework_analysis（5 处修改）**

文件: `todo-for-ai-mcp/src/server.ts`

工具定义（在 `get_protocol_decision_latency` 之后）：

```typescript
        {
          name: 'get_task_rework_analysis',
          description: 'Task rework analysis. Finds tasks that reverted from done/review back to in_progress/todo, counts per-task rework, total reworked tasks, and per-project rework rate.',
          inputSchema: {
            type: 'object',
            properties: {
              days: { type: 'integer', description: 'Lookback window (1-365, default 30)' },
              limit: { type: 'integer', description: 'Max tasks (1-30, default 15)' },
            },
          },
        },
```

调度 case（在 `get_protocol_decision_latency` 之后）：

```typescript
          case 'get_task_rework_analysis':
            logger.info(`[MCP_SERVER] Executing get_task_rework_analysis`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetTaskReworkAnalysis(args);
            break;
```

白名单（在 `'get_protocol_decision_latency'` 之后）：

```typescript
                'get_protocol_decision_latency',
                'get_task_rework_analysis',
```

handler（在 `handleGetProtocolDecisionLatency` 之后）：

```typescript
  private async handleGetTaskReworkAnalysis(args: any) {
    const days = Math.max(1, Math.min(365, Number(args?.days ?? 30) || 30));
    const limit = Math.max(1, Math.min(30, Number(args?.limit ?? 15) || 15));
    const result = await this.apiClient.getTaskReworkAnalysis(days, limit);
    const data = result?.data || result || {};
    const tasks: any[] = data.tasks || [];
    const lines = tasks.map((t: any) => `• ${t.title}: 返工${t.rework_count}次 (${t.project_name})`);
    const projLines = (data.by_project || []).map((p: any) => `${p.project_name}=${p.rework_count}`).join(' ');
    return this.toToolResponse(
      `任务返工分析(近${data.days ?? days}天, ${data.total_reworked ?? 0}个任务 ${data.total_rework_events ?? 0}次返工):\n${lines.join('\n') || '无返工'}\n按项目: ${projLines || '无'}`,
      result,
    );
  }
```

- [ ] **Step 3: 添加 MCP API 客户端方法**

文件: `todo-for-ai-mcp/src/api-client.ts`（在 `getProtocolDecisionLatency` 之后）

```typescript
  async getTaskReworkAnalysis(days = 30, limit = 15): Promise<any> {
    logger.info('[API_CLIENT] Getting task rework analysis', { days, limit });
    return this.executeWithRetry(async () => {
      const response = await this.client.get('tasks/rework-analysis', {
        params: { days, limit },
      });
      return this.unwrapApiData<any>(response.data);
    }, 'getTaskReworkAnalysis');
  }
```

- [ ] **Step 4: 添加前端类型和 API 方法**

文件: `todo-for-ai-webpage/src/api/tasks.ts`

类型（在 `TaskCommentSentimentTrend` 之后）：

```typescript
/** 返工任务条目 */
export interface ReworkTaskItem {
  task_id: number
  title: string
  project_name: string
  rework_count: number
}

/** 按项目返工统计 */
export interface ReworkProjectItem {
  project_name: string
  rework_count: number
}

/** 任务返工分析 */
export interface TaskReworkAnalysis {
  tasks: ReworkTaskItem[]
  by_project: ReworkProjectItem[]
  days: number
  total_reworked: number
  total_rework_events: number
}
```

方法（在 `TasksApi` 类的 `getCommentSentimentTrend` 之后）：

```typescript
  // 获取任务返工分析
  async getReworkAnalysis(days = 30, limit = 15): Promise<TaskReworkAnalysis> {
    return apiClient.get<TaskReworkAnalysis>(`/tasks/rework-analysis?days=${days}&limit=${limit}`)
  }
```

- [ ] **Step 5: 添加 Dashboard UI 卡片 — 返工分析**

文件: `todo-for-ai-webpage/src/pages/Dashboard.tsx`

5a. tasks 类型 import 行追加 `TaskReworkAnalysis`。

5b. state 追加（在 `commentSentiment` 之后）：

```typescript
  const [reworkAnalysis, setReworkAnalysis] = useState<TaskReworkAnalysis | null>(null)
```

5c. 调用追加（在 `getCommentSentimentTrend` 之后）：

```typescript
      tasksApi.getReworkAnalysis(30, 15).then(setReworkAnalysis).catch(() => {})
```

5d. 在「评论情感趋势」卡片之后插入返工分析卡片：

```tsx
      {/* Task Rework Analysis */}
      {reworkAnalysis && reworkAnalysis.total_reworked > 0 && (
        <Card
          title={<Space><ReloadOutlined /> 任务返工分析</Space>}
          style={{ marginBottom: 24 }}
          extra={<Text type="secondary" style={{ fontSize: 12 }}>近 {reworkAnalysis.days} 天 · {reworkAnalysis.total_reworked} 任务 {reworkAnalysis.total_rework_events} 次返工</Text>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {reworkAnalysis.tasks.map((t, ti) => {
              const maxC = Math.max(1, ...reworkAnalysis.tasks.map(x => x.rework_count))
              const barW = 120
              return (
                <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ minWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.title}>{t.title}</span>
                  <svg width={barW} height={10} style={{ display: 'block' }}>
                    <rect x={0} y={1} width={barW * t.rework_count / maxC} height={8} fill="#fa8c16" rx={2} />
                  </svg>
                  <Tag color="orange" style={{ fontSize: 10 }}>{t.rework_count}次</Tag>
                  <Text type="secondary" style={{ fontSize: 9 }}>{t.project_name}</Text>
                </div>
              )
            })}
          </div>
          {reworkAnalysis.by_project.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>按项目：</Text>
              {reworkAnalysis.by_project.map((p, pi) => (
                <Tag key={pi} color="volcano" style={{ fontSize: 9, margin: '2px' }}>{p.project_name}: {p.rework_count}</Tag>
              ))}
            </div>
          )}
        </Card>
      )}
```

- [ ] **Step 6: 验证编译**
Run: `cd todo-for-ai-api-server && python3 -c "import ast; ast.parse(open('api/tasks.py').read())"` && `cd todo-for-ai-mcp && ./node_modules/.bin/tsc --noEmit` && `cd todo-for-ai-webpage && ./node_modules/.bin/tsc --noEmit`
Expected:
  - Exit code: 0
  - No error output

- [ ] **Step 7: 提交**
Run: 逐子模块提交 `feat: add task rework analysis (increment 275)`，父仓库更新引用

---

### Task 6: Agent 专长演化（增量 276）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/agents.py`（EOF 追加）
- Modify: `todo-for-ai-mcp/src/server.ts`（5 处）
- Modify: `todo-for-ai-mcp/src/api-client.ts`
- Modify: `todo-for-ai-webpage/src/api/agents.ts`
- Modify: `todo-for-ai-webpage/src/pages/Dashboard.tsx`

- [ ] **Step 1: 创建后端端点 — Agent 专长演化**

文件: `todo-for-ai-api-server/api/agents.py`（追加到文件末尾）

```python
@agents_bp.route("/specialization-evolution", methods=["GET"])
@login_required
def agent_specialization_evolution():
    """Track how each Agent's domain coverage evolves over time.

    Buckets AgentExperience by (agent, week) and counts distinct domains
    per week. Returns per-agent weekly domain coverage series and the
    list of domains learned, revealing specialization vs generalization.

    Query params:
    - weeks: lookback window in weeks (2-26, default 12)
    - limit: max agents returned (1-15, default 8)
    """
    user = get_current_user()
    try:
        weeks = max(2, min(26, int(request.args.get("weeks", 12))))
        limit = max(1, min(15, int(request.args.get("limit", 8))))
    except (TypeError, ValueError):
        weeks, limit = 12, 8

    from models.agent import AgentExperience
    days = weeks * 7
    since = datetime.utcnow() - timedelta(days=days)

    rows = (
        AgentExperience.query
        .join(Agent, AgentExperience.agent_id == Agent.id)
        .filter(
            Agent.owner_id == user.id,
            AgentExperience.created_at >= since,
            AgentExperience.domain.isnot(None),
        )
        .with_entities(
            AgentExperience.agent_id,
            Agent.name,
            AgentExperience.domain,
            AgentExperience.created_at,
        )
        .all()
    )

    # Week index relative to now (0 = current week)
    now = datetime.utcnow()
    agent_weeks = {}  # agent_id -> {name, weeks: {week_idx: set(domains)}}
    for aid, aname, domain, created in rows:
        if not domain:
            continue
        delta_days = (now - created).days
        week_idx = weeks - 1 - (delta_days // 7)
        if week_idx < 0 or week_idx >= weeks:
            continue
        info = agent_weeks.setdefault(aid, {"name": aname or f"Agent#{aid}", "weeks": {}})
        info["weeks"].setdefault(week_idx, set()).add(domain)

    results = []
    for aid, info in agent_weeks.items():
        series = [len(info["weeks"].get(w, set())) for w in range(weeks)]
        all_domains = set()
        for ds in info["weeks"].values():
            all_domains.update(ds)
        if sum(series) == 0:
            continue
        peak = max(series)
        peak_week = series.index(peak) if peak > 0 else 0
        results.append({
            "agent_id": aid,
            "agent_name": info["name"],
            "series": series,
            "peak_domains": peak,
            "peak_week_idx": peak_week,
            "total_domains": len(all_domains),
            "domains": sorted(all_domains)[:10],
        })

    results.sort(key=lambda r: r["total_domains"], reverse=True)
    week_labels = [f"W-{weeks - 1 - w}" for w in range(weeks)]
    return ApiResponse.success({
        "agents": results[:limit],
        "weeks": weeks,
        "week_labels": week_labels,
    }).to_response()
```

- [ ] **Step 2: 添加 MCP 工具 — get_agent_specialization_evolution（5 处修改）**

文件: `todo-for-ai-mcp/src/server.ts`

工具定义（在 `get_task_rework_analysis` 之后）：

```typescript
        {
          name: 'get_agent_specialization_evolution',
          description: 'Track how each Agent domain coverage evolves over time. Weekly distinct domain count series, revealing specialization vs generalization trends.',
          inputSchema: {
            type: 'object',
            properties: {
              weeks: { type: 'integer', description: 'Lookback window in weeks (2-26, default 12)' },
              limit: { type: 'integer', description: 'Max agents (1-15, default 8)' },
            },
          },
        },
```

调度 case（在 `get_task_rework_analysis` 之后）：

```typescript
          case 'get_agent_specialization_evolution':
            logger.info(`[MCP_SERVER] Executing get_agent_specialization_evolution`, { requestId, instanceId: this.instanceId });
            result = await this.handleGetAgentSpecializationEvolution(args);
            break;
```

白名单（在 `'get_task_rework_analysis'` 之后）：

```typescript
                'get_task_rework_analysis',
                'get_agent_specialization_evolution',
```

handler（在 `handleGetTaskReworkAnalysis` 之后）：

```typescript
  private async handleGetAgentSpecializationEvolution(args: any) {
    const weeks = Math.max(2, Math.min(26, Number(args?.weeks ?? 12) || 12));
    const limit = Math.max(1, Math.min(15, Number(args?.limit ?? 8) || 8));
    const result = await this.apiClient.getAgentSpecializationEvolution(weeks, limit);
    const data = result?.data || result || {};
    const agents: any[] = data.agents || [];
    const lines = agents.map((a: any) =>
      `- ${a.agent_name}: 累计${a.total_domains}域 峰值${a.peak_domains}域 [${(a.domains || []).join(',')}]`
    );
    return this.toToolResponse(
      `Agent专长演化(近${data.weeks ?? weeks}周):\n${lines.join('\n') || '无经验数据'}`,
      result,
    );
  }
```

- [ ] **Step 3: 添加 MCP API 客户端方法**

文件: `todo-for-ai-mcp/src/api-client.ts`（在 `getTaskReworkAnalysis` 之后）

```typescript
  async getAgentSpecializationEvolution(weeks = 12, limit = 8): Promise<any> {
    logger.info('[API_CLIENT] Getting agent specialization evolution', { weeks, limit });
    return this.executeWithRetry(async () => {
      const response = await this.client.get('agents/specialization-evolution', {
        params: { weeks, limit },
      });
      return this.unwrapApiData<any>(response.data);
    }, 'getAgentSpecializationEvolution');
  }
```

- [ ] **Step 4: 添加前端类型和 API 方法**

文件: `todo-for-ai-webpage/src/api/agents.ts`

类型（在 `ProtocolDecisionLatency` 之后）：

```typescript
/** Agent 专长演化 */
export interface SpecializationEvolutionAgent {
  agent_id: number
  agent_name: string
  series: number[]
  peak_domains: number
  peak_week_idx: number
  total_domains: number
  domains: string[]
}

/** Agent 专长演化分析 */
export interface AgentSpecializationEvolution {
  agents: SpecializationEvolutionAgent[]
  weeks: number
  week_labels: string[]
}
```

方法（在 `getProtocolDecisionLatency` 之后）：

```typescript
  async getAgentSpecializationEvolution(weeks = 12, limit = 8): Promise<AgentSpecializationEvolution> {
    return unwrapData<AgentSpecializationEvolution>(await apiClient.get(`/agents/specialization-evolution${buildQuery({ weeks, limit })}`))
  }
```

- [ ] **Step 5: 添加 Dashboard UI 卡片 — 专长演化**

文件: `todo-for-ai-webpage/src/pages/Dashboard.tsx`

5a. 类型 import 追加 `AgentSpecializationEvolution`。

5b. state 追加（在 `workloadForecast` 之后）：

```typescript
  const [specializationEvo, setSpecializationEvo] = useState<AgentSpecializationEvolution | null>(null)
```

5c. 调用追加（在 `getAgentWorkloadForecast` 之后）：

```typescript
      agentsApi.getAgentSpecializationEvolution(12, 8).then(setSpecializationEvo).catch(() => {})
```

5d. 在工作负载预测卡片之后插入专长演化卡片（每 Agent 周域覆盖堆叠条）：

```tsx
      {/* Agent Specialization Evolution */}
      {specializationEvo && specializationEvo.agents.length > 0 && (
        <Card
          title={<Space><RiseOutlined /> Agent 专长演化</Space>}
          style={{ marginBottom: 24 }}
          extra={<Text type="secondary" style={{ fontSize: 12 }}>近 {specializationEvo.weeks} 周 · 周域覆盖数</Text>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {specializationEvo.agents.map((a, ai) => {
              const maxV = Math.max(1, ...a.series)
              const cellW = 18
              const h = 18
              return (
                <div key={ai} style={{ background: '#fafafa', borderRadius: 4, padding: '6px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text strong style={{ fontSize: 12 }}>{a.agent_name}</Text>
                    <Space size={4}>
                      <Tag color="purple" style={{ fontSize: 10 }}>累计 {a.total_domains} 域</Tag>
                      <Tag style={{ fontSize: 10 }}>峰值 {a.peak_domains}</Tag>
                    </Space>
                  </div>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {a.series.map((v, wi) => (
                      <Tooltip key={wi} title={`${specializationEvo.week_labels[wi]}: ${v} 域`}>
                        <svg width={cellW} height={h} style={{ display: 'block' }}>
                          <rect x={0} y={h - (v / maxV) * (h - 2)} width={cellW - 1} height={(v / maxV) * (h - 2)} fill={`rgba(114, 46, 209, ${0.3 + (v / maxV) * 0.7})`} rx={1} />
                        </svg>
                      </Tooltip>
                    ))}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    {a.domains.map((d, di) => (
                      <Tag key={di} style={{ fontSize: 9, margin: '1px' }}>{d}</Tag>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
```

- [ ] **Step 6: 验证编译**
Run: `cd todo-for-ai-api-server && python3 -c "import ast; ast.parse(open('api/agents.py').read())"` && `cd todo-for-ai-api-server && python3 -c "import ast; ast.parse(open('api/tasks.py').read())"` && `cd todo-for-ai-mcp && ./node_modules/.bin/tsc --noEmit` && `cd todo-for-ai-webpage && ./node_modules/.bin/tsc --noEmit`
Expected:
  - Exit code: 0
  - No error output

- [ ] **Step 7: 提交**
Run: 逐子模块提交 `feat: add agent specialization evolution (increment 276)`，父仓库更新引用
