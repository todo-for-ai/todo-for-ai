# Todo for AI 产品路线图 —— 人类与 Agent 协同开发平台

> 版本：v1.0（2026-08-31）
> 定位主张：**让 Agent 在人类治理下自主迭代产品**。平台不只是"给 AI 记任务的任务管理器"，
> 而是人类与 Agent 共同开发产品的协作平台：人类定目标、定边界、做关键决策；
> Agent 领任务、写代码、跑验证、提交证据、持续迭代。
> 本文档是活文档（living document），每个阶段收尾时复盘更新。

---

## 1. 愿景与核心竞争力

### 1.1 一句话定位

> **人类与 Agent 的协同开发平台：Agent 在可验证的治理框架下自主迭代产品。**

### 1.2 为什么这是核心竞争力

市场上不缺"AI 写代码的工具"（Copilot/Cursor/Claude Code），也不缺"任务管理工具"（Jira/Linear）。
缺的是把两者闭环起来的**操作系统层**：

| 竞品类型 | 他们做的 | 我们做的 |
|---|---|---|
| AI 编码工具 | 单点提效：人驱动，Agent 辅助 | Agent 驱动：Agent 领任务、自主完成、自证质量 |
| 任务管理工具 | 记录"谁做什么" | 编排"人与 Agent 如何一起做"，任务可被机器执行和验证 |
| Agent 框架（LangChain 等） | 给开发者造 Agent 的框架 | 给组织用 Agent 的运行时：治理、证据、记忆、审计 |

**护城河 = 信任的复利**。每一次"Agent 自主完成任务并通过验证"都会沉淀三类不可迁移的数据资产：

1. **证据链**（验证结果、审批记录、审计日志）→ 让自主可以被信任；
2. **组织记忆**（SOUL 版本、上下文规则、决策记录）→ 让新 Agent/新项目冷启动成本趋近于零；
3. **行为数据**（技能画像、返工模式、交接网络）→ 让编排越来越准。

这三者形成数据飞轮，后来者无法用功能复制。

### 1.3 产品原则

1. **自主是渐进的，不是开关**：Agent 的自治权限从"每步审批"到"完全自主"可分级调节，信任靠证据积累。
2. **没有证据的完成不算完成**：任务的 Done 必须由机器可验证的证据（测试/构建/预览）支撑，而不是 Agent 自述。
3. **人类始终握有否决权**：破坏性操作（删库、发生产、花预算）必须走审批队列，其余尽量不打扰人。
4. **一切留痕**：每次 Agent 运行都可回放、可审计、可问责。

---

## 2. 现状盘点（2026-08）

### 2.1 已有的资产（优势）

**协作基础设施（厚）**
- 任务域：项目/任务/子任务/标签/历史/日志、看板、评论、附件、批量操作、任务依赖模型
- 组织域：组织/角色/成员、项目成员、用户搜索 @mention、聊天线程、委派、Review API
- 实时协作：WebSocket 推送（Flask-SocketIO）、人-Agent 实时协作基础设施、通知体系（渠道/投递/回执）

**Agent 运行时协议（成体系）**
- 拉取/提交协议：agent_runtime_pull（拉 is_ai_task）、commit（含事件批量上报）、心跳、任务租约（AgentTaskLease）、尝试记录（AgentTaskAttempt）、结果去重（AgentResultDedup）
- OpenClaw 封装的 agent-runtime 容器：拉任务 → 转发网关 → 提交结果，含 mock 模式与端到端验证脚本、K8s 清单
- 运行监控：AgentRun/AgentRunState、runtime monitor、Runtime Controller 管理端点
- 执行环境 × 引擎两层模型（2026-09-11）：RuntimeProvider 五后端（k8s/docker/compose/baremetal/remote 反连）按 Agent.execution_mode 解析；引擎注册表（claude/codex/opencode/SDK，services/runtime_env/engines.py）与环境正交、任何环境×任何引擎合法组合；设计见 api-server `docs/ENGINE_RUNTIME_MODEL.md`。后续：Podman 实测、ECS 后端、daemon 元数据上报
- 部署引导与自检（2026-09-11）：`/system/deploy/check` 扩展 runtime 检查组（后端前置条件/回连地址/Agent 与 WS 在线概览，带处理建议）；webpage 新增「部署引导」页（菜单直达）分组渲染报告；agent-runtime daemon 经 WS auth/心跳上报 host/engine/version/os 元数据。后续：向导式初始化（建管理员/接入首个 Agent）
- 系统监控 + 首次安装门控（2026-09-11）：`/system/setup-state`（管理员）驱动菜单——部署未完成才显示「部署引导」，装完自动隐藏；新增「系统监控」页（管理员）：`/system/monitor/server`（CPU/内存/负载/磁盘/进程，psutil 优先 stdlib 兜底，10s 自动刷新）+ `/system/monitor/agents`（Agent 全局：反连在线/待连、托管运行中、活跃租约、近 24h 尝试吞吐、最近活跃 Agent 列表）

**治理与安全（少有的先发优势）**
- 治理规则、审批队列、交互治理、访问控制、审计事件
- 密钥体系：AgentSecret/授权/共享/审计、SecretApprovalRequest

**编排与自动化（骨架已成）**
- Agent 团队：团队/成员/角色/团队-项目、TeamTaskOrchestration（多策略编排）、角色模板
- 触发引擎：AgentTrigger（任务事件侧）、TaskEventOutbox、AgentRun、错失策略
- SOUL 版本：Agent 人格/身份可版本化

**分析与洞察（规划 265–276 增量）**
- 依赖链分析、技能匹配推荐、耗时直方图、情感趋势、交接统计、负载预测、知识传播网络、瓶颈时序、决策延迟、返工分析、专长演化等 12 个维度

**AI 能力**
- ai_task_assistant、ai_task_split（任务拆解）、OpenAI 兼容 API、自定义提示词、上下文规则、规则市场（RuleMarketplace）、AI 请求日志

### 2.2 关键缺口（自主迭代闭环断在哪里）

| # | 缺口 | 现状 | 影响 |
|---|---|---|---|
| G1 | **代码平面缺失** | GitHub 仅有只读仓库代理；平台不知道分支/PR/CI 的存在 | 任务无法落到代码，Agent"完成"只是写了段文字 |
| G2 | **验证门（DoD）缺失** | commit 协议接受 Agent 自述结果，无机器可验证的完成标准 | 自主不可信，规模化无从谈起 |
| G3 | **任务级沙箱缺失** | agent-runtime 直接在容器里跑，无每任务隔离工作区（checkout、依赖、密钥租约） | 并发任务互相污染，无法安全地放手让 Agent 改代码 |
| G4 | **MCP 工具面太薄** | 仅 6 个基础 CRUD 工具 | 外部 Agent（Claude Code/Cursor 等）无法深度参与协作 |
| G5 | **目标层缺失** | 只有 Project/Task，没有 Goal/Epic 的产品目标对象，AI 拆解无法对齐"产品要往哪走" | "自主迭代产品"没有起点：Agent 不知道什么值得做 |
| G6 | **反馈回路未闭合** | 审批队列存在但与验证结果、重试、任务回流没有连成自动循环 | 人审完没有自动收益，Agent 失败后不会自我修正 |

> 结论：**平台侧"协作"很厚，Agent 侧"开发"很薄**。下一阶段的主线就是把闭环补齐。

---

## 3. 核心飞轮：自主迭代闭环（The Autonomy Loop）

产品所有功能都服务于这一条闭环：

```
            ┌────────────────────────────────────────────────────┐
            │                                                    ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │ 1. 目标与拆解 │ → │ 2. 认领与执行 │ → │ 3. 验证门     │ → │ 4. 人审与合并 │
  │ Goal→Epic→任务│   │ 沙箱+租约+密钥│   │ 测试/构建/预览│   │ 审批队列→PR合并│
  └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
            ▲                                                        │
            │         ┌──────────────┐   ┌──────────────┐          │
            └──────── │ 7. 记忆与演化 │ ←─ │ 6. 度量与归因 │ ←────────┘
               沉淀    │ SOUL/知识/画像│   │ 证据链/返工分析│    证据
                      └──────────────┘   └──────────────┘
                            ▲                  │
                            │    ┌──────────────┐
                            └─── │ 5. 重试与重做 │ ← 验证失败自动回流
                                 └──────────────┘
```

- **人类参与点**：① 定目标与边界（阶段 1 入口）；④ 关键审批（合并/发布/预算）；⑦ 纠偏与反馈。
- **其余全部由 Agent + 平台自动完成**。人类介入越少、完成质量越高，平台价值越大。

---

## 4. 分阶段路线图

### Phase 1 —— 信任的自主闭环（MVP，约 4–6 周）

**目标：一条垂直切片跑通"任务 → 代码 → 验证 → 合并"全链路，哪怕只支持 GitHub + 单 Agent。**

| 工作项 | 内容 | 验收标准 |
|---|---|---|
| **P1.1 仓库绑定与 PR 同步**（G1） | GitHub App 集成：项目绑定仓库；创建分支、提交、开 PR、PR 状态回写任务 | 编码任务完成后自动开 PR，PR 合并后任务自动 DONE |
| **P1.2 验证门框架（DoD）**（G2） | 任务可声明完成标准（测试通过/构建绿/lint/自定义命令）；commit 协议要求附证据；平台侧或 CI 侧执行核验 | 无证据的 commit 拒绝标记 DONE；证据在任务详情可视 |
| **P1.3 任务级沙箱**（G3） | agent-runtime 为每个任务创建隔离工作区（repo checkout + 依赖缓存 + 密钥按租约注入，任务结束销毁） | 两个并发任务互不可见；密钥不出租约范围 |
| **P1.4 MCP 工具面第一轮扩容**（G4） | 6 → 18 个工具：claim_task / update_task_status / report_progress / search_tasks / get_project_context / request_approval / get_verification_result / list_my_tasks 等 | Claude Code 能通过 MCP 独立走完"领任务→汇报→提交" |
| **P1.5 审批队列接线**（G6 部分） | PR 创建/合并事件接入审批队列；人批准后触发平台侧合并回调 | 审批动作有审计、有通知、可回溯 |

**里程碑验收（演示脚本）**：人类在平台建一个带 DoD 的编码任务并绑定仓库 → agent-runtime 自动领取 → 沙箱内改代码跑测试 → 提交证据 + 开 PR → 人类在审批队列点批准 → PR 合并、任务自动 DONE，全程人类操作 ≤ 3 次点击。

### Phase 2 —— 自主编排与规模化（约 6–8 周）

**目标：从一个 Agent 干一件事，到多 Agent 按目标自主推进，人类只管方向和例外。**

| 工作项 | 内容 | 验收标准 |
|---|---|---|
| **P2.1 产品目标层**（G5） | 新增 Goal/Epic 对象：人类写产品目标（自然语言 + 指标），ai_task_split 升级为"目标→Epic→带 DoD 的任务图"，Agent 可提议任务、人类可批量裁决 | 一个目标一句话进去，产出可执行任务图，采纳率可度量 |
| **P2.2 渐进自主等级** | Agent/项目两级自治档位：L0 全审批 → L1 抽查 → L2 测试绿即自动合并（限非生产分支）→ L3 全自主（含发布，白名单） | 档位变更留审计；L2 下人类零介入完成任务占比可统计 |
| **P2.3 失败自愈循环**（G6） | 验证失败 → 自动归因（测试日志分类）→ 生成修复子任务回流原 Agent 或交接（复用 skill-matching/交接统计）；封顶重试次数后升级人工 | 验证失败的任务 70% 在无人工干预下二次通过 |
| **P2.4 多 Agent 角色编排** | 在 TeamTaskOrchestration 上落地"开发者/评审者/测试者"标准角色（复用角色模板）：PR 必须过 Agent 评审者 + 验证门双关卡 | 每个合并的 PR 都有 Agent 评审记录 |
| **P2.5 事件面扩容** | 触发引擎从"任务事件"扩展到"代码事件"（PR opened/closed、CI failed、issue opened），打通 TaskEventOutbox 与 GitHub webhook | CI 失败自动建返工任务并分派 |
| **P2.6 预算与配额** | 按 Agent/项目设置 Token/时长/并发预算，超限走审批（复用 SecretApprovalRequest 模式） | 预算耗尽自动暂停并通知，无静默超支 |

### Phase 3 —— 学习型组织记忆（约 6–8 周）

**目标：让平台越用越聪明——Agent 有画像，项目有记忆，新任务自动匹配最合适的执行者。**

| 工作项 | 内容 |
|---|---|
| **P3.1 SOUL v2** | SOUL 从"人格版本"升级为"工作档案"：自动从运行历史沉淀技能画像（擅长语言/模块/任务类型），作为派单依据 |
| **P3.2 项目知识库** | 自动策展：PR 描述、评审意见、失败归因、人类纠偏记录 → 结构化为项目决策/约定；上下文规则从手填变为自动建议 + 人工确认 |
| **P3.3 洞察落地为动作** | 既有 12 个分析维度（增量 265–276）不止于看板：负载预测→派单节流；返工分析→DoD 模板推荐；知识传播网络→导师制编排 |
| **P3.4 记忆的治理** | 记忆可查看、可编辑、可遗忘（合规），SOUL/知识变更走版本化 + 审计（复用 SOUL 版本机制） |

### Phase 4 —— 生态与商业化（Phase 2 后并行启动准备）

- **Runtime SDK**：把 agent-runtime 的拉取/提交/验证协议开放为 SDK，任何人可接入自己的 Agent（不绑死 OpenClaw）
- **Agent 市场与角色模板市场**：角色模板（复用现有 RoleTemplate + RuleMarketplace 骨架）→ 可安装的"数字员工"
- **企业能力**：SSO、组织级审计导出、私有化部署增强（private-deploy 已有底子）、合规报告
- **互操作**：开放协议（任务/证据/审批的事件 schema），与 Linear/Jira/GitLab 双向同步

---

## 5. 北极星与护栏指标

**北极星：自主完成率（Autonomous Completion Rate, ACR）**
= 无需人工干预（除初始派单与最终抽查）而通过验证门并合并的任务数 / 总完成任务数。

