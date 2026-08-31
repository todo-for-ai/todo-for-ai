# A链机密与多链协作扩展设计（面向 Todo-for-AI）

- 状态: Draft v2
- 日期: 2026-03-08
- 目标: 在现有 Agent Secret 与协作拓扑能力基础上，支持多机密、多A链、多A和C组合的可控协作，并保持对 AI Agent 极度友好。

## 1. 现状基线（当前产品已经具备）

当前仓库并非空白，已经有可用的一期能力：

1. Agent 私密配置:
- agent_secrets 支持 secret_type、scope_type、project_id、is_active、usage_count 等字段。
- 支持创建、轮换、撤销、明文查看（管理面）。

2. Agent 间机密共享:
- agent_secret_shares 支持 owner 到 target 的共享关系、过期时间、撤销、审计。
- 已有协作拓扑接口: GET /workspaces/{workspace_id}/agents/{agent_id}/secrets/collaboration，能看到 incoming/outgoing/edges。

3. 任务与运行时框架:
- Agent 运行时通过 POST /agent/tasks/pull 拉任务，并拿到 agent_profile。
- 目前 agent_profile 暴露的是 active_secret_names（名称列表），而不是可执行级别的机密能力描述。

4. 组织与项目多主体:
- Agent 为组织（workspace）级实体，可通过 allowed_project_ids 做项目范围限制。
- 已具备 agent trigger、agent run、task_event_outbox、notification channel 的自动化链路基础。

结论: 现有能力足以做 A链机密协作 2.0 的增量升级，不需要推翻重建。

## 2. 关键缺口（为什么要扩展）

面向你提出的场景（A链机密增多、多个A链、多A和C组合），当前缺口主要有 6 个：

1. 机密仅是值加共享，缺少能力语义。
- 系统知道 secret 名称，不知道它可用于什么动作（读写知识库、调用支付、发消息、提交代码等）。

2. 共享粒度偏粗。
- 当前主要是 owner_agent 到 target_agent。
- 缺少按链路、任务、阶段的临时授权（例如只在某个任务尝试内有效）。

3. 多A链协作无显式拓扑对象。
- 现在有 share topology，但没有业务链拓扑（谁是 Planner、Executor、Critic、Guardian，谁可调用谁）。

4. A 和 A 交互协议未标准化。
- 没有统一请求响应契约、责任归属、失败回退、冲突解算的模型。

5. 机密传播策略过于可见。
- 管理员可 reveal 明文是必要的，但 A 和 A 协作更应优先走能力代理或代签，而不是转交明文。

6. AI 运行时上下文不够自解释。
- 对 Agent 来说，仅有 active_secret_names 不够，缺少可机读的 policy、peer topology、可执行 contract。

## 3. 设计目标（针对 AI 人生任务平台）

1. AI-first:
- Agent 在运行时拿到可机读、可推理、可决策的能力边界，而不是人工约定。

2. 默认安全:
- 默认拒绝跨链机密流转；授权必须显式、可追溯、可过期、可撤销。

3. 多链可组合:
- 同一项目可存在多个 A 链，且链内和链间可协作，不混淆权限边界。

4. 业务可观测:
- 能回答哪个链、哪个Agent、在什么任务上下文，用了什么能力，是否越权。

5. 增量落地:
- 先兼容现有 API 与前端，不阻断当前功能。

## 4. 核心概念升级

### 4.1 把 A链 实体化

新增实体 agent_chains（链定义）与 agent_chain_nodes（链节点）：

- agent_chains
  - id, workspace_id, project_id, name, purpose, status
  - trust_level: strict, balanced, open
  - created_by_user_id

- agent_chain_nodes
  - chain_id, agent_id, role_in_chain
  - role_in_chain: planner, executor, critic, tool_proxy, guardian
  - can_issue_secret_grant (bool)
  - max_parallel_handoffs

收益: 让多个A链或一个项目多个A和C成为一等数据结构，而不是隐式约定。

### 4.2 机密从值升级到能力包

新增 agent_secret_capabilities（或在 secret 上加 JSON policy）：

- secret_id
- capability_key（例如 llm.openai.invoke, notion.page.write, wechat.bot.send）
- allowed_actions（invoke, read_meta, sign, proxy_call）
- constraints:
  - allowed_projects
  - allowed_task_types
  - rate_limit_per_min
  - daily_budget
  - allowed_domains

要点: A 和 A 协作尽量传能力授权，不直接传明文 secret。

### 4.3 引入授权票据而非长期分享

在 agent_secret_shares 之外新增短期票据 agent_secret_grants：

- grant_id, secret_id
- from_agent_id, to_agent_id
- chain_id, task_id, attempt_id（可选绑定）
- grant_mode: ephemeral, leased, persistent
- max_uses, used_count
- expires_at
- status: active, revoked, expired

关系建议:
- 长期关系仍用 agent_secret_shares（静态关系）。
- 运行时真正消费能力时使用 agent_secret_grants（动态票据）。

## 5. 多A链与 A和C 混合交互模型

说明: 这里将你提到的 A 和 C 视为不同职责链或节点角色，不是强绑定特定模型厂商。

### 5.1 交互通道类型

新增 agent_interaction_edges（或扩展现有拓扑视图）：

- handoff_task: 任务移交（A1 到 A2）
- request_capability: 请求能力（A2 向 A1 请求某能力）
- proxy_execute: 代理执行（A2 不拿 secret，由 A1 代执行）
- critique_feedback: 评审反馈（C 节点对 A 节点输出进行审阅）

