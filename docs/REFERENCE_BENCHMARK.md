# 同类开源产品对标与功能借鉴计划

> 版本：v1.0（2026-09-03）
> 调研对象：7 个同类开源项目的本地 shallow clone，位于仓库外 `/Users/cc11001100/github/todo-for-ai/references/`（含逐仓调研索引 `REFERENCES.md`）。
> 对照文档：`docs/PRODUCT_ROADMAP.md`（缺口编号 G1 代码平面 / G2 DoD 验证门 / G3 任务级沙箱）。
> 本文是"抄什么、从哪抄、抄到哪"的执行清单：每条借鉴项标注来源仓库 + 参考文件路径 + 我们的实施落点。

---

## 0. TL;DR：最值得抄的 10 件事

| # | 借鉴点 | 来源 | 落点 | 优先级 |
|---|---|---|---|---|
| 1 | 会话恢复锚点：从 agent 日志流提取 session_id/message_id 落库，follow-up 用 `--resume` 续会话 | vibe-kanban `coding_agent_turns` | agent-runtime CLI 引擎 | P0 |
| 2 | agent hooks 驱动任务状态机：注入 `Stop→提交待审` 等 hook，生命周期事件替代轮询 | cline/kanban | agent-runtime + api-server | P0 |
| 3 | ✅ 已落地（agent-runtime 9dbef91，2026-09-04）：turn 级 git checkpoint：`write-tree/commit-tree` 存自定义 ref，agent 每轮产出可 diff 可回滚 | cline/kanban `turn-checkpoints.ts` | agent-runtime sandbox | P0 |
| 4 | ExecutorAction 执行链：setup→agent→**verify(DoD 门)**→cleanup 串成 JSON 链落库可重放 | vibe-kanban `actions/mod.rs` | api-server + agent-runtime（G2 骨架） | P1 |
| 5 | task→workspace→session→execution_process 数据模型（G3 的正确抽象） | vibe-kanban migrations | api-server 模型层 | P1 |
| 6 | worktree 轻量隔离细节：symlink 免重装依赖、半成品资源逆序清理、base SHA 持久化 | kanban + claude-squad | agent-runtime sandbox（G3） | P0 |
| 7 | PR 生命周期闭环：gh 建 PR → 轮询 merged/closed → 回写任务状态 | vibe-kanban `pr_monitor.rs` | api-server（G1 起步） | P1 |
| 8 | 审批桥抽象：`ExecutorApprovalService`（工具级审批）+ 统一审批表单协议 | vibe-kanban + omnara | agent-runtime + 治理审批队列 | P1 |
| 9 | 复杂度分析独立产物 + next-task 调度算法（priority > 依赖少 > ID 小） | claude-task-master | api-server ai_task_split / 领任务 | P1 |
| 10 | AC 索引化 + 客观证据验收 + 分层按需 agent 指令 | Backlog.md | 任务模板 + MCP commit 协议（G2） | P0 |

---

## 1. vibe-kanban 深度对标（重点）

Rust + React，⭐28k，Apache-2.0，`npx vibe-kanban` 本地起服务。与我们设计思路高度相似：**看板管任务 + CLI coding agent 执行 + diff 审查**。它是我们 G1/G2/G3 三个缺口加起来最完整的单一参照。

### 1.1 卖点 → 我们的复制方案

README 的卖点是按"工程师时间转向 plan 和 review"来讲的，共 6 条：

| vibe-kanban 卖点 | 我们现状 | 抄法 |
|---|---|---|
| **Plan with kanban issues**：看板建/排/分派任务 | 已有（看板+批量操作+依赖） | 不需要抄，是我们的强项；补 DAG 依赖自动启动（见 §3 cline/kanban） |
| **Run coding agents in workspaces**：每任务独立分支+终端+dev server | G3 做了一半（runtimes/cli-agents 沙箱） | 抄 workspace 模型与 worktree 管理（§1.3、§1.4） |
| **Review diffs and leave inline comments**：行内评论直接回给 agent | 有评论体系，但没有"diff 行内评论→follow-up"通路 | 抄审查流（§1.5），行内评论收集后拼进 follow-up prompt |
| **Preview your app**：内置浏览器预览 agent 跑起来的应用 | 无 | repo 表已有 `dev_server_script` 设计；Web 端嵌 iframe 预览 + 端口代理，排 P2 |
| **Switch between 10+ coding agents**：同一任务换 agent 重跑 | CLI 引擎已支持 claude/codex/opencode/custom | 抄 executor 配置模型（profile + 只存 diff 的覆盖，§1.6） |
| **Create PRs and merge**：一键建 PR、合并自动更新任务 | G1 全缺 | 抄 git-host 抽象 + PR 监控（§1.4），P1 |