| 类别 | 指标 | 说明 |
|---|---|---|
| 增长 | 周活跃协作任务数 | 人或 Agent 创建、对方执行的任务 |
| 自主质量 | 验证一次通过率 / 返工率 | 返工分析（增量 275）直接供电 |
| 自主质量 | 逃逸缺陷率 | 合并后被人类/线上发现的缺陷 |
| 人类杠杆 | 每人工时产出的合并任务数 | "1 个人管 10 个 Agent"的量化 |
| 信任 | 审批队列平均滞留时长 | 越短说明 Agent 越值得信任、打扰越少 |
| 护栏 | 破坏性操作拦截率、预算超支次数 | 必须 = 100% 拦截、0 静默超支 |

---

## 6. 与既有规划的衔接（重要取舍）

- **暂停增量 265–276 中纯展示型卡片**（情感趋势、直方图等），保留直接服务闭环的：技能匹配（P2.3 派单要用）、交接统计、返工分析、负载预测。分析能力在 Phase 3 以"洞察→动作"形态回归。
- **agent-runtime 保持 OpenClaw 路线但抽掉硬依赖**：沙箱、租约、验证上报做成协议层，Phase 4 SDK 化。
- **MCP 6 个既有工具保持兼容**，扩容走新增不破坏存量用户配置。
- Command Center 已有的监控卡片（AgentMonitor/OrchestratorStatus/SecurityEvents）正好作为 Phase 2 自主等级的可视化底座，不重做。

## 7. 立即行动（本周）

> **进展（2026-08-31）**：Phase 1 核心闭环已落地（api-server 6 个提交 + mcp 1 个提交，124 测试全绿）：
> - ✅ P1.2 DoD 验证门：`tasks.dod` + `TaskEvidenceRecord` 模型与迁移；commit 协议证据强制（`DOD_EVIDENCE_REQUIRED` 可关）；`GET /tasks/<id>/evidence`；ACR 埋点 `human_intervention_count`
> - ✅ P1.1 GitHub 读写：`ProjectRepoBinding` + `services/github_client.py`；绑定/开分支/开 PR/PR 状态同步（merged → 任务自动 DONE）
> - ✅ P1.4 MCP 扩容（DoD 部分）：`get_task_evidence` / `set_task_dod` 双层工具（后端 mcp/call + npm 包）；任务 API 支持 dod
> - ✅ P1.5 MVP：`POST /tasks/<id>/pull-request/merge` 人工审批动作（权限 + AuditLog 审计）
> - ✅ 附带修复：main 合并遗留断裂（Agent/AgentRun/ProjectMember 模型统一、JWT str identity、Py3.9 兼容、FK 类型）
> - ✅ commit 协议 evidence 上报适配：pull 下发 payload.dod；agent-runtime DODVerifier 在沙箱执行验收命令采集证据；失败提交带证据归因（DOD_CHECK_FAILED）；真 HTTP 端到端 PASS（scripts/dod_e2e_http.py）
> - ✅ P1.3 任务级沙箱 MVP：TaskWorkspaceManager 每任务隔离工作区（并发互不可见、任务结束销毁）、DoD 命令在工作区内执行、租约密钥仅经环境变量注入不落盘
> - ✅ 前端任务详情证据展示：TaskEvidenceCard（DoD 验收标准 + 证据列表/状态/链接，通过/失败横幅；无内容自动隐藏）
> - ✅ repo checkout 型工作区：payload.repo 声明 → clone（token 经 GIT_CONFIG_* 环境注入不落盘）+ 依赖缓存（repo+ref+lockfile 内容哈希为 key，硬链接恢复，lockfile 变更自动失效）
> - ✅ DOD 命令 strict 沙箱模式统一：DODVerifier 按 SANDBOX_MODE 分派——strict 下命令经 nsjail（config/time_limit/rlimit_as/工作区 bindmount/网络隔离），nsjail 不可用按 SANDBOX_STRICT_FALLBACK 降级或 fail-closed；证据 detail 记录 sandbox_mode
> - ✅ 审批队列完整事件化 + 自主等级 L0-L2（Phase 2 第一项）：ProjectRepoBinding.autonomy_level；L0 PR 创建入 interaction_request 队列不触 GitHub，批准回调执行动作；L1 自动 PR 人工合并；L2 证据全通过自动合并（auto_approved 事件）；决策写 interaction_approval + AuditLog，审批队列 pending 列表直接可见
> - ✅ 前端审批入口：pending 列表端点（GET /tasks/pull-request/approvals/pending，按用户可管理项目过滤）+ CommandCenter PRApprovalsCard 卡片（批准=执行动作 / 拒绝=记录决策）
> - ✅ GitHub App 化代码侧准备：webhook 接收端点（HMAC SHA256 常量时间校验，fail-closed，config secret → env 回退）处理 pull_request/installation 事件（merged webhook → 任务自动完成）；App manifest 生成 + callback 一次性 code 换凭据（私钥/webhook secret 加密存储，key-id 前缀支持轮换）；App JWT（RS256）与 installation token 获取骨架；项目仓库绑定 token 加密存储同步修复 tuple 隐患
> - ✅ installation token 接入 repo 操作执行面：resolve_token 凭证优先级 App installation（进程内缓存，过期前 5 分钟刷新）→ 绑定 token → GITHUB_TOKEN；App 不可用静默回退（带 warning），prefer_app=False 可强制静态凭证排障
> - ✅ P2.6 预算与配额：Budget 模型（agent/project/workspace × tokens/duration_minutes/concurrent × total/daily/weekly/monthly）；任务派发（runtime pull）与 AgentRun 创建（触发引擎）强制校验；超限写 budget_exceeded interaction_request（审批队列可见）+ 审计，同预算同周期幂等告警一次
> - ✅ P2.5 事件面扩容：AgentTriggerType.REPO_EVENT + emit_repo_event——GitHub PR webhook 事件（opened/closed/merged/synchronize）写 TaskEventOutbox 后匹配 repo_event 触发器（事件名 + repo/项目过滤）创建 AgentRun，复用预算门与幂等键
> - ✅ P2.3 失败自愈循环：failed 提交自动归因（failure_code/reason → 7 类）；未超重试封顶自动生成修复子任务（父链接 + DoD 继承 + 回流派发池）；封顶后写 repair_escalation 审批事件升级人工；attempt 级幂等
> - ✅ P2.1 产品目标层：Goal/Epic 模型与迁移；api/goals.py 目标 CRUD、Agent 提议 Epic（proposed）与人类单条/批量裁决、Epic 展开为带 DoD 的任务图（LLM 骨架 + 确定性落地，依赖写 blocking/blocked_by，tasks.epic_id 关联）
> - ✅ P2.4 多 Agent 角色编排：内置 developer/reviewer/tester 角色模板 seed（幂等）；TeamTaskOrchestration.role_assignments 角色→Agent 映射；评审者关卡（require_agent_review）——合并（人工/L2 自动/审批回调）前必须有非自评的通过评审证据，阻断记审计；评审证据提交端点校验指定评审者
> - ✅ P2.2 预算管理面：workspace 维度 Budget CRUD + 用量查询 API（scope 归属校验、应用层组合查重——SQLite/MySQL 对含 NULL 组合唯一约束不生效、写操作 owner/admin 门、审计）；webpage 组织详情新增「预算配额」Tab（范围/资源/周期选择、用量进度条超限告警、启停/编辑/删除）
> - ✅ P2.5 事件面再扩容：issues.opened → 绑定项目自动建任务 + repo.issues.opened 出箱（「Issue → 任务 → Agent 认领」自主闭环外部入口）；workflow_run.completed → 按 PR 头分支关联任务发 repo.workflow_run.&lt;conclusion&gt;（CI 失败自动返工的信号源）；manifest default_events/permissions 同步扩容
> - ✅ P3.1 技能画像（SOUL v2 第一块）：agents.skill_profile JSON 列 + 迁移 000008；services/skill_profile.py 从 AgentExperience（domain/task_type/capabilities × 成败）+ TaskAssignment（完成/失败）聚合画像（幂等重建，不改写人工 capabilities）；GET/POST /agents/&lt;id&gt;/skill-profile(/rebuild) 端点（查看带 stale 标记，重建走管理门 + 审计）；score_task_for_agent 接入 skill_profile_bonus（命中画像技能加权，cap 20）——画像即派单依据
> - ✅ P3.2 学习闭环第一环：handle_failed_commit 归因结果自动沉淀 failure_pattern 经验（domain←任务标签、task_type←归因类别、capabilities_used←Agent 能力）——失败自愈（P2.3）直接喂养技能画像（P3.1）与派单打分（experience_bonus），平台越用越聪明
> - ✅ P3.1 前端可见：Agent 详情页 Overview 新增「技能画像」卡片（完成/失败/经验统计、Top 技能成功率进度条、stale 标记、一键重建）
> - ✅ P3.4 记忆治理：agent_soul_versions 升级为统一记忆版本表（memory_kind 区分 soul/skill_profile + snapshot_json 结构化快照，唯一约束放宽到 agent+kind+version，迁移 000009）；技能画像每次重建自动写版本快照；GET /agents/&lt;id&gt;/memory/versions 统一版本历史（kind 过滤）+ GET /memory/audit 记忆审计查询 + DELETE /skill-profile 可遗忘（清空画像 + 墓碑版本 + 审计）——记忆可查看、可审计、可遗忘
> - ✅ P3.2 知识自动策展（提案-确认流）：ProjectKnowledgeProposal 模型 + 迁移 000010；失败归因自动生成「项目教训」提案（dedupe 幂等，proposal_from_failure 挂入失败自愈路径）；GET /projects/&lt;id&gt;/knowledge-proposals + confirm（→ 项目共享 KnowledgeEntry，entry_type=rule）+ dismiss（归档留痕），裁决走项目管理权限 + 审计——项目约定/教训从手填变为自动建议 + 人工确认
> - ✅ P3.3 洞察落地为动作：services/insight_actions.py——①负载预测（TaskAssignment 吞吐/积压外推）→ 派单节流：超载 Agent 在 score_task_for_agent 中扣分降权（load_throttle_penalty/load_forecast 入打分结果），GET /agents/&lt;id&gt;/load-forecast 可查；②返工分析 → DoD 模板推荐：按自愈修复类别聚合返工分布，映射为推荐 DoD 模板，GET /projects/&lt;id&gt;/insights/dod-recommendations 查看 + apply 一键合并进任务 DoD（type+value 去重，管理权限 + 审计）；③知识传播网络 → 导师制编排：GET /workspaces/&lt;id&gt;/insights/mentorship-recommendations 高产出知识 Agent × 零覆盖 Agent 按领域缺口配对，apply 确认后落地为双成员团队（导师 LEADER/学徒 MEMBER）+ 导师该领域经验自动 is_shared（幂等复用团队，管理权限 + 审计）
> - ✅ Phase 4 第一项 Runtime SDK：agent-runtime/sdk 独立包 todo4ai-sdk（仅依赖 httpx）——Todo4AIClient（introspect 认证/过期刷新/401 重认证、pull、lease 续期、events、commit 携带 Idempotency-Key + evidence）、DODVerifier（permissive/strict nsjail fail-closed，证据形状与平台契约一致）、Todo4AIRunner（pull→handler→DoD 验证→提交循环，租约自动续期，DOD_CHECK_FAILED/EXECUTION_ERROR 归因兜底）；README 协议文档 + examples/minimal_agent.py 最小接入示例 + 17 个 MockTransport 密封测试——任何人可接入自有 Agent（不绑死官方 runtime）
> - ✅ Phase 4 第二项 数字员工市场：agent_role_templates 增加 published_to_marketplace/published_at（迁移 000011）；POST publish/unpublish 发布/下架自有模板（管理权限 + 审计）；GET /marketplace/digital-employees 市场列表（内置 + 已发布，分类/搜索过滤，按安装量排序）；POST install 安装到工作区——复制为工作区自有模板（parent_template_id 指向市场源，幂等：重复安装返回既有副本），源模板 usage_count 累计，可选 create_agent 直接实例化 Agent，安装写 marketplace.employee_installed 审计
> - ✅ Phase 4 第三项 企业能力（第一块：组织级审计导出）：GET /workspaces/&lt;id&gt;/audit-events/export——CSV/JSON 双格式（Content-Disposition 附件下载），时间窗 start_date/end_date + event_type/actor_type/target_type/level/task_id/risk_min 维度过滤，10 万行上限超出标记 truncated，工作区 owner/admin 权限门，导出动作本身写 audit.exported 审计（含格式/条数/过滤条件）
> - ✅ Phase 4 第四项 互操作（开放协议打底）：api/open_protocol.py 统一开放事件 schema——GET /workspaces/&lt;id&gt;/open/events 把 TaskEventOutbox（任务/代码事件）、TaskEvidenceRecord（证据，evidence.recorded）、AgentTaskEvent 审批事件（approval.requested/decided）投影为统一 envelope（id/category/type/occurred_at/workspace_id/task_id/data），多源合并游标分页（不透明 base64 游标单调推进、不重放、非法游标按起点），category 过滤；GET /open/schema 自描述供集成方发现——为 Linear/Jira/GitLab 双向同步打底
> - ✅ Phase 4 第三项 企业能力（第二块：SSO 骨架 + 合规报告）：①workspace_sso_configs 表（迁移 000012，OIDC 全字段 + SAML 预留，client_secret 加密落库不回显）；PUT/GET /workspaces/&lt;id&gt;/sso/config（管理权限 + sso.config_updated 审计）；POST /sso/login 构造 OIDC 授权 URL（itsdangerous 签名 state 防 CSRF，SAML 返回 501）；GET /sso/callback/&lt;id&gt; code 换 userinfo（http 客户端可注入，测试免真实 IdP）→ email 找/建账号 → 平台 JWT；②GET /workspaces/&lt;id&gt;/compliance/report 合规报告：时间窗汇总风险事件（阈值/级别/Top 类型）、审批滞留（interaction 配对 avg/max/pending）、预算超支次数、审计导出次数、SSO 状态，生成动作写 compliance.report_generated 审计
> - ✅ Phase 4 第四项 互操作（写回侧·Linear 连接器首个落地）：external_connector_configs 表（迁移 000013，workspace+provider 唯一，secret 加密存储，default_project_id 映射）；GET/PUT /workspaces/&lt;id&gt;/connectors(/linear) 配置管理（管理权限 + connector.configured 审计）；POST /connectors/linear/&lt;ws&gt;/ingest 入站 webhook——Linear-Signature HMAC-SHA256 常量时间验签 fail-closed，Issue create/update → 平台任务 upsert（external key 记 tasks.creator_identifier='linear:IDENTIFIER'，state.type→平台状态映射），Comment → TaskLog 追加式评论；每次处理写 connector.linear.* 出箱事件回灌开放事件流——读侧（open/events）+ 写侧（ingest）构成双向同步闭环
> - ✅ Phase 4 第四项 互操作（写回侧·GitLab 连接器复用骨架落地）：POST /connectors/gitlab/&lt;ws&gt;/ingest——X-GitLab-Token 常量时间校验 fail-closed，issue webhook（object_kind=issue）→ 任务 upsert（external key 'gitlab:&lt;gl_project_id&gt;:&lt;iid&gt;'，state opened/closed→todo/done），note → TaskLog 追加评论（作者=GitLab username），connector.gitlab.* 出箱回灌开放事件流——与 Linear 共用 external_connector_configs 配置面与 upsert/评论同步机制
> - ✅ Phase 4 第四项 互操作（写回侧·Jira 连接器复用骨架落地）：POST /connectors/jira/&lt;ws&gt;/ingest——配置令牌常量时间校验（X-Todo4AI-Token 头或 ?token= query），jira:issue_created/updated → 任务 upsert（external key 'jira:ISSUE_KEY'，Jira 状态名按常见名归类映射 done/in progress/to do 等，未命中保持现状），jira:comment_created → TaskLog 追加评论（作者=displayName），connector.jira.* 出箱回灌开放事件流——Linear/GitLab/Jira 三连接器共用 external_connector_configs 配置面与 upsert/评论同步机制，roadmap 双向同步矩阵完成
> - ✅ Phase 4 第三项 企业能力（第三块：SAML 登录链路）：services/saml.py 纯 Python SAML 2.0 SP 实现——IdP 元数据解析（SSO URL + X509 证书）、SP-initiated AuthnRequest（Redirect Binding，deflate+b64，state 签名携带 request_id）、SAMLResponse 校验 fail-closed（enveloped 签名验签：C14N 摘要 + RSA/PKCS1v15，Assertion 级优先 Response 级兜底；IdP issuer / audience=SP EntityID / NotBefore+NotOnOrAfter 时间窗 ±90s / InResponseTo 全校验）→ NameID email → find_or_create_user → 平台 JWT；POST /sso/callback/&lt;id&gt; 支持 POST binding form；8 个测试（含真 RSA 自签证书构造签名断言、篡改/过期断言拒绝、端到端签发 JWT）
> - ✅ Phase 4 第三项 企业能力（第四块：私有化部署增强）：services/deploy_check.py 部署健康自检（DEPLOY_SCHEMA_VERSION=13 与 migrations/versions 目录对齐；必需配置项 SECRET_KEY/JWT_SECRET_KEY/SECRET_ENCRYPTION_KEY 缺失或 .env 模板占位符未替换 → error，可选集成/DEBUG=true → warning；迁移完整性：按 EXPECTED_SCHEMA 清单核对核心表/列，覆盖 000008-000013 与基础 schema）；GET /system/deploy/check 管理员端点 + scripts/deploy_check.py 离线脚本（JSON 报告，error 时退出码 1）——部署前/升级后自检共用同一检查面
> - ✅ agent-runtime 沙箱加固（子进程 env 最小化）：DoD 验收命令（dod_verifier）、repo clone/依赖安装（repo_workspace）、SandboxedExecutor（strict/permissive）子进程此前全量继承 runtime 进程环境，AGENT_KEY/API Token 等敏感变量泄漏进任务工作区子进程树——改为 src/sandbox/env.py 白名单最小 env（PATH/HOME/TMPDIR/CA/JAVA_HOME 等工具链变量），租约密钥经 extra 显式追加始终生效，SANDBOX_ENV_PASSTHROUGH 可放开非敏感变量；附带修复 SandboxedExecutor strict 路径 sandbox_network_mode 属性不一致的潜在 AttributeError；+13 单测（泄漏回归 + passthrough + 布局兼容导入），198 passed
> - ✅ Runtime SDK 同源加固（todo4ai-sdk DoD 子进程 env 最小化）：SDK 版 DODVerifier 同样全量继承第三方宿主进程环境（宿主的平台 Key/模型 API Key/业务密钥泄漏面）——SDK 内联零依赖副本 todo4ai_sdk/_env.py，与 runtime 侧同一白名单与 SANDBOX_ENV_PASSTHROUGH 语义，租约密钥 extra 追加始终生效；+9 测试（26 passed），SDK README 增补环境最小化协议说明
> - ✅ 人与 Agent 协同写作（第一环）：任务即协同文档——api-server services/task_content.py 任务文档模型（Agent 产出以 `## 🤖 Agent 产出（归属标签）` 分节追加在人类正文之后，多次提交按序累积、历史 JSON 信封读写双端无损归一化，轮转解析幂等）；commit 写回由 JSON blob 整体覆盖改为分节追加（此前人类详情页看到原始 JSON、编辑保存即覆盖丢失 Agent 产出）；webpage 详情页以只读 Milkdown 按「正文 + 每分节归属卡片」渲染（替换 dangerouslySetInnerHTML 直灌 JSON 串），编辑页/复制任务加载统一归一化为可续写 Markdown——人类可继续在 Agent 贡献之上书写而不破坏归属；api-server 17 个单测（服务轮转 + commit 端到端回归，含 legacy 信封迁移）+ webpage 8 个单测；附带固化 agent_common 表检查缓存在 SQLite 共享连接上事务中途 ROLLBACK 卷掉请求写入的地雷（测试 fixture 预热规避）
> - ⏭ 待办：GitHub App 实际创建/安装（运维步骤），安装后 App 路径自动生效
>
> **进展（2026-09-02）**：Agent 接入体验迭代（P1.4 收尾，MCP 核心面 8 → 13 工具）：
> - ✅ 外部 Agent 自主闭环工具补齐（后端 api/mcp + npm 包双层同步）：`list_my_tasks`（发现工作入口：创建/拥有/项目内/被指派四路可见性，assignees JSON 精确匹配过滤 agent 同号误命中）、`search_tasks`（title/content 关键词搜索，权限范围内）、`update_task_status`（状态流转 + `expected_revision` 乐观锁冲突拒绝 + 标 done 有未满足 DoD 时软性告警不阻断）、`report_progress`（append-only 任务日志，actor=AGENT 归属 token 用户）、`request_approval`（外部 Agent 请求人类决策：写 interaction_request 事件进 workspace 审批队列，owner/admin 经既有审批端点批准/拒绝，WebSocket 通知任务房间与任务创建者，审计 audit_source=mcp_request_approval）——外部 Agent（Claude Code/Cursor 等）以自身 API token 即可走完"发现任务 → 开工 → 汇报 → 请求决策 → 交付"全流程
> - ✅ 配套修复：审批链路对"平台发起事件"（AgentTaskEvent.agent_id 为空）的两处兼容——decide_interaction_approval 不再对 None agent_id 崩溃；approvals/pending 列表 agent_name 回退 payload.source_agent_name/source_user_name 并新增 source 字段区分 agent/mcp 来源
> - ✅ 存量修复：get_project_tasks_by_name 状态过滤按枚举 value 字符串查询命中 0 行（SQLAlchemy Enum 按 name 落库），统一改 TaskStatus(value) 成员过滤
> - ✅ 测试：api-server 新增 test_mcp_agent_loop_tools.py（19 用例：可见性/agent 同号过滤/乐观锁/DoD 告警/审批入队-决议-出队全链路；任务行用独立高位 id 段，避免与 task_factory 每测试手工 id 机制在会话级库中撞 UNIQUE）；npm 包新增 agent-loop-tools 注册面测试（23 passed）

