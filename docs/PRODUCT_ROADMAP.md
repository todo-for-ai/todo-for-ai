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
> - ⏭ 待办：GitHub App 实际创建/安装（运维步骤），安装后 App 路径自动生效

1. **P1.1 GitHub App spike**：申请 GitHub App，打通"项目绑定仓库 + 自动开 PR"最小路径（`api/github_proxy.py` 升级为读写）。
2. **P1.2 DoD 数据模型设计**：`Task` 增加 `dod`（结构化验收标准）与 `evidence`（证据附件）字段，commit 协议加 `evidence` 必填分支（向后兼容开关）。
3. **P1.4 MCP 扩容清单评审**：从 6 → 18 的工具列表按 P1 清单定稿，先加 `claim_task` / `report_progress` / `get_verification_result` 三个。
4. **数据闭环埋点**：从现在起记录每个任务"人工干预次数"字段，为 ACR 指标积累基线数据。