### 1.2 执行器抽象（对照我们的 CLI 引擎）

- 核心 trait `StandardCodingAgentExecutor`（`crates/executors/src/executors/mod.rs`）：`spawn / spawn_follow_up(session_id, reset_to_message_id) / spawn_review / normalize_logs / discover_options / default_mcp_config_path`。比"能起进程"多三层智能：**会话恢复、日志规范化、能力发现**。
- 命令构造 `CommandBuilder`（`command.rs`）：`CmdOverrides { base_command_override, additional_params, env }` 允许用户整体换命令/追加参数——我们 custom 引擎的配置面可对齐此模型。
- prompt 走 **stdin** 不走 argv（防泄露/防超长）。
- `SpawnedChild` 返回值里带 `exit_signal`：executor 内部协议层可提前宣告成败，不傻等进程退出。
- **给我们的动作**：agent-runtime CLI 引擎补齐 `spawn_follow_up`（ resume）与 `normalize_logs` 两个能力位；`spawn_review` 的"让另一个 agent 实例审查"是 G2 的低成本形态。

### 1.3 任务生命周期：正确的数据模型（G3 直接抄）

它 2025-12 把 task_attempt 重构成三层（migration `20251216142123_refactor_task_attempts_to_workspaces_sessions.sql`）：

```
task (todo/in_progress/in_review/done/cancelled)
 └─ workspace   ← 任务的工作区（worktree 路径 + branch + pinned/archived）
     └─ session ← 一次 agent 会话（executor + working_dir）
         └─ execution_process ← 一次进程执行（不可变：executor_action JSON + status + exit_code
                                  + before_head_commit/after_head_commit + 原始日志文件路径）
```

- **每次执行都是不可变记录**，天然满足我们"一切留痕、可回放可审计"的产品原则。
- `run_reason = setup_script | coding_agent | dev_server | cleanup_script | archive_script`——验证脚本作为一类一等公民的执行，正是 DoD 门需要的挂点。
- agent 跑完自动 `in_progress→in_review`；人审查"要求修改"回 `in_progress`。任务状态由执行事件驱动，不靠 agent 自述。
- **给我们的动作**：api-server 的 `AgentTaskAttempt` 演进为 workspace+session+execution_process 三层；`AgentRun` 已接近 execution_process，补 `before/after_head_commit` 字段。

### 1.4 工作区隔离与 G1 代码平面

- worktree 全生命周期（`crates/worktree-manager/`、`crates/workspace-manager/`）：按路径全局锁防竞态、三层校验坏了自动重建、失败逐仓回滚、孤儿目录扫描、过期 workspace 后台清理、统一分支前缀 `git_branch_prefix`。
- 多仓支持：一个任务跨 N 个 repo 各建 worktree、各自 target branch（`workspace_repo` 表）。
- git 操作全封装（`crates/git/src/lib.rs`）：fork_point / merge / rebase（含冲突检测与继续）/ push / reset_to_commit——这套函数清单就是我们 G3/G1 的 API 需求清单。
- **G1 闭环**：`trait GitHostProvider { create_pr / get_pr_status / get_pr_comments ... }`（`crates/git-host/`），GitHub 走 `gh` CLI 封装；`pr_monitor.rs` 每 60s 轮询 open PR，merged/closed 自动回写任务状态与 merge 记录。路由含 `/pr/attach`（关联已有 PR）、`/from-pr`（从 PR 建 workspace 修它）、PR 评论区拉回 UI。
- **给我们的动作**：P1 先做"任务→分支→commit→一键建 PR→状态回流"最小闭环（我们 agent-runtime 已产出 commit，缺的是 push+PR+监控）。