> - ✅ 本地服务可用性实测：start.sh 拉起全栈（backend/50110 + web/50111 + MySQL/Redis connected）；runtime 协议真 HTTP 全链路 PASS（pull 下发 DoD → 无证据提交 400 DOD_EVIDENCE_MISSING → 带证据提交 200 → 证据端点可查）；npm MCP 服务器 stdio 实测（initialize 握手 / tools/list 244 工具含 7 个闭环工具 / tools/call list_my_tasks 返回真实数据）——外部 Agent 接入通路当天可用
>
> **进展（2026-09-03）**：多 CLI Agent 引擎接入 + 开箱即用沙箱（agent-runtime）：
> - ✅ CLI 引擎抽象 src/runtime/cli_engines.py：claude（`claude -p --output-format json`，CLAUDE_PERMISSION_FLAG 可调）/ codex（`codex exec`，CODEX_FLAGS）/ opencode（`opencode run`）/ custom（CUSTOM_COMMAND 模板 {prompt} 占位 shlex 转义）四种引擎；引擎选择优先级 payload.engine > CLI_AGENT_ENGINE 环境变量 > 默认 openclaw（同 worker 可按任务混用两种后端）
> - ✅ TaskExecutor 引擎分派：CLI 引擎在任务级隔离工作区内执行（repo checkout / DoD 验证 / 租约续约复用既有机制），子进程环境经 sandbox/env.py 白名单最小化 + 提供商密钥显式注入 + 租约密钥透传不落盘；超时 kill（ENGINE_TIMEOUT）、CLI 缺失（ENGINE_NOT_INSTALLED）、非零退出（ENGINE_FAILED）归因回传；commit 的 processed_by 记录真实引擎名，co-authoring 章节标题随之标注归属
> - ✅ 开箱即用沙箱 runtimes/cli-agents/：Dockerfile（node:22-bookworm + python3.11 + claude/codex/opencode 三 CLI 预装，非 root 运行）+ entrypoint-cli.sh（引擎凭据检查，无 OpenClaw 依赖）+ docker-compose.yml（环境变量驱动，host.docker.internal 连本机平台，工作区卷可选持久化）+ README 三步接入指南
> - ✅ 测试与验证：+22 单测（argv 构造/权限旗标/JSON 结果解析/超时/非零退出/缺 CLI/租约密钥透传与杂散环境隔离/执行器路由与 OpenClaw 不误调）；对真实运行平台 LIVE E2E PASS——runtime 以 CLI_AGENT_ENGINE=custom 启动后自动拉取新建任务并执行、任务置 done、产出以「Agent 产出（custom）」章节写回协同文档；Docker 镜像实构建通过

> **进展（2026-09-05）**：项目详情页「最近动态」数据链路打通（api-server，投入使用冲刺）：
> - ✅ 审计事件项目归属单点修复：write_agent_audit 从 target_type='task' 的 target_id 派生 task_id、再按 tasks 主键派生 project_id（此前全库 48.8 万条事件两列全 NULL，详情页动态/治理 Tab 无数据可召回）；task.leased/committed/lease_released、MCP task 工具等全部 task 目标事件自动带上项目归属，budget.exceeded payload 补 task_id
> - ✅ overview 端点退回纯索引过滤：recent_events 由「全局最新 500 条 + Python 内存过滤」改为 project_id 索引直查 limit 20（正确性：全局事件量大时本项目事件被 500 条窗口挤出而漏召）
> - ✅ 存量回填迁移 000015：agent_audit_events 按 target_id → tasks 主键 join 回填 task_id/project_id（幂等，引用已删任务的行保持 NULL）
> - ✅ 验证：+6 单测（派生/显式优先/非 task 目标不误派/未知任务降级）；门禁 333 passed；本地全栈实测 overview 返回 20 条事件、详情页概览 Tab「最近动态」渲染事件类型 + 任务链接 + 时间戳（截图验收）

> **进展（2026-09-06）**：像素皮肤系统到人级别（webpage + api-server，换肤跨设备跟随）：
> - ✅ 后端：user_settings 增加 theme 列（迁移 000016，varchar(32) 默认 sky）——每个用户的界面皮肤落库；GET/PUT /user-settings 透出 theme（PUT 校验 [a-z0-9_-]{1,32}，未知 id 由前端回退默认色板）；deploy_check DEPLOY_SCHEMA_VERSION 13→16 并补 000014-000016 特征指纹（版本自检自 000014 起已滞后）；+5 单测（默认值/更新回读/格式拒绝/超长拒绝/用户间隔离），全量门禁 338 passed
> - ✅ 前端：色板定义抽离 src/theme/palettes.ts 单一事实源（PALETTES/applyPalette/applySavedPalette，PaletteSwitcher 与 Login 公开页共用）；PaletteSwitcher 三层生效——即时 CSS 变量 + localStorage（未登录快路径）+ PUT /user-settings（到人级别，失败静默降级仅本地）；挂载时先应用本地防闪烁、再以服务端值校准（跨设备真值）；vite build 门禁通过
> - ✅ 端到端实测：清空 localStorage 模拟换设备 → 重载后服务端 gameboy 皮肤自动应用（--mario-sky=#8bac0f）；页面内点击 FC 色板 → CSS 变量/localStorage/DB 三处同步为 fc（user_settings.theme user_id=1 → fc）

> **进展（2026-09-06 其二）**：皮肤库扩容 42 种 + 风格分组 + 暗色皮肤兼容层（webpage）：
> - ✅ 色板库 3 → 42 种，按 8 个风格分组（经典游戏/马里奥系列/冷色调/暖色调/自然风光/暗色夜战/粉彩糖果/黑白极简）；暗色皮肤反转墨色语义（深面板 + 浅描边文字）；所有皮肤共用同一组 CSS 变量槽位，新增皮肤零组件改动；后端 theme 列格式校验天然兼容，任何登录用户可换自己的皮肤（人级别，非管理员专属）
> - ✅ PaletteSwitcher 改为分组选择面板（Popover + 分组色块网格），服务端同步行为不变；选择器触发器显示当前皮肤色块
> - ✅ 暗色皮肤兼容层 palette-dark-compat.css（palettes.ts 副作用导入，绕开 WIP 锁定的 pixel-theme.css）：antd 硬编码 rgba(0,0,0,.88) 文字色改为跟随 --mario-black（浅色皮肤视觉等价）；金底文字/表格行悬停经 --px-on-gold/--px-row-hover 驱动（浅色皮肤回退原值）——浏览器实测暗色皮肤卡片文字对比度与金按钮深字均达标
> - ✅ 实测：面板 8 组 42 块全展示；午夜蓝（暗）/森林/碧奇粉/日光纸四皮肤切换即时生效且同步服务端（DB theme=最终值）；tsc 自有文件零错误 + vite build 通过

