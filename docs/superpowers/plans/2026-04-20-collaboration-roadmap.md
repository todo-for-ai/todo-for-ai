# Human-Agent Collaboration Feature Roadmap

> 20 个功能，4 个阶段，实现完整的多人协作 + 人机协作平台

## 总体目标

将 Todo for AI 从单用户任务管理工具升级为支持**多用户协作**和**人类-Agent 协作**的智能任务平台。

## 现状评估

```
多用户协作：  ████████░░  80% — 后端模型完整，前端协作 UI 缺失
人类-Agent协作： ██████░░░░  60% — Agent 协议完整，前端集成和 Agent 主动性待补
Agent 间协作：  █████░░░░░  50% — 编排策略已定义，运行链路待打通
```

---

## Phase 1: 核心协作体验（1-2 周）

**目标：** 补齐人类协作基础，让团队成员能在任务上沟通和协作。

| # | 功能 | 后端 | 前端 | 优先级 |
|---|------|------|------|--------|
| 1 | 任务评论系统 | TaskLog API 已有 | 缺组件 | P0 |
| 2 | 任务活动流/时间线 | TaskHistory API 已有 | 缺组件 | P0 |
| 3 | 任务指派界面 | assignees 字段已有 | 缺 UI | P0 |
| 4 | @提及功能 | mentions + 通知已有 | 缺输入组件 | P1 |
| 5 | WebSocket 替换轮询 | Socket.IO 已有 | 需客户端 | P1 |

**详细计划：** `2026-04-20-phase1-core-collaboration.md`

---

## Phase 2: 人类-Agent 协作闭环（2-3 周）

**目标：** 让人类能看到 Agent 在做什么，并能干预和协作。

| # | 功能 | 后端 | 前端 | 优先级 |
|---|------|------|------|--------|
| 6 | Agent 实时状态面板 | 心跳 + WebSocket 已有 | 无可视化 | P0 |
| 7 | Human-in-the-Loop 审批 UI | governance API 完整 | 无界面 | P0 |
| 8 | Agent 任务监控大屏 | /runtime/monitor 已有 | 无可视化 | P1 |
| 9 | Agent 主动创建任务 | 无创建 API | 无 | P1 |
| 10 | 人机协作任务视图 | creator_type 字段已有 | 无区分展示 | P2 |

**详细计划：** 待 Phase 1 完成后编写

---

## Phase 3: 协作效率提升（1-2 周）

**目标：** 提升多人协作效率，支持复杂项目管理。

| # | 功能 | 后端 | 前端 | 优先级 |
|---|------|------|------|--------|
| 11 | 看板实时协作 | WebSocket 基础已有 | 无实时更新 | P1 |
| 12 | 任务依赖/阻塞关系 | 完全缺失 | 完全缺失 | P1 |
| 13 | 项目成员管理 UI | ProjectMember API 已有 | 无管理界面 | P1 |
| 14 | 用户在线状态 | last_active_at 已有 | 无指示器 | P2 |
| 15 | 批量任务操作 | 完全缺失 | 完全缺失 | P2 |

**详细计划：** 待 Phase 2 完成后编写

---

## Phase 4: Agent 间高级协作（2-3 周）

**目标：** 多 Agent 编排和协作，实现 Agent 团队自主工作。

| # | 功能 | 后端 | 前端 | 优先级 |
|---|------|------|------|--------|
| 16 | Agent 间消息通道 | Interaction Protocol 已有 | 无 | P1 |
| 17 | 动态团队编排 UI | AgentTeam + 策略完整 | 仅有基础创建 | P1 |
| 18 | Agent 共享记忆 | Secret 共享已有 | 无 | P2 |
| 19 | 审批工作流模板 | Governance 规则已有 | 无 | P2 |
| 20 | 协作回放/审计 | AuditEvent 已有 | 无可视化 | P2 |

**详细计划：** 待 Phase 3 完成后编写

---

## 执行策略

- 每个 Phase 编写独立详细计划
- 每个 Phase 内的 Task 按依赖顺序执行
- 无依赖的 Task 使用 subagent 并行执行
- 每个 Task 完成后提交代码并验证

## 技术约束

- 后端：Python 3.11 + Flask + SQLAlchemy + MySQL + Socket.IO
- 前端：React 18 + TypeScript + Ant Design 5 + Zustand + Vite
- 实时通信：Socket.IO（后端已有 flask-socketio）
- 不引入新数据库，复用现有 MySQL
- 保持 flat design 风格一致性