### 1.5 审查流（G2 参考）

- diff 流：worktree vs target branch 的 diff 做成 **JSON Patch 流**推前端（`diff_stream.rs`），带限流。
- 机器可读审查动作：`POST /sessions/{id}/review` → 计算 fork_point base → `build_review_prompt()` 明确指示 agent `git diff {base}..HEAD` 自查 → **另一个 agent 实例做审查**，作为普通执行记录留痕。
- 人类审查 = 行内评论收集 → 一次性拼进 follow-up prompt → 任务回 in_progress；"通过" = merge 或建 PR。**没有单独的 verdict 表，审查结论就是任务状态 + merge 记录**——模型极简。
- **给我们的动作**：diff 行内评论（webpage）→ 评论聚合进 follow-up（agent-runtime）这条通路整条抄；"AI 审查员"作为 G2 验证门之外的第二道人感检查。

### 1.6 其他眼前一亮的设计（按价值排序）

1. **会话恢复锚点**：日志流里夹带 `SessionId/MessageId` 控制消息 → 落 `coding_agent_turns` 表 → follow-up 用 `--resume <session_id>`；`reset_to_message_id`（Claude 的 `--resume-session-at`）实现**代码 git reset + 对话截断**双回滚重试。
2. **ExecutorAction 链**（`actions/mod.rs`）：`{typ, next_action}` 链表，setup→agent→cleanup 串链、JSON 落库可重放。**DoD 门 = 链上 agent 后面多挂一个 verify 节点**。
3. **审批桥**：`ExecutorApprovalService` trait（`approvals.rs`）+ pending 列表 + WS 推前端 + `POST /approvals/{id}/respond`；按 agent 能力注入真桥或 Noop。"人类在环"抽象成与 agent 无关的接口，直通我们的审批队列。
4. **MCP 双模式**（`crates/mcp/`）：`global` 模式（外部全量管理）+ `orchestrator` 模式（注入任务内 agent，白名单裁剪只能操作自己 workspace）。`get_context` 让 agent 一启动就知道自己在哪个 repo/branch。**orchestrator 模式 = agent 可自建子会话**，是我们团队编排（TeamTaskOrchestration）的另一种实现视角。
5. **commit reminder**：给 agent 注入 `Stop` hook，agent 停下时提醒它 commit——保证"完成 = 有 commit"可被 git 事实验证，G2 证据链的低成本前置。
6. **排队的 follow-up**（`queued_message.rs`）：agent 运行中人类发消息进队列，进程结束自动续跑；草稿存 scratch 表发送即删。
7. **日志双轨**：规范化 JSON Patch 实时推 + 原始 stdout JSONL 落盘留档（`ExecutionLogWriter`），实时与审计两不误。
8. **执行身份统一对象** `ExecutorConfig { executor, variant, model_id, permission_policy }`：`permission_policy: Auto|Supervised|Plan` 映射到各 agent 的权限 flag；内置 profiles + 用户只存 diff 覆盖。
9. agent 可用性探测（登录态/安装检测）与推荐默认 agent；多仓 workspace 的 `CLAUDE.md/AGENTS.md` 自动聚合。

### 1.7 vibe-kanban 值得警惕的点

- 已宣布 hosted 版 sunset、转社区维护——单机 local-first 产品形态，与我们"平台 + 多租户 + 治理"定位不同：**它抄实现，我们补平台**（多租户、配额、组织、审批治理是我们的强项）。
- `bypass permissions` 类自治模式是默认倾向（本地 worktree 兜底）；我们做平台必须把"放权"做成显式分级而非默认。

---

## 2. omnara：治理/审批/沙箱调度参照（⭐2.8k，Go，Apache-2.0）

定位"managed agents 平台"，agent 循环跑在平台 worker 里（与我们"外部 CLI agent 拉任务"互补视角）。**没有 G1/G2**（它的"完成"就是模型 stop_reason），但工程严谨度全表最高。

最值得抄（细节见 `references/REFERENCES.md` 与其 migrations）：