> **进展（2026-09-06 其三）**：皮肤库质量重构——基于著名配色方案 + WCAG 程序化验证（webpage）：
> - ✅ 推倒重选：42 个手工凑数皮肤 → 36 个映射自时间检验的配色方案（Dracula/Tokyo Night/Nord/Gruvbox/One/Catppuccin×4/Rosé Pine/Everforest/Kanagawa/GitHub/Solarized/Flexoki/PICO-8/磷光终端/Horizon 等），6 风格分组（马里奥经典/经典暗色/经典浅色/复古终端/柔和粉彩/黑白极简），品牌马里奥系保留
> - ✅ 对比度纪律：新增 scripts/validate_palettes.py（WCAG 相对亮度公式，随仓回归）——墨/面板 ≥4.5、墨/页底 ≥4.5、金底文字 ≥4.5、功能色/面板 ≥3，36 主题全部达标（初版 20 项不达标经最小修正迭代清零：功能色加深/提亮、浅色主题指定金底文字色 --px-on-gold）
> - ✅ 实测：面板 6 组 36 块全展示；德古拉（暗）/Flexoki 纸墨（浅）/磷光绿终端/黑白像素四组代表主题切换即时生效并同步服务端；tsc 自有文件零错误 + vite build 通过

> **进展（2026-09-06 其四）**：GoalLoop 目标循环——agent 朝目标自主循环干活（api-server + webpage）：
> - ✅ 产品与技术设计 docs/GOAL_LOOP_DESIGN.md（api-server）：一个循环 = 项目 + 绑定 Agent + 目标 + 完成标准；任务终态后平台驱动器自动规划下一轮并走既有 auto-assign（租约+WebSocket 推送）派发，人从「喂任务」变为「定目标看产出」
> - ✅ 后端：goal_loops 表（迁移 000017）+ goal_loop_service（CAS advancing 防并发双发；护栏=轮数上限/连续受阻计数/人工暂停停止/kick 兜底）；规划器可插拔——默认平台 LLM（feature='goal_loop'），GOAL_LOOP_PLANNER=scripted 确定性规划器供测试；REST：/projects/{id}/goal-loops + pause/resume/stop/kick（can_manage_project 门控）；触发点挂钩 runtime commit / 人工任务更新 / MCP update_task_status（非循环任务零开销）
> - ✅ 前端：治理 Tab「目标循环」卡片——列表（状态徽标/轮数/Agent/轮次任务链接/受阻原因 tooltip）、新建弹窗（目标/完成标准/轮数/Agent 选择）、暂停/继续/立即推进/停止（canManage 门控）、中英 i18n
> - ✅ 验证：11 单测 + 全量门禁 349 passed；webpage vite build 通过；真实 HTTP E2E（scripts/e2e_goal_loop.py，scripted 规划器）三轮循环完成宣告、轮数上限 limit_reached、终态后不推进、人工停止全链路通过；浏览器验收治理 Tab 卡片渲染与 UI 建循环成功
> - ⚠️ 顺带发现主干存量回归（非本轮引入）：bafa2bf 重构删除了 _is_trigger_match 定义但 api/agent_trigger_engine.py:201 调用仍在——工作区存在启用中的 task_event 触发器时任何任务更新都会 500（本地已停用遗留触发器规避）；LLM 配置模型名已修复为 LongCat-2.0（原 Flash-Lite 不被端点支持），但 key 401 失效待换有效钥匙后即可启用真实 AI 规划

> **进展（2026-09-06 其五）**：GoalLoop v2 计划式拆解 + Agent 岗位角色（api-server + webpage）：
> - ✅ 计划式拆解：创建循环时规划器先把目标拆解为有序计划（goal_loops.plan/plan_index/plan_revision，迁移 000018），逐轮物化步骤为任务；任务成功直接执行下一步（省评审调用），失败或计划耗尽触发评审（extend 扩展/重排剩余计划、complete 宣告、blocked 受阻）；scripted 规划器同步升级为计划式供 E2E
> - ✅ Agent 岗位角色具体化：agents.role_template_id 绑定既有 agent_role_templates 内置岗位（产品经理/开发/测试/架构师等 8 类已种子，不重复造层）；PUT /agents/{id} 支持绑定/解绑（内置或同工作区模板校验）；agent 详情与项目 overview 载荷携带角色；循环规划器注入执行者角色上下文，轮次任务内容带角色前缀
> - ✅ 前端：Agent 协作 Tab 角色徽标（cyan）；循环卡片计划进度标签（计划 x/y）+ 新建弹窗 Agent 选项带角色；中英 i18n
> - ✅ 验证：14 单测（计划生命周期/extend 重排/护栏/角色绑定）；全量门禁 352 passed；vite build 通过；E2E（scripted）计划 3 步拆解→逐轮→完成宣告 + 轮数护栏全绿；浏览器验收治理 Tab 计划标签、Agent 协作 Tab「产品经理」徽标渲染

> **进展（2026-09-06 其六）**：岗位角色体系扩容——121 行业 × 5817 工种（api-server）：
> - ✅ 职业分类数据集 scripts/role_taxonomy.py：121 个行业（农林牧渔/能源矿业/重工制造/汽车/半导体/建筑地产/IT互联网/金融/医疗健康/教育文化/物流/商贸零售/餐饮酒旅/专业服务/交通/公共服务/生活服务等），每行业 = 领域关键词 + 专属核心工种（带技能标签）+ 45 个行业化职能岗——非纯排列组合，职能岗均带行业业务上下文，共 5817 个工种（达标 5000~10000）
> - ✅ 数据落库：agent_role_templates.industry 列（迁移 000019，索引）；scripts/seed_role_templates.py 幂等批量 upsert（hash-slug name 稳定、按 category 模板生成 system_prompt、增量更新行业/技能/分类）；已入库 121 行业 5817 工种并抽查质量
> - ✅ API：模板列表支持 industry/keyword 过滤；新增行业清单端点（含各行业工种数，供岗位选择器按行业浏览）；7 个单测（规模 ≥100 行业/≥5000 工种、slug 唯一稳定、字段完整性、system_prompt、行业过滤）；全量门禁 359 passed
> - 📌 岗位绑定链路（上轮已建）：agents.role_template_id → 角色进规划器上下文与任务前缀；前端行业选择器（结合 industries 端点）待 AgentEditorForm 归属会话补齐

> **进展（2026-09-09）**：Agent 工作时间区间——只在指定时段接活（api-server + agent-runtime + webpage）：
> - ✅ 数据模型：agents.working_schedule JSON 列（迁移 000023）——enabled/timezone + includes/excludes 两类时间窗；窗支持 daily/weekly/monthly/dates 四种循环 + 起止时刻（跨午夜语义）+ days_of_week（1=周一）+ days_of_month（负数从月末倒数，-1=最后一天）+ months 限定 + 生效日期界限 + 每窗独立开关与名称
> - ✅ 求值服务 services/agent_working_schedule.py：写路径严格校验（normalize/validate）；求值 = includes 并集（空=全天候）减 excludes，IANA 时区墙钟匹配（zoneinfo），next_working_window 边界扫描给出下次开窗精确时刻；脏数据 fail-open 不阻断派发
> - ✅ 平台门禁：auto_assign_task 跳过窗外 Agent（任务留 TODO，开窗后 pull 兜底）；pull 返回 working_window.blocked + next_window_at；协作侧 claim 返回 409 AGENT_OUT_OF_WORKING_WINDOW；进行中任务不受影响（只拦新派发）
> - ✅ 下发通道：introspect agent.working_schedule + 每次 pull 的 agent_profile.working_schedule，运行时无需新增拉取调用
> - ✅ agent-runtime：working_windows.py 同语义求值器（镜像副本）+ 轮询预检（窗外不白发请求，等待 next_window_at、上限 60s 保证配置变更快速生效）+ WS 推送纵深防御 + pull_tasks_detail 保留完整响应
> - ✅ webpage：Agent 编辑页新增「工作时间」Tab——结构化编辑器（四类循环/时刻/星期/月日/月份/日期界限/时区/快捷预设）+ 保存前客户端校验 + 防抖实时预览（preview 端点显示当前是否在区间内与下次开始时间）；中英 i18n
> - ✅ 专用端点：GET/PUT /agents/{id}/working-schedule + POST .../preview；workspace 侧 PATCH /workspaces/{wid}/agents/{id} 同样支持并校验
> - ✅ 验证：api-server 54 新测试（全量门禁 1758 passed，剩余失败为已验证的 SSO/SAML 既有失败）；agent-runtime 16 新测试（仅存记录在案的 test_api_client 既有基线）；webpage tsc -b 193→190（净修 3 个既有错误，零新增）+ vite build 通过
1. **P1.1 GitHub App spike**：申请 GitHub App，打通"项目绑定仓库 + 自动开 PR"最小路径（`api/github_proxy.py` 升级为读写）。
2. **P1.2 DoD 数据模型设计**：`Task` 增加 `dod`（结构化验收标准）与 `evidence`（证据附件）字段，commit 协议加 `evidence` 必填分支（向后兼容开关）。
3. **P1.4 MCP 扩容清单评审**：从 6 → 18 的工具列表按 P1 清单定稿，先加 `claim_task` / `report_progress` / `get_verification_result` 三个。
4. **数据闭环埋点**：从现在起记录每个任务"人工干预次数"字段，为 ACR 指标积累基线数据。

> **进展（2026-09-10）**：Agent 平台主动性三件套——定时调度、定时建任务、任务拆解/规划主动角色（api-server + webpage）：
> - ✅ 审计结论：cron 触发器模型与 CRUD API 早已在，但调度器只是独立脚本且未挂 pm2——生产上 cron 触发器从不触发；task_event 触发链路因 `_is_trigger_match` 函数头丢失全部 NameError（2026-09-06 发现的存量回归本轮修复）；Agent 级触发器有 API 无 UI；内置角色 8 个无"拆解/规划/调度"主动岗位
> - ✅ 存量修复：api/agent_trigger_engine.py 补回 `_is_trigger_match` 函数定义（孤儿函数体归位），task_event 触发器恢复工作；+7 回归测试锁死（事件匹配/项目/标签/状态迁移过滤/幂等/停用）
> - ✅ 定时调度常驻：core/agent_cron_scheduler.py 守护线程（AGENT_CRON_SCHEDULER_ENABLED 门控、interval 可调、多 worker 单开），app.py 挂载，独立脚本改薄壳共享同一 tick；到期扫描→派发动作→推进 next_fire_at，幂等键防重
> - ✅ 定时创建任务：触发器新增 action 字段（迁移 000023：action/action_payload/last_fired_key）——run_agent（原行为）与 create_task（到点自动在指定项目创建任务，带标题/描述/优先级/标签，工作区校验，创建后 emit task.created 联动下游触发器）；CRUD 校验分支 +12 测试
> - ✅ 主动角色 seed：内置新增 task-planner 任务规划师（模糊目标→结构化拆解+依赖+DoD，假设先行不空等）与 task-dispatcher 任务调度师（巡检任务池/异常升级/负载均衡），已灌库（builtin 10 个）
> - ✅ 前端：Agent 详情新增「触发器」Tab——列表（类型/动作/触发条件/下次触发/启停）、新建表单（task_event 事件多选；cron 表达式 + 动作选择 + create_task 任务模板字段）、中英 i18n；tsc 自有文件零错误 + vite build 通过
> - ✅ 验证：api-server 全量门禁 1787 passed（+27）；真实 HTTP E2E：worktree 后端 :50113（AGENT_CRON_SCHEDULER_ENABLED=true）建两个每分钟 cron 触发器——cron.tick AgentRun 产生、定时任务落库、next_fire_at 推进全链路 PASS；本地库已应用迁移 000023
> - ⏭️ 待办：本地 pm2 backend 带 AGENT_CRON_SCHEDULER_ENABLED=true 重启后 cron 调度即常驻生效；AgentEditorForm 角色模板选择器仍归原属会话；LLM key 401 换新后 planner 角色 + ai-split 可做"任务创建即自动拆解"的联动闭环

> **进展（2026-09-10 其二）**：多 Agent 编排——并发上限 + 预算感知派发 + 负载均衡选 Agent（api-server + webpage）：
> - ✅ 编排并发上限（"最多多少个 Agent 同时干活"的统一入口）：workspace_runtime_settings.max_concurrent_agents（迁移 000024）——按未过期活跃租约的 distinct Agent 计数，NULL=系统默认 5（Config.ORCHESTRATION_MAX_CONCURRENT_AGENTS 可覆盖）、0=不限；已在岗者可继续接任务，新 Agent 等容量释放；GET/PUT /workspaces/{id}/runtime/settings 携带该字段 + 当前活跃数水位
> - ✅ 派发三道门统一到所有路径（工作时间区间 → token/时长预算 → 编排并发）：auto_assign_task 原先"第一个活跃 Agent"且完全绕过预算，现逐候选过滤（超预算 raise_budget_exceeded 走审批队列并跳过）、按活跃租约数升序负载均衡选 Agent——任务自动摊开到多个 Agent 而非堆在一个人身上；pull 路径到容量上限返回 orchestration.blocked（在岗者不受影响）；goal_loop 派发同步接预算与容量门（挡下不派，任务留 TODO 由 pull 兜底恢复）
> - ✅ 编排拆分强化（goal_loop 多 Agent 路由）：executor_pool 过滤工作时间区间外执行者（避免白派一轮）；pick_executor 岗位匹配到多人时选最闲者——计划步骤真正并行摊到多 Agent
> - ✅ webpage：组织详情新增「运行时」Tab——同时干活 Agent 上限 / Pod 上限 / 空闲回收阈值表单 + 「正在干活 x/上限」实时水位条；中英 tab 标签
> - ✅ 验证：api-server 新增 18 测试（容量语义/负载摊开/容量挡下/预算挡下/goal_loop 路由），全量门禁 1856 passed；webpage tsc 自有文件零错误 + vite build 通过

> **进展（2026-09-10 其三）**：存储层体检 + 热路径复合索引（api-server）：
> - ✅ 引擎确认：存储层为 MySQL（mysql+pymysql / PyMySQL 1.1.0，本地活库 26.7.0，99 表全 InnoDB+utf8mb4），无任何 PostgreSQL 依赖（旧迁移里的 postgres 分支仅是方言兼容代码）；连接池已带 pre_ping/recycle(300s)/pool_size 10 + overflow 20
> - ✅ 活库 EXPLAIN 审计三缺口并补复合索引（迁移 000025 + 模型 __table_args__ 双侧对齐，幂等可重跑）：agent_task_leases(workspace_id,active,expires_at,agent_id)——工作区「正在干活」水位门禁由 expires_at 范围扫描+临时表变覆盖索引扫描；agent_task_leases(agent_id,active,expires_at)——在岗计数/预算 concurrent 用量变覆盖索引；agent_heartbeats(agent_id,created_at)——最新心跳从全表扫描 9352 行+filesort 变索引逆序直取（该表随心跳无限增长，收益随时间放大）
> - ✅ 索引已在本地活库应用并 EXPLAIN 前后对比验证；+3 索引存在性回归测试；全量门禁 1859 passed 全绿
> - ⚠️ 待用户确认：perf_task_ids 压测残留 750 万行 / 490MB（tasks 正表的 10 倍体积），TRUNCATE 即可回收，等确认后执行

