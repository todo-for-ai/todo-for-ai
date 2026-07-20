# Agent 任务协作平台核心能力增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 继续完善 Agent 任务协作平台，新增 6 个分析/协作维度：任务依赖链分析、Agent 技能匹配推荐、工作流步骤耗时分布直方图、任务评论情感趋势、Agent 间任务交接统计、协作频道活跃度趋势。

**Architecture:** 每个增量遵循固定模式：后端 Flask 端点（SQLAlchemy 聚合查询）→ MCP 工具 5 处修改（定义+调度+处理+API客户端+白名单）→ 前端类型+API方法 → 前端 UI 卡片（纯 SVG 可视化）→ 编译验证 → 提交。数据流：用户请求 → API 端点查询聚合 → MCP 工具透传 → 前端类型化调用 → SVG 渲染。

**Tech Stack:** Python 3/Flask/SQLAlchemy (后端), TypeScript/Node.js (MCP), React 18/Antd 5/Vite (前端), 纯 SVG 可视化

**Risks:**
- Dashboard.tsx 已 4500+ 行，新增卡片需条件渲染避免性能问题 → 缓解：所有新卡片用 `{data && data.length > 0 && (<Card>...)}` 惰性渲染
- agents.py 已 15000+ 行 → 缓解：新端点追加到文件末尾，不修改现有代码
- tasks.py 较小（19 端点），新增端点追加安全 → 缓解：追加到文件末尾

---

### Task 1: 任务依赖链分析（增量 265）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/tasks.py` — 新增 GET /tasks/dependency-chain
- Modify: `todo-for-ai-mcp/src/server.ts` — 5 处修改
- Modify: `todo-for-ai-mcp/src/api-client.ts` — 新增方法
- Modify: `todo-for-ai-webpage/src/api/tasks.ts` — 类型+方法
- Modify: `todo-for-ai-webpage/src/pages/Dashboard.tsx` — 新卡片

- [ ] **Step 1: 创建后端端点 — 任务依赖链分析**

文件: `todo-for-ai-api-server/api/tasks.py`（追加到文件末尾）

```python
@tasks_bp.route("/dependency-chain", methods=["GET"])
@login_required
def task_dependency_chain():
    """Analyze task dependency chains for the current user.

    Finds tasks with subtask relationships and builds dependency chains.
    Returns per-chain: root task, depth, total tasks, critical path length,
    and completion progress.

    Query params:
    - project_id: optional project filter
    - limit: max chains returned (1-20, default 10)
    """
    user = get_current_user()
    try:
        limit = max(1, min(20, int(request.args.get("limit", 10))))
    except (TypeError, ValueError):
        limit = 10
    project_id = request.args.get("project_id", type=int)

    from models.agent import Task, Project
    q = Task.query.filter(Task.owner_id == user.id, Task.parent_id == None)
    if project_id:
        q = q.filter(Task.project_id == project_id)

    root_tasks = q.order_by(Task.created_at.desc()).limit(limit * 3).all()

    chains = []
    for root in root_tasks:
        # BFS to find all descendants
        visited = set()
        queue = [root.id]
        all_ids = [root.id]
        max_depth = 0
        depth_map = {root.id: 0}
        while queue:
            tid = queue.pop(0)
            if tid in visited:
                continue
            visited.add(tid)
            children = Task.query.filter_by(parent_id=tid).all()
            for child in children:
                if child.id not in visited:
                    all_ids.append(child.id)
                    depth_map[child.id] = depth_map[tid] + 1
                    max_depth = max(max_depth, depth_map[child.id])
                    queue.append(child.id)

        if len(all_ids) < 2:
            continue

        # Count completed
        all_tasks = Task.query.filter(Task.id.in_(all_ids)).all()
        completed = sum(1 for t in all_tasks if t.status and t.status.value == "done")
        in_progress = sum(1 for t in all_tasks if t.status and t.status.value == "in_progress")

        chains.append({
            "root_id": root.id,
            "root_title": root.title or f"Task#{root.id}",
            "depth": max_depth,
            "total_tasks": len(all_ids),
            "completed": completed,
            "in_progress": in_progress,
            "progress_pct": round(completed / len(all_ids) * 100, 1) if all_ids else 0.0,
        })

    chains.sort(key=lambda c: c["total_tasks"], reverse=True)
    return ApiResponse.success({"chains": chains[:limit]}).to_response()
```

- [ ] **Step 2: 添加 MCP 工具 — get_task_dependency_chain**