1. **DB 即状态机**：不可变与状态转移规则用 trigger + CHECK + partial unique index 写进 Postgres（"running tool_call 必须持有 runtime lock"、"每 agent 仅一个 started model_call"）。我们的任务租约/审批队列可按此升级，并发正确性不再靠应用层自觉。
2. **完整表结构清单**：`migrations/000001~000024`——org/project 双层 RBAC、secrets 信封加密（aes-256-gcm-envelope + AAD 绑定 + KEK 轮换 rewrap）、machine/machine_pool 三层配置覆盖（pool→project grant→agent binding）、`agent_events` 追加不可变事件溯源 + `content_blocks` 规范化、幂等键无处不在。做平台化时整册对照。
3. **统一审批/提问表单协议**（interactionform）：`title + context[](证据对) + questions[](选项/可填文本)`，审批与提问一张表（`agent_interactions`）一个协议，UI 零特判；first-writer-wins 并发语义（重复答案幂等、矛盾答案 409）。**比 vibe-kanban 的审批桥更适合我们直接对接审批队列**。
4. **SQL frontier 函数调度**：`agent_next_model_work(p_org, p_agent)` 一组 SQL 函数按优先级算"下一步该做什么"，worker 无脑消费——比应用层调度器可测试。
5. **输入三投递模式**：queued（排队）/ steering（打断注入）/ immediate（cancel、审批答复）。
6. **配置不可变 + 版本化**：agent_config 内容寻址（同 hash 去重），换配置是 typed input 下一轮生效——"agent 当时有什么权限"永远可考，直接服务我们 SOUL 版本化。
7. 池机器 idle 回收（`delete_after_idle_minutes` + 判定视图）、runtime protection（daemon 失联但沙箱还在跑→判死）、cron trigger 的 claim_token 抢占语义。

---

## 3. claude-task-master：任务智能流水线参照（⭐28k）

定位"AI 驱动开发的任务管理"，一条流水线：PRD→任务→复杂度→展开→next 逐个执行。许可为自定义（借鉴**提示词与算法思路**，抄代码前先读根 LICENSE）。

1. **复杂度分析作为独立产物**：先对每任务打 1-10 分 + 推荐子任务数 + 定制 expansionPrompt + reasoning 存独立报告（`task-complexity-report.json`），拆解时复用报告里的 prompt——"先评估后拆解"比一把拆完可控。落点：ai_task_split 拆成两步。
2. **next-task 调度算法**（`find-next-task.js`）：in-progress 任务的子任务里先找依赖已满足的，排序 = priority > 依赖数少 > ID 小。落点：`agent_runtime_pull` 的选任务策略。
3. **提示词工程范式**（`src/prompts/`）：角色定位 + 结构化 JSON 输出 + zod schema 硬约束 + 逐字段最小长度 + research 前置调研模式。落点：ai_task_split / parse-prd 类提示词重写。
4. **MCP 工具分级加载**：`TASK_MASTER_TOOLS=core|standard|all`（7/14/43 个），解决工具面膨胀；长任务返回 operation_id + `get_operation_status` 轮询，防 MCP 超时。落点：我们 MCP 工具面（已有 40+ 工具）照抄这两招。
5. **update 语义**：实现偏离计划时 AI 批量改写后续任务（计划漂移修正）；update-subtask 只追加不覆盖进度。
6. tag 隔离上下文 + autopilot 的"一任务=一分支=TDD 状态机"。

## 4. Backlog.md：任务写作协议与证据验收参照（⭐6.6k，MIT）

Git 原生 markdown 任务系统，"自己的代码几乎全由 agent 通过它完成"——**任务→agent 可执行→客观验收**的全套话术最成熟。