> **进展（2026-09-10 其四）**：Agent 运行时环境可插拔抽象——k8s / docker / compose / baremetal 四后端（api-server）：
> - ✅ 抽象：services/runtime_env/base.py 定义 RuntimeProvider 接口与归一化状态契约（phase/agent_id/workspace_id/started_at，phase ∈ Running|Pending|Succeeded|Failed|Unknown），ensure_runtime 模板方法统一"幂等确保 + 工作区实例上限"流程；工厂 get_runtime_provider() 按 RUNTIME_PROVIDER 配置选择后端
> - ✅ 四后端：k8s = 既有控制器原逻辑（Secret 注入/共享 PVC/gVisor/Pod 配额，行为不变）；docker = 每 Agent 一容器（docker CLI 驱动零新依赖，labels + 沙箱档位映射 --cpus/--memory/--pids-limit，环境变量镜像 manifests 语义）；compose = 每 Agent 一份生成的 compose 文件（可审计可手工接管）+ compose 项目生命周期；baremetal = 宿主进程 + PID 注册表（进程组终止，未显式配置命令/工作目录时拒绝 spawn）
> - ✅ 关键解耦：kubernetes 包改为惰性导入——docker/compose/baremetal 部署不再需要安装 kubernetes SDK（sys.modules 阻断探针验证）
> - ✅ 调用方统一：运行时管理 API、GoalLoop 编排联动（ensure_cloud_executor）、空闲回收看门狗全部改走 get_runtime_provider()；派发逻辑 auto_assign_task 与后端无关；API 响应保留历史键名（pods/pod）向后兼容
> - ✅ 验证：+15 后端测试（CLI 全打桩，不依赖本机 Docker）+ 存量测试迁移到 provider 契约；全量门禁 1876 passed 全绿；后端选择文档 docs/RUNTIME_ENV_PROVIDERS.md

> **进展（2026-09-13）**：长跑模式（Endurance）一期——循环不再被失败挂死，租约/护栏全面可配（api-server + agent-runtime）：
> - ✅ 根因治理：循环任务 failed 提交曾置 REVIEW（活跃态）→ GoalLoop 状态机永远等待 → 一轮失败循环挂死；现在循环任务失败直接置 CANCELLED 终态并关闭修复子任务通道，由 maybe_advance 推进规划器评审（LLM 评审 extend 换思路重试 / blocked 计 stall，连续失败到 stall_limit 才 STALLED 护栏兜底）；非循环任务维持 REVIEW+自愈原语义（回归用例保护）
> - ✅ 评审上下文增强：recent_history 对 cancelled 轮附带最近一次失败归因（failure_code: reason），规划器重规划有据可依
> - ✅ 租约 TTL 统一走配置：新增 services/lease_policy.py（Agent 激活配置 > LEASE_DURATION_SECONDS env > 120s，钳制 60..3600），接线 pull 建约/续约、GoalLoop 派发、auto_assign 四处 60s 硬编码——60s 租约曾是静默杀手，续约一抖动成果作废
> - ✅ 续约容错（agent-runtime）：续约循环首次异常即 break → 改为退避重试（2^n 封顶 10s），连续失败 ≥4（约 2 倍租约时长窗口，覆盖平台重启）才放弃；成功复位计数器
> - ✅ 部署级护栏缺省可调：GOAL_LOOP_DEFAULT_ROUNDS_LIMIT / GOAL_LOOP_DEFAULT_STALL_LIMIT / GOAL_LOOP_STUCK_TASK_HOURS / FAILURE_REPAIR_MAX_ATTEMPTS / LEASE_DURATION_SECONDS——「迭代 100 个版本」「连续跑三天」成为部署级一等配置
> - ✅ 验证：api-server 全量门禁 2249 passed（含 +15 新用例）、agent-runtime 616 passed（含 +4 续约用例）；长跑设计文档 docs/ENDURANCE_MODE_DESIGN.md（根因清单/部署配方/后续路线：轮次上下文延续、turn 级续跑接线、质量闭环硬化）

> **进展（2026-09-13 其二）**：长跑模式（Endurance）二期——优雅停车两件套：额度熔断 + 死循环退出点（api-server）：
> - ✅ 额度熔断（用户配置的 LLM API token 没额度了怎么停）：新增归因类别 quota_exhausted（QUOTA_EXCEEDED/INSUFFICIENT_QUOTA/BILLING/PAYMENT_REQUIRED 等 failure_code + insufficient_quota/credit balance/payment required 等关键词，与可重试的 429 限流区分）；该类别为不可重试资源级故障——跳过修复子任务与重试封顶直接升级；新增 services/quota_guard.py：写 token_quota_exhausted interaction_request 上报用户（审批队列/open 协议可见，附「请充值或更换 key」提示，一窗口一 Agent 幂等），并在 pull/auto_assign/goal_loop dispatch 三道派发门熔断该 Agent（QUOTA_BLOCK_WINDOW_HOURS 默认 24h，过后换 key/充值即自愈）；循环任务的额度耗尽失败 → 循环立即 STALLED（last_error 写明额度耗尽），不进规划器空转
> - ✅ 无进展护栏（用户要"死循环"也必须有退出点）：query.trailing_failure_streak 末尾连续失败轮数；状态机 extend 分支连续失败 ≥ GOAL_LOOP_NO_PROGRESS_LIMIT（默认 3，env 可调）拒绝 extend 强制计 stall（规划器宣告 complete 仍允许）→ 连续两次 STALLED 终态退出，杜绝规划器无限 extend 空转烧预算
> - ✅ 验证：+11 用例（归因/升级/上报幂等/窗口自愈/三道门/循环停车/extend 拒绝与 complete 放行），全量门禁 2260 passed；设计文档 docs/ENDURANCE_MODE_DESIGN.md §8

> **进展（2026-09-13 其三）**：长跑模式（Endurance）三期——循环上下文走廊与自动压缩（api-server）：
> - ✅ 问题：轮次任务逐轮物化但执行者「失忆」（不知道前几轮干了什么/失败过什么），全量塞历史又随轮数无限膨胀烧 token；R2 服务侧就此落地
> - ✅ 三层走廊注入每个轮次任务内容顶部（create_round_task，pull/push 派发自动携带）：目标层（goal_text+done_definition 每轮必带防跑偏）/ 压缩层（早期轮次滚动压缩摘要）/ 明细层（最近 3 轮保留标题+状态+失败归因）；首轮零开销
> - ✅ 滚动自动压缩：goal_loops.context_digest（迁移 000025，双方言+幂等冒烟）；每累积 GOAL_LOOP_COMPRESS_EVERY（默认 3）个新终态轮刷一次，状态机物化下一轮前调用；LLM 语义压缩（JSON digest）失败/无 key 自动降级抽取式——长跑记忆不因 LLM 故障断档；context_digest_upto 游标增量幂等；任何异常只记日志不阻断推进
> - ✅ 自动清理的确定性保证：走廊整体硬上界 6000 字符（超限先裁明细再硬截），注入 prompt 的上下文规模有确定上界
> - ✅ 验证：+12 用例（走廊三层/空历史零开销/硬上界/压缩增量幂等/LLM 与降级/节奏/异常不阻断/注入与首轮豁免），全量门禁 exit 0；设计文档 docs/ENDURANCE_MODE_DESIGN.md §9

> **进展（2026-09-13 其四）**：Agent 记忆管理——框架评估决策 + 可插拔记忆层 Phase 1（api-server）：
> - ✅ 评估决策（docs/AGENT_MEMORY_DESIGN.md）：平台记忆基建盘点结论=写入/治理/消费三层已完整（AgentExperience 衰减共享交叉验证、知识提案确认管线、SoulVersion 记忆治理、skill_profile 进派单打分、循环走廊），缺的是「语义检索+自动注入」最后一公里；开源框架对比（mem0 Apache-2.0 / Graphiti / Letta / cognee / LangMem）后决策=**不整体引入**（Letta 是完整 agent 服务器会架空自有 runtime、Graphiti/cognee 需新增图数据库），改为**可插拔记忆层**：自建为底、mem0 为可选语义后端（Redis 向量后端复用现有 Redis）
> - ✅ services/memory/：MemoryHit 统一形状 + get_memory_backend() 工厂（AGENT_MEMORY_BACKEND=builtin|mem0，mem0 不可用双重自动回退 builtin）+ recall_for_query()（异常永不阻断业务主链路）；builtin 后端=AgentExperience+KnowledgeEntry 词面召回（CJK 二元切分适配中文、多关键词去重加权、置信度×复用排序）
> - ✅ 自动注入：create_round_task 按步骤文本召回 top-K 记忆注入【相关记忆】块（首轮也注入、800 字符钳制、失败静默跳过不阻断派发）；成功经验写入：循环 DONE 落 success_pattern 经验（与失败路径对称，达成策略不再丢失）
> - ✅ 验证：+11 用例（召回/排序/回退/永不抛异常/注入/首轮/失败不阻断/成功经验），全量门禁 2283 passed

> **进展（2026-09-13 其五）**：记忆层 Phase 1.5——专用模块 + 五维度作用域隔离（api-server）：
> - ✅ 专用存储：agent_memories 表（迁移 000026），一行记忆 = (organization_id, scope_type, scope_id) 下的一条可检索事实；五维度=session(会话/一次循环运行)→project(项目持久教训)→agent(个人经验)→user(用户偏好)→organization(组织惯例)，优先级从具体到一般
> - ✅ 硬隔离：每行强制 organization_id（跨组织永不可见，测试断言）；user 记忆 per-org（同一用户在组织 A 的记忆不泄漏到组织 B）；继承链只能由 scopes.py 构造器从归属已验证实体推导，无法手工拼越权组合；(org,scope,scope_id,dedupe_key) 唯一索引幂等去重，重复验证升置信度
> - ✅ 作用域化召回注入：store.recall 沿继承链按优先级合并、命中带 [项目记忆]/[组织记忆] 等维度标签、access_count 学习信号；create_round_task 注入改走作用域召回（无命中回退经验/知识库词面召回）
> - ✅ 生命周期自动沉淀 loop_hooks：循环 DONE→会话级总结+项目级持久结论；STALLED（无进展护栏/规划器受阻）→项目级受阻教训；额度停车→项目级额度教训——同类目标重跑时被召回避免重蹈覆辙；全部 try/except 不影响循环状态流转
> - ✅ 验证：+11 用例（跨组织不可见/user per-org/链顺序/优先级合并/去重幂等/三类写入/注入标签/隔离注入），全量门禁 2294 passed；迁移 SQLite/MySQL 双方言幂等冒烟；设计文档 AGENT_MEMORY_DESIGN.md §5

> **进展（2026-09-13 其六）**：记忆开放用户自编辑 + 规划器瞬时故障退避（api-server）：
> - ✅ 记忆用户 API（Phase 2）：六端点开放记忆模块给用户自管理——GET/POST /memory（分页列表/新建）、GET/PUT/DELETE /memory/{id}（查看/编辑/软删遗忘）、POST /memory/recall（召回预览，带维度标签、不写 access_count）；授权矩阵按维度收口：organization=org owner/admin、project=owner/maintainer、agent=agent owner 或 org 管理员、user=仅本人、session=系统托管拒绝手写（SESSION_SCOPE_SYSTEM_MANAGED）
> - ✅ 人工信任信号：human_edited 列（迁移 000027）标记人工创建/编辑的记忆，召回排序加权（confidence +10 加成），去重命中同标题+内容时自动升级标记；store 补 list/get/update/forget_by_id（软删 is_valid=0，幂等）
> - ✅ 修复迁移 000026 MySQL 隐患：agent_memories.source_task_id INT→BIGINT（tasks.id 为 BIGINT，FK 类型不兼容会让 MySQL 部署建表直接失败，SQLite 测试测不出）——未部署过该迁移的环境原地修 DDL，已创建 scratch 库 E2E 验证 000026+000027 双向迁移
> - ✅ 长跑 v4 规划器瞬时故障退避：LLM 供应商抖动（网络/超时/5xx/限流）此前直接烧 stall_limit（默认 2）——一次约 10 分钟的供应商故障把全平台 RUNNING 循环打成 STALLED 只能逐个人工 resume；现在瞬时故障按指数退避自愈（transient_streak/retry_after 迁移 000028，5min→10→20→40→封顶 1h），退避窗口内 watchdog/钩子/kick 推进请求入口快速跳过，不消耗受阻预算；密钥/额度类（401/403/quota/billing）与坏输出类仍按硬故障立即计 stall 快速暴露给人；连续瞬时故障达 GOAL_PLANNER_TRANSIENT_LIMIT（默认 12，约扛 8~12 小时级事故）回落既有 STALLED 人工出口；成功推进/人工 pause/resume 清零；to_dict 透出退避截止时间供前端显示
> - ✅ 验证：+25 用例（记忆 API 授权矩阵/租户边界/去重/编辑/软删/召回预览/human_edited 偏好 + 退避调度/分类边界/窗口跳过/自愈/回落/resume 清零），全量门禁 2319 passed；ENDURANCE_MODE_DESIGN §10、AGENT_MEMORY_DESIGN §6