推荐默认策略:
- 跨链只允许 handoff_task 和 proxy_execute。
- 同链可启用 request_capability（受链信任级别约束）。

### 5.2 交互协议（AI 友好）

统一事件载荷（可入 task_event_outbox 扩展类型）：

- interaction_type
- source_agent_id, target_agent_id
- chain_context: chain_id, role, stage
- contract:
  - intent
  - input_schema
  - output_schema
  - sla_seconds
- security_context:
  - grant_id（可空）
  - required_capabilities
  - sensitivity_level
- result:
  - status
  - error_code
  - confidence

这样 Agent 可以程序化决策，而不是靠自然语言猜测。

### 5.3 冲突与环路治理

增加以下治理规则：

1. 环路检测:
- 同一 task_id 加 chain_id 若在短窗口内重复回流到同一节点超过阈值，触发 CHAIN_LOOP_DETECTED。

2. 冲突仲裁:
- Planner 与 Critic 结果冲突时，按 confidence 加 role_weight 加 recency 自动选主，必要时升级到 human approval。

3. 降级策略:
- 能力请求失败时，先尝试 proxy_execute，再 fallback 到人工审批队列。

## 6. API 扩展建议（兼容现有接口）

### 6.1 在不破坏当前 pull 协议下增强 agent_profile

当前返回:
- active_secret_names

建议新增:
- secret_capability_refs: 不含明文，仅含 capability 列表与策略摘要。
- chain_memberships: 当前 agent 所在链及角色。
- peer_interaction_policies: 可交互目标、允许通道、是否可申请 grant。

### 6.2 新增关键接口（建议）

1. 链管理
- POST /workspaces/{workspace_id}/chains
- POST /workspaces/{workspace_id}/chains/{chain_id}/nodes
- GET /workspaces/{workspace_id}/chains/{chain_id}/topology

2. 运行时授权票据
- POST /workspaces/{workspace_id}/agents/{agent_id}/secrets/{secret_id}/grants
- POST /agent/grants/{grant_id}/consume
- POST /agent/grants/{grant_id}/revoke

3. 交互执行
- POST /agent/interactions/request
- POST /agent/interactions/{interaction_id}/resolve

4. 可观测
- GET /workspaces/{workspace_id}/chains/{chain_id}/interaction-audit
- GET /workspaces/{workspace_id}/chains/{chain_id}/risk-report

## 7. 前端产品扩展（基于现有 Agent Secrets 页面）

当前 Agent Secrets and Collaboration 已有基础，建议增量加三块：

1. Chain View:
- 从按 agent 看拓扑升级为按 chain 看拓扑。
- 支持切换 project、chain、stage 过滤。

2. Secret Capability Matrix:
- 行是 secret，列是 capability 和 action，单元格显示约束（预算、项目范围、过期策略）。

3. Interaction Replay:
- 展示 A和A 或 A和C 交互序列，支持按 task_id 回放。
- 在每个交互节点展示 grant_id、是否代理执行、失败码。

## 8. 安全与合规建议

1. 明文最小化:
- 管理端 reveal 保留，但运行时优先使用 grant 或 proxy，不向下游 Agent 传明文。

2. 双重审计:
- 保留 agent_secret 事件。
- 新增 agent_interaction、agent_grant 事件并关联 task_id、attempt_id、chain_id。

3. 失效联动:
- Secret revoke 时，自动失效所有 active grant。
- Agent revoke 或 inactive 时，自动撤销其发出和接收的 grant。

4. 风险分级:
- 按 capability 配置风险等级，触发高风险动作需要二次确认或 human-in-the-loop。

## 9. 分阶段落地计划（可执行）

### Phase 1（1到2 周）: 数据与协议最小升级

1. 在 agent_runtime_pull 增加 secret_capability_refs 与 chain_memberships 只读输出。
2. 新增 agent_chains 与 agent_chain_nodes 表和只读查询接口。
3. 在现有 secrets collaboration 页面增加 chain 过滤视图（先只读）。

验收标准:
- 不破坏现有 secrets 和 shares 接口。
- Agent 运行时可拿到可机读策略摘要。

### Phase 2（2到3 周）: 授权票据与交互协议

1. 新增 agent_secret_grants 与消费接口。
2. 新增 agent/interactions/request 和 resolve 事件流。
3. 在 task_event_outbox 增加交互事件类型并接入通知链路。

验收标准:
- 同一任务内可完成 A1 到 A2 能力申请与消费，且全链路有审计。

### Phase 3（2 周）: 治理与智能调度

1. 增加 loop detection、conflict resolution、fallback policy。
2. 增加 chain risk dashboard（失败率、越权拦截、平均交互时延）。

验收标准:
- 多A链并行时，系统可自动识别环路和冲突并给出可解释处理结果。

## 10. 对 AI 友好的明确落点

1. 所有新增运行时字段都保持结构化、可机读、可版本化。
2. 给出明确错误码（如 GRANT_EXPIRED、INTERACTION_NOT_ALLOWED、CHAIN_LOOP_DETECTED）。
3. 所有策略都能在 pull 响应中被 Agent 感知，不依赖 UI 才能理解。
4. 在 SDK 层提供高阶 helper（如 requestCapability()、proxyExecute()），降低 Agent 集成门槛。

如果按这个方案推进，平台会从 Agent 间共享机密升级到多链协同的能力治理系统，既能支持多 A 链和多 A加C 组合，也能保持平台对 AI 执行器非常友好。