1. **「让无上下文的未来 agent 可执行」的任务写作协议**（`src/guidelines/cli-instructions/task-creation.md` 单页最佳）：description 写 why；AC 写可测的 what；**创建时禁写实现计划**（agent 领任务后基于当前代码库 JIT 写计划并回写任务 `--plan`）。落点：我们的任务模板 + ai_task_split 生成标准。
2. **AC 逐条索引化 + 客观证据验收**：`--check-ac 2` 按索引勾选；每条 AC 必须附测试/命令/浏览器等客观证据才能勾；final summary 必须含验证证据；项目级 DoD 默认 + 任务级补充双层。落点：**MCP commit 协议加 `evidence` 结构**，直接补 G2 的"没有证据的完成不算完成"。
3. **分层按需 agent 指令**：AGENTS.md 只放版本化入口块，`instructions overview→task-creation/execution/finalization` 按需取。落点：我们的任务描述/协同分节（co-writing loop）的话术升级。
4. **三层一致性**（禁手改数据 + CLI/MCP 共享 handler + 稳定 `--json` 契约）、分配即认领（assignee=self）、ID 分配全局锁 + 按文件编辑锁、跨分支任务状态汇聚。
5. 产品叙事：**三个审查检查点**（审 spec → 审 plan → 审 code）+「一任务=一上下文窗口=一 PR」的粒度准则——可直接作为我们产品文案。

## 5. cline/kanban：G3 实战细节参照（⭐1.3k，Apache-2.0）

1. **turn 级 checkpoint 零侵入技巧**（`src/workspace/turn-checkpoints.ts`）：临时 `GIT_INDEX_FILE` + `write-tree/commit-tree` 把工作区快照存 `refs/kanban/checkpoints/<task>/turn/<n>`，能 diff"自上一条用户消息以来的改动"，不产生分支提交。agent-runtime sandbox 直接用。
2. **worktree + symlink 免重装**（`task-worktree.ts`）：`node_modules` 等 symlink 回主仓 + `.git/info/exclude` 管理块 + 创建 lockfile。
3. **agent hooks → 任务状态机**（`agent-session-adapters.ts`、`commands/hooks.ts`）：`Stop→to_review`、`PermissionRequest→to_review`，hook 命令带 `TASK_ID/WORKSPACE_ID` 环境变量回传。比轮询可靠，是我们"agent 完成→待审"该走的路。
4. 任务依赖链自动启动（上游卡完成→下游自动 start）；diff 行内评论格式化为 `file:line | 内容 + > 评论` 回给 agent；单一状态流（snapshot+delta，150ms 批量 fan-out）。
5. 警惕：它的 bypass permissions 默认化基于 worktree 隔离兜底——我们沙箱更弱时必须显式授权。

## 6. OpenHands 与 claude-squad：两点即可

**OpenHands**（⭐86k，MIT；主仓已重构为前端，运行时在 `software-agent-sdk` 仓）：
- 事件即真相：WS 事件流 + 前端 event store 增量渲染 + 完整时间线回看（`src/api/event-service/`、`src/stores/use-event-store.ts`）——我们 AgentRun 回放的 UI 数据模型。
- ACP（Agent-Client Protocol）作为接入第三方 agent 的标准协议选项（`docs/ACP_AGENTS.md`）——评估项：我们 CLI 引擎之外要不要支持 ACP。
- MSW mock-LLM E2E 模式（`playwright.mock-llm.config.ts`）——前端/E2E 不被真实 LLM 卡住，值得抄开发流程。