> **进展（2026-09-13 其七）**：目标链式接续 + 派发工作时间窗门（api-server，长跑 v5）：
> - ✅ 链式接续（Agent 断档的最后一公里）：单循环到终态后 Agent 闲置——现在循环可带 successor_loop_id（迁移 000029，自引用 FK），前驱到终态的四条路径（done/limit_reached/stalled/stopped）同步 CAS 提升 PAUSED 后继并推进第一轮；A→B→C 链起来即 FIFO 目标流水线；人工 PAUSED 不提升（挂起是故意的）、人工 stop 只停这个目标不停流水线
> - ✅ 提升可靠性：CAS（status=PAUSED 才 update）防并发双唤醒；后继若也立刻终态则递归接续（MAX_CHAIN_DEPTH=32 封顶，超限由看门狗漏触发自愈兜底）；提升失败只记日志绝不影响前驱终态；不新增 QUEUED 状态（后继以 PAUSED 挂起，避免双方言 enum 手术）
> - ✅ API：创建时 chain_next 内联规格（agent/director/护栏缺省继承父循环）或 successor_loop_id 直引既有 PAUSED 循环；PUT successor_loop_id 改链/清链；校验存在/非自身/非终态且 PAUSED/同工作区/沿链不成环
> - ✅ 派发工作时间窗门（顺手修）：assign_task_to_agent 此前缺窗门，pick_executor 兜底回退绑定 Agent 时绕过在岗判断立即建租约推送；现补第四道门（窗外不派、任务留 TODO、开窗后 pull 兜底、fail-open）
> - ✅ 验证：+12 用例（创建/直引/校验/四终态提升/暂停不提升/三环链传递/改清链/成环拒绝/终态拒绝/窗口门），全量门禁 2331 passed；迁移 000029 MySQL scratch 库 E2E（FK 约束+双向）；ENDURANCE_MODE_DESIGN §11

> **进展（2026-09-13 其八）**：CLI 引擎正式接线 + 会话接续/turn-level continuation（agent-runtime）：
> - ✅ CLI 引擎接入主干：claude/codex/opencode/custom 四引擎可插拔执行引擎（此前只有沙箱/镜像侧就绪）——build_argv 规则表 + provider 密钥显式注入 + 租约 env 透传；引擎优先级 payload.engine > CLI_AGENT_ENGINE env > openclaw；task_executor 分派 CLI 引擎（进度/结果事件、DoD 门、commit 协议不变）；runtimes/cli-agents 容器沙箱随迁（此前 LIVE E2E 已通）
> - ✅ 会话接续（Agent 断档重跑的最后一块）：CLI 任务一次 attempt 失败即从零重跑——现在失败/取消的工作区保留（workspace.preserve：保留区数量上限 AGENT_RUNTIME_CONTINUITY_KEEP=5 + TTL 24h，敏感材料不无限期落盘），下次 attempt restore 取回文件与引擎会话锚点；claude 从 JSON 输出捕获 session_id 落锚点，重试以 --resume <session> 在原对话上下文续跑（codex/opencode 有文件级接续）；AGENT_RUNTIME_CONTINUITY=false 可关；repo 任务不保留（需 patch 桥，后续）
> - ✅ 顺手补齐：迁移自旧基线时把 fe42a03 的租约续约退避重试语义带回（旧 checkout 落后一个提交）
> - ✅ 验证：+13 接续用例（preserve/restore 生命周期/上限淘汰/关闭开关/失败保留→续跑全链路/成功不保留/repo 不保留/锚点引擎校验/--resume argv/端到端 fake claude），agent-runtime 全量门禁 592 passed

> **进展（2026-09-13 其九）**：任务图依赖感知派发——多 Agent 按 blocked_by 顺序协作（api-server）：
> - ✅ 依赖门：epic 展开/批量编辑写入的 blocked_by 此前只有写入与展示，runtime pull 派发完全不消费——多 Agent 并发拉取会提前领到前置未完成的任务，任务图（目标任务图/手工依赖）执行顺序失效；现 _fetch_next_task 跳过依赖未解除的候选（阻塞者到 DONE/CANCELLED 终态即解除）——排序约束语义：阻塞者取消即解除、是否连带取消下游由规划者裁决；失效引用（已删任务/脏数据）容忍，不卡死派发
> - ✅ 可观测性：pull 响应存在非零依赖跳过时附 dependency_gate（blocked/skipped_blocked）——Agent/调用方可理解「明明有 TODO 却空手而归」；工作时间窗/并发容量/预算门语义不变（预算按首个未阻塞任务计）
> - ✅ 验证：+12 用例（TODO/IN_PROGRESS 阻塞者挂起、DONE/CANCELLED 终态解除、部分完成多阻塞者、失效与脏引用容忍、绕行派发、多轮派发下游绝不误派、解除后恢复），api-server 全量门禁 2336 passed（d93af66）

> **进展（2026-09-13 其十）**：任务图（DAG）读写成套——防环 + 可视化，Agent 行动规划以有向图为一等公民（api-server + webpage）：
> - ✅ 写侧防环：PUT /tasks/&lt;id&gt;/dependencies 拒绝自依赖与传递成环——环 = 依赖门下互相等待、永久无法派发；环检测方向语义为「从新阻塞者沿 blocked_by 前置链能走回目标任务」（services/task_graph.find_dependency_cycle）；goal_decomposition 对 LLM 输出的 depends_on 逐边校验，成环边丢弃保持任务图无环（api-server e31e657）
> - ✅ 读侧端点：GET /tasks/projects/&lt;id&gt;/task-graph（owner/admin/active 成员可读）——节点含 readiness 就绪态（ready/blocked/done/cancelled，与派发门同语义：阻塞者到终态即解除、失效引用视为解除）、unresolved_blockers、epic_id/assignees；边为项目内有向依赖；cycles 报 Tarjan SCC 环组（含自环，迭代实现）；stats 汇总 + 超 500 节点 truncated 标记——供前端 DAG 可视化与外部编排方消费
> - ✅ 前端可视化：项目详情新增「任务图」Tab（webpage 2c3ad8a）——纯 React+SVG 分层 DAG（最长链分层、贝塞尔连线、环边红色高亮，无新依赖）；节点即任务卡片点击跳详情；就绪态四色 ready 蓝/blocked 橙/done 绿/cancelled 灰；统计条 + 环警示横幅 + 截断标记；zh/en i18n
> - ✅ 验证：api-server +16 用例（防环矩阵/端点权限/就绪态矩阵/跨项目阻塞者/环组可见性/分解成环边丢弃）全量 2352 passed；webpage vite build 通过

> **进展（2026-09-13 其十一）**：任务图实况化——WebSocket 推送驱动 DAG 自动刷新，多 Agent 执行可现场观看（api-server + webpage）：
> - ✅ 项目房间：/user/ws 新增 join_project/leave_project + push_to_project + notify_task_graph_changed（project_id 缺失/推送异常容错不抛——图刷新是锦上添花，不打断状态翻转主链路）（api-server abdd683）
> - ✅ 五个推送挂点：依赖编辑（dependencies_changed）、批量状态（batch_status_changed 按项目分组）、人工状态变更（status_changed）、Agent commit（agent_commit:&lt;final_status&gt;，多 Agent 执行的主推进时刻）、MCP update_task_status（mcp_status_changed）——外部 CLI Agent/平台内 Agent/人三条协作面的翻转都驱动图刷新
> - ✅ 顺手修批量状态既有 bug：裸字符串直接赋值 Enum 列，按 value 传 'done' 触发 KeyError 500（只有 name 'DONE' 碰巧可用）——统一 name/value 双兼容 + 非法值 400
> - ✅ 前端实况：websocketService 转发 task_graph_changed + joinProjectRoom/leaveProjectRoom；useProjectGraphRealtime hook（300ms 去抖合并事件风暴）；TaskGraphTab 实时状态指示（绿点=已连接/灰点=离线）+ 就绪态图例 + 阶段标题行（第 N 阶段 · 任务数）（webpage b1b23b8）
> - ✅ dev 代理修复：vite 补 /socket.io（ws: true）透传——此前本地 dev 下 WebSocket 实时推送一直不可用；/todo-for-ai/api 代理目标支持 VITE_API_PROXY_TARGET 覆盖，并行验证非默认端口后端无需改代码（webpage e887a0d）
> - ✅ 端到端实测（本地平台）：建 1→2,3→4 依赖链 → task-graph 端点就绪态正确 → 浏览器打开任务图 Tab 渲染分层 DAG（阶段列/贝塞尔连线/四色就绪态/实时绿标）→ **API 翻转阶段 1 任务为 done，页面不刷新，2.5s 内图自动变化**：阶段 1 变绿已完成、阶段 2 两任务解锁变蓝可派发、阶段 3 仍被阻塞、统计 1/3→2/1/1——DAG 并行解锁语义实况可视化，截图验收 PASS；api-server 全量门禁 2359 passed

> **进展（2026-09-13 其十二）**：任务图可视化重写——React Flow + dagre 专业 DAG 渲染（webpage）：
> - ✅ 手写分层 SVG 换专门图可视化栈：@xyflow/react 12 + @dagrejs/dagre 1.1——LR 自动分层、smoothstep 圆角连线、箭头闭合、缩放/平移、点阵背景、就绪态着色小地图，大型任务图（epic 展开几十任务）自由缩放导航（webpage db44527）
> - ✅ 节点卡片：就绪态色标+标签+编号，环上节点红描边 + ↻ cycle 徽标，已完成打勾；边着色语义：done→下游绿色流动动画（多 Agent 推进可见）、环边红色流动、其余灰实线
> - ✅ 坑与修复：@dagrejs/dagre（1.x 与 3.x 实测同病）`setEdge` 必须显式传 label 对象，缺 label 时 layout 写 points 直接 TypeError 崩掉整页（React 无路由级 error boundary → root 清空白屏）；锁 1.1.4。preview 代理目标支持 VITE_API_PROXY_TARGET（与 server 一致）
> - ✅ 并行验证基建教训：两个 vite dev server 共享同一 node_modules/.vite 依赖缓存会互踩（一方重优化另一方运行时加载失败白屏）——并行验证用 `vite preview`（跑构建产物无预构建）+ 独立后端实例最稳；npm 缓存 EACCES 用 --cache /tmp/xxx 绕开
> - ✅ 验证：vite build 通过 + vitest 35 passed；本地平台截图验收——done 绿卡打勾、绿色流动边、ready 蓝/blocked 橙、汇流分叉与阻塞传播一目了然

> **进展（2026-09-14 其十三）**：任务图「指挥中枢」——DAG 页面成体系化，功能从堆砌到联动（webpage）：
> - ✅ 依赖链聚焦：单击节点选中——传递上游/下游全链高亮（链上边蓝色流动动画、链外节点与边淡出、小地图同步置灰），聚焦条显示 上游 N · 下游 M，Esc/点空白/一键清除；双击跳任务详情页（webpage a20fcb9）
> - ✅ 图例=筛选=统计三合一：原「统计标签 + 图例」两排重复展示合并为一排可点筛选芯片（带计数，点击按就绪态淡出未命中节点，可多选可重置）；右侧就绪态占比进度条同源同点击——同一份 stats 驱动三种视图
> - ✅ 详情抽屉：选中即出——就绪态/状态/优先级/AI 标签、执行 Agent 徽标（点击直达 Agent 详情页）、前置依赖清单（已解除 ✓/阻塞中 🕐/失效引用提示，点击依赖项图聚焦随动跳转）、上下文状态操作（标记完成/取消/重新打开 → PUT /tasks → WebSocket 推送 → 图/芯片/聚焦自动刷新）、打开任务详情页
> - ✅ 节点卡片升级：Agent 指派 🤖×N 徽标；纯逻辑下沉 taskGraphModel.ts（链计算/筛选判定/dagre 布局）+ TaskNodeCard/TaskDetailDrawer 拆分（单文件 ≤290 行）；taskGraph 节点 assignees 类型修正为 {type,id,name}（与后端写侧一致）
> - ✅ 验证：vite build + vitest 44 passed（新增 taskGraphModel 单测：菱形链计算/环安全/跨项目边/Agent 提取/聚焦与筛选视觉态/布局方向/统计分段）；本地平台 E2E 截图验收——筛选态仅 blocked 高亮、选中 10666108 聚焦链（上游 3）+ 抽屉依赖清单、点依赖跳 10666107（Agent 徽标可见）、抽屉点「标记完成」→ 图实时刷新（绿 ✓/下游解锁变蓝/芯片计数同步/聚焦保持）

> **进展（2026-09-15）**：代码质量马拉松第 122 轮——协作图指针交互 hook 化收官（webpage + 日志）：
> - ✅ CollaborationGraphView 597 → 439：抽 useGraphInteraction（拖拽覆盖+localStorage 持久化+背景平移+滚轮缩放，133 行）与 GraphDefs/GraphLegends 纯静态组件；该文件自此达标出队（渲染/交互/图例/力导向/共享逻辑全模块化）
> - ✅ 新模块单测 100% 行/分支/函数覆盖（13 用例）；webpage 测试 246 → 262；tsc + build 三绿（webpage a559d66，api-server 492c21a 日志）
> - ⏭ 剩余 >500 行：Agents.tsx 1508、useWorkflowsData.tsx 574

> **进展（2026-09-15 其二）**：代码质量马拉松第 123 轮——工作流页数据层按域拆分收官（webpage + 日志）：
> - ✅ useWorkflowsData 574 → 273 组合根 + 四域 hook（分析扇出/触发器/版本/模板，50-91 行/个）；跨域经 loadData 注入零耦合；顺带清死 imports 与死常量副本
> - ✅ 返回键集契约测试（118 键）+ 全处理器成败分支，五文件 100% 行覆盖；webpage 测试 262 → 284；tsc + build 三绿（webpage 976c87f，api-server aac495a 日志）
> - ⏭ 剩余 >500 行：Agents.tsx 1508

> **进展（2026-09-15 其三）**：代码质量马拉松第 124 轮——Agents.tsx 拆解第一刀（webpage + 日志）：
> - ✅ 1508 → 1207：步骤重配置域 hook（79 行）+ 冲突解决域 hook（102 行，均零 ctx 自包含）+ 表格列构建器 buildAgentsTableColumns(ctx)（249 行，15 处理器显式注入）
> - ✅ 新模块 100% 行/函数覆盖（16 用例含 RTL 按钮点击矩阵）；webpage 测试 284 → 300；tsc + build 三绿（webpage a5208c1，api-server 040ac5c 日志）
> - ⏭ Agents.tsx 剩余 ~1207 行，下一刀拆 JSX 面板组件

> **进展（2026-09-15 其四）**：代码质量马拉松第 125 轮——Agents.tsx 第二刀（webpage + 日志）：
> - ✅ 1207 → 1045：CRUD/广播/声誉域 hook useAgentCrudActions（203 行，17 状态 + 10 处理器，selectedAgent 注入）；100% 行/函数覆盖（8 用例）；webpage 测试 300 → 308；tsc + build 三绿（webpage e2c123b，api-server fb6c35f 日志）
> - ⏭ Agents.tsx 剩余 1045，下一刀 effects/通知域 + JSX 组合