在 `todo-for-ai-mcp/src/server.ts` 添加 5 处修改：
1. 工具定义：name='get_task_dependency_chain', description='Task dependency chain analysis. Finds root tasks with subtask hierarchies, computes chain depth, total tasks, completion progress.'
2. 调度 case：case 'get_task_dependency_chain' → handleGetTaskDependencyChain
3. 处理函数：handleGetTaskDependencyChain — 调用 apiClient.getTaskDependencyChain
4. API 客户端方法：getTaskDependencyChain(limit, projectId?) → GET tasks/dependency-chain
5. 白名单：'get_task_dependency_chain'

- [ ] **Step 3: 添加前端类型和 API 方法**

在 `todo-for-ai-webpage/src/api/tasks.ts` 添加：

```typescript
export interface TaskDependencyChain {
  root_id: number
  root_title: string
  depth: number
  total_tasks: number
  completed: number
  in_progress: number
  progress_pct: number
}

export interface TaskDependencyChainAnalysis {
  chains: TaskDependencyChain[]
}

// API 方法
async getDependencyChain(limit = 10, projectId?: number): Promise<TaskDependencyChainAnalysis> {
  return unwrapData<TaskDependencyChainAnalysis>(await apiClient.get(`/tasks/dependency-chain${buildQuery({ limit, project_id: projectId })}`))
}
```

- [ ] **Step 4: 添加 Dashboard UI 卡片**

在 Dashboard.tsx 任务完成预测卡片后插入依赖链卡片：
- 导入 TaskDependencyChainAnalysis 类型
- 添加 useState + API 调用
- SVG 可视化：每条链一行，根任务名+深度标签+进度条+完成/总数
- 图标：ApartmentOutlined

- [ ] **Step 5: 验证编译**
Run: `cd todo-for-ai-api-server && python3 -c "import ast; ast.parse(open('api/tasks.py').read())"` && `cd todo-for-ai-mcp && ./node_modules/.bin/tsc --noEmit` && `cd todo-for-ai-webpage && ./node_modules/.bin/tsc --noEmit`
Expected:
  - Exit code: 0
  - No error output

- [ ] **Step 6: 提交**
Run: 逐子模块 git add -A && git commit，然后更新父仓库引用

---

### Task 2: Agent 技能匹配推荐（增量 266）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/agents.py` — 新增 GET /agents/skill-matching
- Modify: `todo-for-ai-mcp/src/server.ts` — 5 处修改
- Modify: `todo-for-ai-mcp/src/api-client.ts` — 新增方法
- Modify: `todo-for-ai-webpage/src/api/agents.ts` — 类型+方法
- Modify: `todo-for-ai-webpage/src/pages/Dashboard.tsx` — 新卡片

- [ ] **Step 1: 创建后端端点 — Agent 技能匹配推荐**

文件: `todo-for-ai-api-server/api/agents.py`（追加到文件末尾）

对每个未分配（无 active assignment）的 in_progress 任务，根据任务标题/描述中的关键词匹配 Agent 的 capabilities 和经验域，推荐最匹配的 Agent 列表。返回：任务 ID、标题、推荐 Agent 列表（agent_id, name, match_score, matched_capabilities）。

- [ ] **Step 2: 添加 MCP 工具 — get_agent_skill_matching**

5 处修改：工具定义、调度 case、处理函数、API 客户端方法、白名单

- [ ] **Step 3: 添加前端类型和 API 方法**

agents.ts 添加 SkillMatchingTask/SkillMatchCandidate/AgentSkillMatching 类型 + getAgentSkillMatching 方法

- [ ] **Step 4: 添加 Dashboard UI 卡片**

Dashboard.tsx 插入技能匹配推荐卡片：每任务一行，任务名+推荐 Agent 标签（match_score%），图标 RadarChartOutlined

- [ ] **Step 5: 验证编译**

- [ ] **Step 6: 提交**

---

### Task 3: 工作流步骤耗时分布直方图（增量 267）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/agents.py` — 新增 GET /agents/workflows/step-duration-histogram
- Modify: `todo-for-ai-mcp/src/server.ts` — 5 处修改
- Modify: `todo-for-ai-mcp/src/api-client.ts` — 新增方法
- Modify: `todo-for-ai-webpage/src/api/agents.ts` — 类型+方法
- Modify: `todo-for-ai-webpage/src/pages/Workflows.tsx` — 新卡片