**claude-squad**（⭐8.4k，**AGPL-3.0——只看设计，禁止复制任何代码**）：
- 会话生命周期容错：tmux session 死了不报错，降级为 Paused 等 Resume 重建；启动失败按已创建资源**逆序清理**（worktree 建了但 tmux 失败→清 worktree）。
- 元数据持久化：repo path/worktree path/branch/**base commit SHA** JSON 落盘——base SHA 必须存，否则算不出"本任务净 diff"。
- "暂停即固化"：pause = commit + 摘离进程，resume 重建——任务可挂起数天。
- 反面教材确认：靠 tmux pane 文本 hash 猜"agent 在等确认"的路线脆弱，**协议化（hooks/MCP）才是正道**——我们已在这条路上。
- diff `+n/-m` 统计常驻任务列表——并行任务总览性价比最高的 UI 信号。

---

## 7. 按缺口归并的实施建议

### G1 代码平面（P1，先做最小闭环）
1. api-server：repo 表补 `default_target_branch`、任务级 `target_branch`；任务详情页展示分支/commit/PR 状态。
2. agent-runtime：执行产物 commit 后自动 `push`（带 `git_branch_prefix` 前缀分支）；凭据走 secrets 租约。
3. api-server：`GitHostProvider` 抽象 + GitHub 实现（gh CLI 或 API）——建 PR（AI 生成描述）→ `pr_monitor` 60s 轮询 → merged/closed 回写任务状态。
4. 参照清单：vibe-kanban `crates/git-host`、`routes/workspaces/pr.rs`、`pr_monitor.rs`；OpenHands `git-service` API 面。

### G2 DoD 验证门（P0 起步、P1 成型）
1. P0-协议层：commit 协议加结构化 `evidence`（AC 索引 + 命令/测试输出）；任务模板引入 AC 索引化（Backlog.md）。
2. P0-事件层：agent hooks（Stop/PermissionRequest）驱动任务状态迁移，替代自述（cline/kanban）。
3. P1-执行层：ExecutorAction 链引入 `verify` 节点——agent 完成后自动跑项目验证命令（repo 级配置），失败自动带日志 follow-up 打回 agent（vibe-kanban `actions/mod.rs` + commit reminder 思路）。
4. P1-人感层：diff 行内评论→聚合→follow-up；可选"AI 审查员"进程。
5. 落点分布：api-server（协议/状态机/verify 配置）、agent-runtime（hooks 注入、verify 执行）、webpage（diff 评论、证据展示）。

### G3 任务级沙箱（P0 细节补强、P1 模型对齐）
1. P0：worktree 管理实战细节——symlink 依赖复用、创建锁、半成品逆序清理、base SHA 持久化、孤儿/过期清理任务、分支统一前缀（kanban + claude-squad + vibe-kanban）。
2. P0：turn 级 checkpoint refs（可回溯可 diff，零侵入）。
3. P1：数据模型对齐 workspace+session+execution_process 三层；每执行不可变记录含 before/after head commit。
4. P2（若做云端沙箱）：omnara 机器池三层覆盖 + idle 回收 + runtime protection。

### MCP 工具面（P1）
1. 工具分级加载（core/standard/all）+ 长任务 operation_id 轮询（claude-task-master）。
2. `get_context` 启动注入（repo/branch/task 元数据）+ orchestrator 模式试点（agent 自建子任务/子会话，接我们 TeamTaskOrchestration）。

### 治理/审批（P1）
1. 审批模型升级为统一表单协议（context 证据对 + questions 选项），对接 agent 工具级审批桥（omnara interactionform + vibe-kanban approvals）。
2. 权限分级 `Auto|Supervised|Plan` 显式映射到各 agent flag，作为"自治权限渐进"的产品化表达（vibe-kanban permission_policy）。
3. DB trigger 固化状态机不变量（omnara），先从租约与审批两张表开始。

### 卖点/文案（随手抄）
- 主叙事抄 vibe-kanban 句式：「人类管 plan 和 review，agent 管执行」+ 我们独有的治理证据链。
- 流程叙事抄 Backlog.md 三个审查检查点（审 spec→审 plan→审 code）+「一任务=一上下文=一 PR」。
- 智能叙事抄 claude-task-master 流水线（PRD→任务→复杂度→逐个执行）。

---

## 8. 许可证与合规

| 仓库 | 许可 | 约束 |
|---|---|---|
| vibe-kanban / omnara / cline-kanban | Apache-2.0 | 可借鉴代码，保留版权声明；大段复制需 NOTICE |
| Backlog.md / OpenHands | MIT | 宽松，保留版权声明即可 |
| claude-task-master | 自定义（GitHub 识别为 NOASSERTION） | 只借鉴思路/提示词；引用代码前先读根 LICENSE |
| claude-squad | **AGPL-3.0** | **禁止复制任何代码**，仅限设计思路参考 |

## 9. 后续维护

- 参考库更新：`references/` 各仓库 `git fetch --depth=N` 或 `--unshallow`。
- 本文按季度或大版本复盘时更新；落地一项在 §0 表格标记状态。
- 深挖单个主题（如 G2 执行链设计稿）时，从 §0 表格的来源列回 `references/` 原文件。