> **进展（2026-09-15 其五）**：代码质量马拉松第 126 轮——Agents.tsx 第三刀（webpage + 日志）：
> - ✅ 1045 → 956：实时看板域 hook useAgentLiveDashboard（154 行：10s 刷新/60s 自动派活/SSE 通知与事件流/看板统计）；100% 行/函数覆盖（6 用例 fake timers + SSE 桩）；webpage 测试 308 → 314；tsc + build 三绿（webpage df65360，api-server b996148 日志）
> - ⏭ Agents.tsx 剩余 956，下一刀收尾：零散处理器 + JSX 组合层

> **进展（2026-09-15 其六）**：代码质量马拉松第 127 轮——Agents.tsx 视图层拆分（webpage + 日志）：
> - ✅ 956 → 824 组合根：视图拆为 BoardSection(291)/OpsModals(443)/CollabModals(378) + 共享 props 类型(282)；props 机械提取、JSX 原样搬移。**Agents.tsx 簇终态：1508 单文件 → 组合根 + 13 个 100% 覆盖领域 hooks + 4 个 ≤500 视图组件**（webpage 409b443，api-server 07b1bed 日志）
> - ⏭ 主文件剩余 ~290 行 props 清单可改 bag/context 传递进 ≤500；api-server 大文件队列待启动

> **进展（2026-09-15 其七）**：代码质量马拉松第 128 轮——api-server 最大源文件拆包 + 越权修复（api-server + 日志）：
> - ✅ project_repo.py 1016 行 → api/project_repo/ 包（_shared/binding/pull_requests/lifecycle + 兼容 shim），GitHubClient mock 语义保留，补历史覆盖欠账 59 用例（含审批执行/校验/兜底全分支）
> - ✅ **修越权 bug**：list_pending_pr_approvals 的 `current_user.is_admin` 缺括号（方法恒真）→ 任何用户可见全库待审批 PR；加越权钉子用例（api-server 4e51194，日志 408926f）
> - ⏭ 观察项：api/goals.py:30 同款 `not user.is_admin` 恒 False；下一批 openai_compatible.py 888 行包化

> **进展（2026-09-15 其八）**：代码质量马拉松第 129 轮——OpenAI 兼容层包化（api-server + 日志）：
> - ✅ openai_compatible.py 888 → api/openai_compatible/ 包（_core/cache/handler/routes + shim，44-384 行/文件）；经包命名空间运行时解析实现**既有 716 行测试零改动**；5 文件 100% 行覆盖；全量 2426 passed（api-server 02e1010，日志 2333701）
> - ⏭ routes_tasks.py 878（update_task 306 行单函数）待 api/tasks/__init__ 他人 WIP 落地后处理

> **进展（2026-09-15 其九）**：代码质量马拉松第 130 轮——agent_teams 包化（api-server + 日志）：
> - ✅ agent_teams.py 660 → api/agent_teams/ 包（_core/teams/members/projects + shim，13 路由按域三文件）；选型自覆盖率普查（挑 100% 覆盖者拆分即闭环）；40 用例零改动全过、6 文件 100% 行覆盖；全量 2426 passed（api-server a9df94f，日志 0f7ffc5）
> - ⏭ 剩余 >500 行均在 WIP 区或需先补测（mcp/task_tools 845 覆盖 43%）

> **进展（2026-09-15 其十）**：代码质量马拉松第 131 轮——MCP task_tools 修复 + 补测（api-server + 日志）：
> - ✅ 修 3 个上线级 bug：create_task 的 Enum value 字符串直赋（status/priority）与 Task.assignee relationship 塞字符串，三路径首次使用必 500；submit_feedback 同款枚举修复
> - ✅ task_tools 覆盖 43% → 82%（22 用例 HTTP 全链路）；全量 2426 → 2448 passed（api-server 047a62c，日志 dee69a5）
> - ⏭ task_tools 剩余 80 行深层分支下轮继续；观察项：mcp 测试顺序依赖

> **进展（2026-09-15 其十一）**：代码质量马拉松第 132 轮——mcp task_tools 覆盖 82% → 98%（api-server + 日志）：
> - ✅ 32 个深分支用例：审批全流程/推送块、assignee 精确校验容错、分页截断、越权 403、异常吞并；驻留行按高位段 purge 根治跨文件 id 污染；全量 2448 → 2480 passed（api-server b96c763，日志在 132 号）

> **进展（2026-09-15 其十二）**：代码质量马拉松第 133 轮——context_rules 包化（api-server + 日志）：
> - ✅ context_rules.py 625 → api/context_rules/ 包（_core/crud/builder/sharing + shim，14 路由按域三文件）；patch 面 7 符号经包命名空间运行时解析，60 用例零改动全过、5 文件 100% 行覆盖；全量 2480 passed（api-server ab0090f，日志 162aabd）
> - ⏭ api-server >500 行剩余均在他人 WIP 区或需先补测；goals.py authz 观察项待归属会话

> **进展（2026-09-15 其十三）**：代码质量马拉松第 134 轮——auth 包化（api-server + 日志）：
> - ✅ auth.py 636 → api/auth/ 包（_core/routes_core/oauth/users + shim，14 路由按域四文件）；request/oauth service 等 4 符号运行时解析，75 用例零改动全过、5 文件 97-100% 行覆盖；全量 2480 passed（api-server cec984f，日志在 134 号）

> **进展（2026-09-15 其十四）**：代码质量马拉松第 135 轮——mcp task_tools 100% 收口 + goals 越权修复（api-server + 日志）：
> - ✅ task_tools 82→98→**100%** 行覆盖（97 用例）；追出第 5 个真 bug：feedback 的 status_changed 用 str(枚举) 与 value 比较，同状态反馈被误记为状态变更，修复为 .value 语义
> - ✅ 修 goals.py authz：is_admin 缺括号恒放行 → 非成员可跨 workspace 读写 Goal；is_admin() 修复 + 越权钉子 ×2；全量 2480 → **2487 passed**（api-server 9feca2b，日志 ff00143）

> **进展（2026-09-15 其十五）**：代码质量马拉松第 136 轮——auth 包死代码清理（api-server + 日志）：
> - ✅ 删除 auth 包三个子模块中未被调用的 get_current_user 转发包装（包化时与 _pkg 运行时解析并存的死代码）；oauth/users 升至 100% 覆盖；75 用例零改动；全量 2487 passed（api-server c60e956，日志在 136 号）

> **进展（2026-09-15 其十六）**：代码质量马拉松第 137 轮——审批队列端点补测至 100%（api-server + 日志）：
> - ✅ agent_approval_queue.py 72% → **100%** 行覆盖（10 用例：pending 列表/统计/越权 403/agent 名解析），顺带删零引用死函数 _resolve_agent_name；全量 2487 → **2497 passed**（api-server 13fb41f，日志 cf18748）

> **进展（2026-09-15 其十七）**：代码质量马拉松第 138 轮——agent_access_control 补测至 100%（api-server + 日志）：
> - ✅ 51% → **100%** 行覆盖（26 用例真库版）；根因复盘：user_factory teardown 外键置空 vs 驻留行的 organizations.owner_id NOT NULL——权限测试改自建驻留环境规避；全量 2497 → **2523 passed**（api-server 5ca3153，日志 f629cad）
> - **会话累计：迭代 122–138 共 17 轮全绿**（webpage 大文件清零 + api-server 五模块包化 + 5 个真 bug 修复 + mcp task_tools 100% + goals authz 修复 + approval_queue/access_control 100%）

> **进展（2026-09-15 其十八）**：代码质量马拉松第 139 轮——agent_audit 补测至 100%（api-server + 日志）：
> - ✅ 59% → **100%** 行覆盖（12 用例：list 全过滤参数/分页/404、stats 聚合、export 的 limit 回退/组合过滤/CSV 头、非成员 403×2）；沉淀 JWT 401 绕过定式（owner JWT + 外来 workspace 命中 403）；全量 2523 → **2535 passed**（api-server da2a21e 测试 + 69ddb39 日志）
> - **会话累计：迭代 122–139 共 18 轮全绿**（webpage 大文件清零 + api-server 五模块包化 + 5 个真 bug 修复 + mcp task_tools 100% + goals authz 修复 + approval_queue/access_control/agent_audit 三模块 100%）

> **进展（2026-09-16 其十九）**：多 Agent 协作能力实测（真实 LLM E2E 首次全链路打穿）+ agent-runtime 两处交接修复：
> - ✅ 真实 E2E：双 daemon（claude 引擎 × deepseek-v4-pro 经 local-server-001:54988 中转）跑 DAG——依赖门（B 空手+dependency_gate）、真实 LLM 执行、交接上下文注入下游 prompt（FINAL=782=上游 ANSWER 391×2，下游 prompt 从未含 391）、双 Agent 并发在岗、容量门、审计事件流，18 项证据 PASS（驱动脚本 /tmp/collab_e2e/drive.py）
> - ✅ agent-runtime 修复：①pull item 的 upstream 兄弟键桥接进 payload（1e91875 渲染 + 4ae5c0d 桥接，此前交接上下文到不了 CLI Agent 的 prompt）——多 Agent 依赖交接对 CLI 引擎从此真实可用
> - 观察项：write_agent_audit 依赖 request 上下文，无请求上下文的后台路径审计事件静默丢失

> **进展（2026-09-16 其二十）**：多 Agent 协作机制加固（真实 LLM E2E + 单测 + 三道门 LIVE 收口）：
> - ✅ **交接沉降窗口**（AGENT_HANDOFF_SETTLE_SECONDS，默认 0）：上游终态后延迟 N 秒放行下游派发，根治「交接上下文写入晚于下游被抢」的时序竞态；事件留痕保持终态即解锁语义（api-server d48fb23）
> - ✅ **后台审计写入修复**：write_agent_audit 无请求上下文不再静默丢事件（调度器/ORM 路径的 agent.created 等从此落库）
> - ✅ **预算门 LIVE 收口**：concurrent 预算 limit=1 时第二 Agent 被挡、审计 budget.exceeded 留痕、租约释放即恢复；顺修 concurrent 用量不过滤过期租约的 bug（6a91327）
> - ✅ LIVE 实测：并发抢租约原子性 5/5（双会话同时 pull 零双重租约）、沉降窗口交接闭环 FINAL=1197=399×3（执行者 prompt 从未含 399）、容量门/预算门/审计流全过
> - ✅ 测试基建：boom 注入测试泄漏毒化共享会话（全量 50F+48E 级联根因）就地复原修复；全量门禁 **2546 passed**（api-server d48fb23+6a91327）

> **进展（2026-09-17 其二十一）**：Agent 形象化 + 企业 IM 双向打通 + 对外接入三件套（SOTA 一轮交付，真实 E2E 19 项全过）：
> - ✅ **Agent 形象化**：协作图节点渲染头像（clipPath 裁剪进节点圆，avatar_url 优先、按身份确定性生成 bottts 机器人形象兜底，同一 Agent 永远同一张脸）；`resolveAgentAvatarSrc` 统一解析入口；协作图接口节点携带 avatar_url/display_name（api-server b0c1df4、webpage cc81edb）
> - ✅ **灵魂人设进执行链**（agent-runtime 6904b4c）：agent_profile（soul_markdown/display_name）随 pull 下发并缓存进 TaskExecutor，渲染为引擎 prompt 首部人设段（超长截断）；顺修历史缺陷——payload.prompt 缺失时只回退 title 导致任务正文永远进不了 CLI 引擎，改为「标题+正文」组合（单测 11 例钉住）
> - ✅ **飞书双向打通**（api-server b0c1df4）：自建应用事件订阅入站（url_verification 握手、header.token 验签 fail-closed、im.message.receive_v1 文本→建任务、chat_id→项目群路由、message_id 幂等）+ tenant_access_token 交互卡片群回执（api_base 可覆盖支持私有化/测试 mock）
> - ✅ **企业微信双向打通**：官方回调协议完整实现（SHA1 验签 + AES-256-CBC 加解密，纯 hashlib+cryptography），GET echostr 验证、POST 文本消息→建任务、应用消息回执
> - ✅ **通用 Webhook 入站**：X-Todo4AI-Token 校验 + 点分路径字段映射模板，任意内部系统（OA/工单/告警）零适配接入；E2E 实测磁盘告警 JSON → 建任务
> - ✅ **出站 Webhook 订阅中心**：订阅 CRUD、事件类型白名单、HMAC 签名（t=,v1= 防伪造防重放）、3 次退避重试、派发记录可观测、签名 ping；task.created/status_changed/completed/failed 四类事件在建任务/批量状态/Agent 提交三处挂点，后台线程投递不阻塞请求
> - ✅ **前端集成中心页**（/integrations + 顶部导航）：入站连接器配置（凭据/群路由/字段映射/回调地址复制）、出站订阅管理（密钥一次性展示/测试投递/派发记录）
> - ✅ **验收**：迁移 000030（webhook_subscriptions/webhook_deliveries/config_json）已应用；api-server 全量 **2560 passed**（新增 14 例，覆盖 81.57%）；agent-runtime 607 passed（5 败为共享 venv RestrictedPython 既有环境问题，基线同败）；webpage tsc/build/314 测试全绿；隔离端口真实 E2E **19/19 PASS**（飞书握手/建任务/幂等/卡片回推、企微 echostr/加密消息、通用映射、出站签名推+验签+派发记录、协作图形象字段）
> - 观察项：workspace 路由创建的 Agent owner_id 为 NULL 与 owner 鉴权接口（直发消息）不一致；MCP 工具面 30+ 已覆盖本轮场景无需扩展