- [ ] **Step 1: 创建后端端点 — 步骤耗时分布直方图**

对每个 step_key，将已完成步骤的耗时分桶（0-10s, 10-30s, 30-60s, 60-120s, 120-300s, 300s+），返回每桶计数。揭示步骤耗时分布是否正态或长尾。

- [ ] **Step 2: 添加 MCP 工具 — get_workflow_step_duration_histogram**

5 处修改

- [ ] **Step 3: 添加前端类型和 API 方法**

- [ ] **Step 4: 添加 Workflows UI 卡片**

SVG 直方图：每步骤一行，6 个桶用蓝色柱表示，x 轴标签为桶范围

- [ ] **Step 5: 验证编译**

- [ ] **Step 6: 提交**

---

### Task 4: 任务评论情感趋势（增量 268）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/tasks.py` — 新增 GET /tasks/comment-sentiment-trend
- Modify: `todo-for-ai-mcp/src/server.ts` — 5 处修改
- Modify: `todo-for-ai-mcp/src/api-client.ts` — 新增方法
- Modify: `todo-for-ai-webpage/src/api/tasks.ts` — 类型+方法
- Modify: `todo-for-ai-webpage/src/pages/Dashboard.tsx` — 新卡片

- [ ] **Step 1: 创建后端端点 — 评论情感趋势**

按天聚合 TaskEvent（type=comment）数量，简单情感分类：含正面词（完成/成功/好/赞）→ positive，含负面词（失败/问题/bug/错）→ negative，其余 → neutral。返回每日 positive/negative/neutral 计数。

- [ ] **Step 2: 添加 MCP 工具 — get_task_comment_sentiment_trend**

5 处修改

- [ ] **Step 3: 添加前端类型和 API 方法**

- [ ] **Step 4: 添加 Dashboard UI 卡片**

SVG 堆叠面积图：绿=positive/红=negative/灰=neutral，x 轴日期，图标 SmileOutlined

- [ ] **Step 5: 验证编译**

- [ ] **Step 6: 提交**

---

### Task 5: Agent 间任务交接统计（增量 269）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/agents.py` — 新增 GET /agents/task-handoff-stats
- Modify: `todo-for-ai-mcp/src/server.ts` — 5 处修改
- Modify: `todo-for-ai-mcp/src/api-client.ts` — 新增方法
- Modify: `todo-for-ai-webpage/src/api/agents.ts` — 类型+方法
- Modify: `todo-for-ai-webpage/src/pages/Dashboard.tsx** — 新卡片

- [ ] **Step 1: 创建后端端点 — 任务交接统计**

统计 AuditLog 中 action='agent.handoff' 的记录，按 (from_agent, to_agent) 对聚合交接次数、平均交接耗时（handoff_at - assigned_at），识别最频繁交接对。

- [ ] **Step 2: 添加 MCP 工具 — get_agent_task_handoff_stats**

5 处修改

- [ ] **Step 3: 添加前端类型和 API 方法**

- [ ] **Step 4: 添加 Dashboard UI 卡片**

交接对列表：from→to 箭头+次数条+平均耗时，图标 SwapOutlined

- [ ] **Step 5: 验证编译**

- [ ] **Step 6: 提交**

---

### Task 6: 协作频道活跃度趋势（增量 270）

**Depends on:** None
**Files:**
- Modify: `todo-for-ai-api-server/api/agents.py` — 新增 GET /agents/channels/activity-trend
- Modify: `todo-for-ai-mcp/src/server.ts` — 5 处修改
- Modify: `todo-for-ai-mcp/src/api-client.ts` — 新增方法
- Modify: `todo-for-ai-webpage/src/api/agents.ts` — 类型+方法
- Modify: `todo-for-ai-webpage/src/pages/Agents.tsx` — 频道区域增强

- [ ] **Step 1: 创建后端端点 — 频道活跃度趋势**

按频道按天聚合消息数（AgentChannelMessage），返回每频道每日消息数 sparkline + 活跃成员数。

- [ ] **Step 2: 添加 MCP 工具 — get_channel_activity_trend**

5 处修改

- [ ] **Step 3: 添加前端类型和 API 方法**

- [ ] **Step 4: 添加 Agents 页面 UI 增强**

在频道列表区域，每个频道名后追加 SVG sparkline（最近 14 天消息数），图标 TeamOutlined

- [ ] **Step 5: 验证编译**

- [ ] **Step 6: 提交**
