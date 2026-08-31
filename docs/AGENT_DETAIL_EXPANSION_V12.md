# Agent Detail Expansion (v1.2.3)

Last Updated: 2026-03-07

## 1. 产品扩展设计（PM 视角）

### 1.1 目标

1. 将 Agent 详情升级为可运营、可排障、可复盘的控制台。
2. 让 Agent 行为轨迹支持检索、过滤、分页和快速定位。
3. 打通 Agent 与项目、用户、任务三条关系链路。
4. 提供独立的“工作区活动中心”，支持跨 Agent 统一查看轨迹。

### 1.2 用户路径

1. 从 Agent 列表进入详情页，查看单 Agent 轨迹与配置。
2. 在工作区活动中心按 Agent/来源/时间窗口查看全局活动流。
3. 在任务/项目/交互标签中反向定位影响范围与协作对象。

### 1.3 信息架构（IA）

本版本改为“列表页与详情页解耦”：

1. `/agents`：Agent 列表 + 工作区活动中心
2. `/agents/:agentId`：独立 Agent 详情页（不再内嵌在列表页下方）

#### A. Agent 详情页标签

1. Overview
2. Activity
3. Projects
4. Interactions
5. Tasks
6. Runs
7. Keys
8. SOUL Versions
9. Secrets

#### B. 工作区级页面标签

1. Agent List & Detail
2. Activity Center（跨 Agent 活动列表）

### 1.4 列表能力要求

1. Agent 列表支持：搜索、状态筛选、分页、列表/卡片双视图。
2. Activity 列表支持：Agent、source、event_type、全文、时间范围、分页。
3. 所有列表保证空态可显示，筛选参数变化自动回到第 1 页。

## 2. 架构设计（Architect 视角）

### 2.1 读模型策略（兼容阶段）

v1.2.2 继续基于 append-oriented 表做读取投影：

1. `agent_runs`
2. `agent_task_attempts`
3. `agent_task_events`
4. `task_logs`
5. `agent_audit_events`

### 2.2 API 契约

#### A. Agent 详情洞察（单 Agent）

1. `GET /workspaces/{workspace_id}/agents/{agent_id}/insights/activity`
2. `GET /workspaces/{workspace_id}/agents/{agent_id}/insights/projects`
3. `GET /workspaces/{workspace_id}/agents/{agent_id}/insights/interactions`
4. `GET /workspaces/{workspace_id}/agents/{agent_id}/insights/tasks`

#### B. 工作区活动中心（跨 Agent）

1. `GET /workspaces/{workspace_id}/insights/activities`

该接口支持：`agent_id`、`source`、`event_type`、`q`、`from`、`to`、`page/per_page`。

### 2.3 安全边界

1. 所有接口复用 workspace 访问控制。
2. insights 返回结构化行为数据，不返回 secret 明文。
3. Agent 列表 `status` 参数做白名单校验，非法值返回 400。

### 2.4 Append-only 演进路径

当前实现为“原始表追加写 + API 读投影”。  
v1.3 建议演进到统一 `agent_activity_events`（write-once + cursor pagination + 索引查询）。

## 3. 编码实现

### 3.1 后端

1. `todo-for-ai-api-server/api/agent_workspace_insights.py`
   - 新增工作区级活动接口
   - 返回 `agent_id/agent_name/agent_display_name`
2. `todo-for-ai-api-server/api/agent_workspace_agents.py`
   - 列表新增 `status` 过滤与合法性校验
3. `todo-for-ai-api-server/app.py`
   - insights blueprint 注册

### 3.2 前端

1. `todo-for-ai-webpage/src/pages/agents/AgentDetailPage.tsx`
   - 独立详情页路由承载
   - 支持无 workspace_id 时自动解析 Agent 所属工作区
2. `todo-for-ai-webpage/src/pages/agents/AgentsPage.tsx`
   - 页面级 Tabs：`Agent List & Detail` / `Activity Center`
2. `todo-for-ai-webpage/src/pages/agents/components/AgentWorkspaceActivityCenter.tsx`
   - 跨 Agent 活动中心列表 + 过滤 + 分页
3. `todo-for-ai-webpage/src/pages/agents/components/AgentDetailTabs.tsx`
   - 活动来源统计、时间范围过滤、任务项目筛选
4. `todo-for-ai-webpage/src/pages/agents/hooks/useAgentsPage.ts`
   - Agent 列表分页/搜索/状态筛选状态管理
5. API client/types
   - `src/api/agents/insights.ts`
   - `src/api/agents/insightsTypes.ts`
   - `src/api/agents/agents.ts`
6. i18n
   - `src/i18n/resources/zh-CN/pages/agents.json`
   - `src/i18n/resources/en/pages/agents.json`

## 4. 测试与验证

### 4.1 已执行

1. Python compileall 验证后端改动文件可编译。
2. 前端 `npm run build`（`tsc -b + vite build`）通过。
3. 边界断言：
   - 时间解析/来源过滤/activity 匹配函数。
   - Agent 列表 status 合法/非法过滤行为。

### 4.2 重点边界

1. 空数据集返回空列表 + pagination，而非 null。
2. 过滤项组合（Agent/source/event_type/q/time）应可叠加。
3. 切换分页时保留过滤条件。
4. 非法 status 显式返回 400。

## 5. 风险与后续建议

1. 多源聚合仍为应用层聚合后分页，超大数据量下受 `scan_limit` 限制。
2. 建议补 Playwright E2E：
   - Agent 列表过滤分页
   - 详情页标签切换
   - Activity Center 多过滤组合查询
3. 建议规划 v1.3 事件流表与游标分页改造。