> **进展（2026-09-17）**：多 Agent 协作工作流——执行闭环 + 画布式编辑器 + Dify/Coze 连接器（api-server + webpage，详见 `docs/WORKFLOW_CANVAS_AND_INTEGRATIONS.md`）：
> - ✅ **执行闭环**：此前步骤任务被 Agent 提交后无人回调工作流引擎（只能人工在控制台点完成），真实多 Agent 流水线断在第一步。现 `maybe_autocomplete_for_task` 挂到三条任务终态路径（runtime commit / 人工置 DONE / 评审通过），统一走抽取出的 `complete_step_run` 核心——状态迁移、SharedContext 回写、步骤级自动重试、声誉/经验沉淀、沙箱收尾、DAG 推进全自动；RUNNING 守卫防双写，闭环异常不反噬任务提交
> - ✅ **画布式工作流编辑器**（React Flow，/workflows 卡片「画布编辑」入口）：拖拽连线建 depends_on（自动防环）、删除即清理引用、节点徽标（Agent/能力/条件/重试/子工作流/连接器）、右侧全字段配置面板（含条件执行 operator 全集）、坐标持久化进 `definition.layout` + dagre 自动布局、保存走既有 PUT 自动版本快照
> - ✅ **Dify/Coze 连接器**（集成而非重造，规避 AGPL）：`WorkflowStep.integration_config`（迁移 000031，api_key 加密入库/回传脱敏/PUT 回传沿用密文）——配置后该步骤直接调用远端工作流 API（dify blocking / coze v1 run），不建 Agent 任务；输入支持 `{{step_result_上游key}}`/`{{context.x}}`/`{{root_task_title}}` 占位符；远端结果经同一 complete_step_run 回写，推进/重试/失败策略与 Agent 步骤完全一致；默认后台线程执行不阻塞请求
> - ✅ **顺带修复主干上从未工作过的链路**（冒烟实测发现）：launch_workflow 缺 `Project` 导入（HTTP 启动必 500）；create_workflow/launch/子工作流启动缺 flush（id 为 None 必崩）；工作流/运行/审计/外部 Agent 四个列表端点四连 bug（dict.get(type=) TypeError、paginate_query 传 dict、ApiResponse.paginated 不存在、双重 to_dict）+ audit-logs 缺 or_ 导入
> - ✅ **验收**：api-server 新增 27 例（闭环四路 + commit HTTP E2E + 连接器全链路 + 列表回归），全量门禁 2616 passed（两轮）；webpage tsc/vite build/314 测试全绿、画布文件 eslint 0 问题；隔离端口浏览器 GUI 冒烟 PASS（模板实例化 → 画布编辑 → 连接器配置 → 保存 → API 复核密文落库/脱敏回读/layout 持久化/version=2）
> - ⏭️ 待办：WorkflowTrigger 常驻调度（仍靠外部 cron 打 fire-triggers）；运行态画布（run console 复用画布节点显示实时状态）；n8n/通用 HTTP 步骤类型与连接器连通性测试按钮；agent-runtime 步骤任务携带工作流元数据

> **进展（2026-09-17 其二）**：LLM API 指标与可观测——用户级/组织级/单 Agent 三视角（agent-runtime + api-server + webpage）：
> - ✅ **采集（agent-runtime 424ddb2）**：每次引擎真实调用产出一条遥测——cli_engines 捕获 claude JSON 的 usage/total_cost_usd/实际模型与 ANTHROPIC_BASE_URL 端点（成功/失败/超时路径都带），llm_telemetry 组记录（success/failed/timeout 状态、错误截断）fire-and-forget 上报 `/agent/llm-metrics/batch`（旧平台 404 静默降级，绝不打断任务主链路）；openclaw 路径同步埋点（耗时口径）
> - ✅ **存储与 API（api-server a04abed）**：迁移 000032 `llm_call_metrics`（幂等键 call_id 防重摄取、tokens/cost/duration/status/model/base_url、组织/用户/Agent 三组窗口索引，MySQL+SQLite 双方言）；`POST /agent/llm-metrics/batch`（agent 会话鉴权，归属用户服务端解析 owner_id→creator 回退）；查询三端点——`GET /llm-metrics/mine`（用户自己的）、`GET /workspaces/<id>/llm-metrics`（组织成员可见）、`GET /llm-metrics/agents/<id>`（管理权限），聚合含 p50/p95 耗时、成功率、tokens、成本、按日趋势、按 Agent/模型分组、最近失败样本
> - ✅ **视图（webpage 0d57c59）**：共享 LlmMetricsPanel（Statistic 行 + MiniTrendChart 趋势 + by-day/by-agent/by-model 表 + 失败样本含端点列）；仪表板「LLM API 用量」区块（用户级）、组织详情「模型用量」Tab、Agent 详情「LLM 用量」Tab；i18n 中英双语
> - ✅ **验收**：真库端到端（迁移落 MySQL、摄取 3 条 + 幂等重放 skipped、三视角聚合数值正确、无 token 401）；headless 截图仪表板区块与组织 Tab 真实渲染 PASS；门禁 api-server 全量 2570 passed（1 既有 WeCom 失败与纯净 origin/main 一致）、agent-runtime 616 passed（5 既有沙箱环境失败一致）、webpage tsc 0 错 + vite build 过
> - ⏭️ 待办：平台侧预算/配额看板接指标列；失败率突增告警钩子；proxy 渠道维度对齐（cc-lant 渠道 id ↔ agent.llm_provider）

> **进展（2026-09-17）**：交互式会话一期——任务页实时对话 + 流式输出 + 停止执行（api-server + agent-runtime + webpage）：
> - ✅ 定位：向类 Codex/Claude Code 的交互式工作方式迈出第一步（对标 REFERENCE_BENCHMARK P0-1 会话锚点），用户从「提交后黑盒等待」升级为「实时看 Agent 干活 + 随时留言 + 随时叫停」；全程复用既有任务/租约/事件管道，零表结构迁移
> - ✅ 实时对话（Phase 0）：任务详情页新增「任务对话」卡片（复活孤儿组件 TaskChatThread 接线）——用户留言落 TaskLog、WS task_comment 推任务房间，并在途 attempt 的 agent 实时下行 user_message 事件；agent 侧 chat 游标（.todo4ai-chat-cursor.json 存工作区）+ 新端点 GET /agent/tasks/<id>/chat?after_id= 拉增量，每轮 attempt 构建 prompt 时注入「用户留言」段（下轮 --resume 续跑正式可见）；运行中收到留言即时写事件流（控制台可见「💬 收到用户留言」）
> - ✅ 流式输出（Phase 1 核心）：cli_engines 流式重写——stdout 逐行异步读（原 communicate() 一次性），claude 默认 --output-format stream-json --verbose 逐 turn 解析（text/tool_use/result，CLAUDE_OUTPUT_FORMAT=json 可回退），codex exec --json 逐事件解析，其余引擎原始行透传；输出经节流发射器（1200 字符/1s）走既有批量事件管道 → 平台入库后转发 task_runtime_event 到用户任务房间 → 前端「Agent 运行控制台」实时渲染（WS 增量 + 5s 游标轮询兜底 + id 去重 + 智能滚底）；新增用户侧游标端点 GET /tasks/<id>/runtime-events
> - ✅ 停止执行（Phase 1）：控制台「停止执行」（内联两步确认）→ POST /tasks/<id>/agent/stop（can_access_project 门控 + 审计留痕）——任务置 CANCELLED + WS cancel_task 命令即时终止；agent-runtime 子进程 start_new_session 按进程组 TERM/KILL（不留握管道写端的孤儿孙进程），cancel_event 触发返回 ENGINE_CANCELLED 并按 cancelled 提交（复用平台 attempt ABORTED 语义）；agent 离线由续约响应新增的 cancel_requested 兜底（≤一个续约周期）；顺手修掉 asyncio.wait 默认 ALL_COMPLETED 使超时/取消形同虚设的实测根因
> - ✅ 验证：api-server 新增 10 测试（下行通知/游标聊天/事件转发/控制台端点/停止双通道/续约标记），全量门禁 2574 passed（2 失败经干净基线复跑确认为 integrations 既有失败，非本次引入）；agent-runtime 新增 20 测试（stream-json/codex 解析/流式回调/取消/超时/游标/留言注入/续约兜底），全量 646 passed（并入 telemetry 分支测试）；webpage tsc+vite build 通过、319 tests passed（含 AgentRunConsole 5 组件用例；该 jsdom 环境无法打开 antd 弹层 portal，停止改为内联确认）
> - ⏭️ 后续（二期起）：DB 会话为中心数据模型（session id 落库、成功不毁工作区、跨任务 follow-up）；运行中 stdin 注入与阻塞式工具审批（依赖引擎权限点协议，claude 可行/codex 降级）；SocketIO 多 worker 化（Redis message queue）

> **进展（2026-09-17）**：交互式会话二期 UI 收口——Claude Code 风格交互终端（webpage ee61040）：
> - ✅ **统一时间线终端**：任务详情页 AI 任务顶部通栏「✻ 交互终端」取代原「Agent 运行控制台 + 任务对话」双面板——任务对话（TaskLog）与运行事件流（AgentTaskEvent）按时间合并渲染（用户 ❯ 绿 / Agent ⏺ / 进程 · 蓝 / 状态 ▶ / 错误 ✗ / 系统 ○），对话回复串内联缩进呈现
> - ✅ **REPL 输入行**：底部终端式输入（❯ 提示符 + 无边框暗色输入），Enter 发送 / Shift+Enter 换行；乐观回声立即上屏，服务端落库后同文对账顶替；留言实时转发 Agent 并在下轮执行注入上下文
> - ✅ **斜杠命令与中断**：/stop（中断执行）、/clear（清空本地视图，游标保留防历史回灌）、/help（命令列表）；Esc 两段式中断（首次武装提示、2.5s 内再按确认），与「停止执行」内联两步确认并存；复制转录/清屏/完整对话历史（Drawer 承载 TaskChatThread，保留线程回复能力）
> - ✅ **真 bug 修复（StrictMode 事件丢失）**：appendEvents 原把去重副作用写进 setEvents updater，React 18 StrictMode 双调用 updater 使第二次把整批事件误判「已见过」返回 prev——dev 模式事件流必现白屏；已把副作用移出 updater 纯化，并新增 StrictMode 回归测试（旧 AgentRunConsole 同款隐患随组件替换一并消除）
> - ✅ **验收**：agentTerminalCore 6 例 + AgentTerminal 9 例（合并渲染/WS 去重/发送回声对账/命令/Esc 两段中断/两步停止/清屏/StrictMode），全量 329 passed；vite build 过；本地 worktree dev server + 仅 mock runtime-events/chat 两端点（其余代理真实后端）真实浏览器视觉验收——合并时间线、前缀配色、欢迎态、输入行渲染全部 PASS
> - ⏭️ 待办（三期）：运行中 stdin 注入与阻塞式工具审批；会话为中心 DB 模型；SocketIO 多 worker

> **进展（2026-09-18）**：Dify 工作流引擎系统性对标 + Wave 1 借鉴落地（api-server + webpage，详见 `docs/DIFY_WORKFLOW_BENCHMARK.md`）：
> - ✅ 对标方法：克隆 Dify main 浅拷贝至 references/dify，通读编排层/节点/DSL/HITL/触发器（其图引擎已抽为 graphon PyPI 包）；许可证为修改版 Apache 2.0，含**多租户 SaaS 限制**——todo-for-ai 是 workspace 多租户模型，**只借鉴概念自研实现，不拷代码**
> - ✅ Wave 1 ①：**DSL YAML 导入导出**（借鉴 Dify app_dsl_service 的可移植性 + 泄漏防护）——导出清洗 api_key/agent_id/task_template_id、子工作流按名导出；导入校验版本兼容/step_key 唯一/依赖存在/成环（Kahn）/子工作流按名解析（缺失拒绝）；`GET /agents/workflows/<id>/export` + `POST /agents/workflows/import` + 页头导入/卡片导出按钮
> - ✅ Wave 1 ②：**单步测试运行**（借鉴 Dify single_step_run）——`POST /agents/workflows/<id>/steps/<key>/test-run`：agent 步骤出「将选中的 Agent + 任务内容」预览（零副作用），dify/coze 步骤真实调用远端并回显输出/错误；画布步骤面板「测试运行」按钮 + 结果卡
> - ✅ Wave 1 ③：**{{sys.*}} 系统变量前缀**（借鉴 Dify variable_prefixes）——run_id/workflow_id/workflow_name/project_id/root_task_*/step_* 九个系统变量可在连接器 inputs 中引用；未知 sys.* 渲染空串不透传
> - ✅ 验收：api-server 新增 19 例（DSL 清洗/往返/校验/路由 + 测试运行三模式 + sys 占位符），套件 46 工作流测试全绿 + 全量门禁 exit 0；webpage tsc/build/319 测试全绿
> - ⏭️ Wave 2（已排）：节点级 default-value 错误策略、暂停/恢复整图快照（HITL 底座）、触发日志表 + next_run_at skip_locked 轮询、HTTP 通用节点（SSRF 防护）；Wave 3：引擎事件层 hooks、LLM 生成工作流

> **进展（2026-09-17 其三）**：多 Agent 协作第三轮——交接机制产品化修复 + 真实 LLM 战役测试（agent-runtime + api-server）：
> - ✅ **commit 时原子交接**（api-server cdbe060）：commit 请求新增可选 `shared_context`，与终态翻转同一事务落库——下游解锁后第一次 pull 必然拿到交接，根治「上游已解锁、交接还没写」时序竞态（settle 窗口退化为纯防御）；失败/取消提交同样收，部分产出也交接
> - ✅ **Agent 自写交接约定**（agent-runtime 4109d50+15e1840）：引擎在工作区写 `.todo4ai-context.json`，commit 时自动读取上交（20 键上限、安全降级）；live 发现 CLI 成功包装 dict 丢字段导致交接静默失效——已修 + wrapper 级回归测试；失败时完整记录 stderr/stdout tail（此前前 500 字符掩盖真因）
> - ✅ **交接署名修复**：workspace 域 Agent（owner_id=NULL）在 shared-context API 署名必 404——改为 owner/creator/组织成员三通道判定
> - ✅ **修复任务带原始描述**：DoD 失败的修复子任务 content 现在携带父任务原始 brief（截 3000 字符，含此前产出），修复 Agent 不再只靠标题猜
> - ✅ **真实 LLM 战役**（lant 中转 × claude 引擎）：三跳接力全链 DONE、LLM 指标实时采集验证（逐调用 tokens/cost/duration 落库）、`llm_call_metrics` 表 15b90b4b 等真实记录；驱动力脚本 /tmp/collab_e2e3/campaign.py（case-a/b/c/d/e）
> - ⚠️ **外部阻塞**：lant.top 中转账户余额耗尽（RELAY_101，deepseek-v4-pro/flash/glm 全部 403），Case B/C/D/E（失败自愈、4 路扇出、分支阻塞、会话接续）待充值后继续
> - 📋 live 发现待修：单次 ENGINE_FAILED 会级联生成多层 `[修复] [修复]...` 嵌套任务链（failed_attempts 计数与父链去重需收敛）
