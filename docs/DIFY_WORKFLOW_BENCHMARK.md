# Dify 工作流引擎对标与借鉴计划

> 版本：v1.0（2026-09-18）
> 调研对象：Dify main（2026-09 浅拷贝，位于仓库外 `/Users/cc11001100/github/todo-for-ai/references/dify`）。
> 对照：我们已有的 DAG 工作流引擎（依赖/条件/并行/子工作流/重试/on_failure/版本快照/cron 触发/SSE 控制台/React Flow 画布/Dify-Coze 连接器/执行闭环，见 `docs/WORKFLOW_CANVAS_AND_INTEGRATIONS.md`）。
> 本文是「抄什么、从哪抄、抄到哪」的执行清单，格式沿用 `docs/REFERENCE_BENCHMARK.md`。

---

## 0. 许可证红线（先读这个）

Dify 采用**修改版 Apache 2.0**（`references/dify/LICENSE`）：
1. **多租户限制**：未经书面授权，不得用 Dify 源码运营多租户环境（一个 tenant = 一个 workspace）——todo-for-ai 恰是 workspace 多租户模型，**整仓/大段拷码不可行**；
2. **LOGO/版权**：使用其 `web/` 前端不得移除 LOGO 与版权信息；
3. 另有外观专利声明。

**结论**：借鉴架构与产品概念、自己实现代码 = 安全；拷代码 = 让整个项目变成 Dify 衍生物并背上商业授权风险。本文所有条目均为"概念借鉴 + 自研实现"。

另一个结构性事实：**Dify 的图引擎已抽成独立 PyPI 包 `graphon==0.7.0`**（`api/pyproject.toml`），本仓库只有编排层（`api/core/workflow/workflow_entry.py`）、节点工厂（`node_factory.py`）与 Dify 自有节点；引擎内部（queue+worker 池+事件流+layers）不在本地，API 仍在剧烈变动——照抄其内部既不可行也不明智，抄**接口形状**。

## 1. Dify 工作流能力地图（30+ 节点 / 五大类）

- **触发/入口**：`start`（表单变量）、`trigger-webhook`（`api/core/workflow/nodes/trigger_webhook/node.py`，7 种 method、原始 payload 入池）、`trigger-schedule`（cron/可视化频率，`nodes/trigger_schedule/`）、`trigger-plugin`（插件事件订阅，依赖 plugin daemon）、`datasource`（RAG 专用）。
- **LLM/智能**：`llm`（graphon 内置，一次补全 + structured_output）、`agent`/`agent_v2`（两代并存，v2 连独立 agent backend）、`question-classifier`、`parameter-extractor`。
- **逻辑/转换**：`if-else`（case→sourceHandle 边）、`code`（Python/JS 沙箱）、`template-transform`（Jinja2 沙箱渲染）、`variable-aggregator`/`assigner`、`list-operator`、`document-extractor`、`http-request`（SSRF 代理+超时/大小限制）。
- **知识**：`knowledge-retrieval`（dataset_ids + 单/多路召回）、`knowledge-index`。
- **流程**：`iteration`（数组并行）、`loop`（while）、`tool`、`answer`/`end`。
- **HITL**：`human-input`（表单暂停/恢复，见 §3.4）。

## 2. 已重复、不用抄

并行分支与依赖拓扑、条件分支、子工作流、重试、失败策略（abort/skip/continue）、版本快照、cron/一次性触发、SSE 实时控制台、React Flow 画布基础、Dify/Coze API 连接器——我们全部已有，且部分语义更完整（版本 diff/回滚、声誉/经验沉淀）。

## 3. 值得借鉴的 Top 10 与波次规划

| # | 借鉴点 | Dify 参考 | 我们的落点 | 波次 |
|---|---|---|---|---|
| 1 | **DSL 导入导出**（可移植/可分享；导出清洗 credential/敏感字段；导入版本兼容校验 + leaked-dependencies 拒绝） | `api/services/app_dsl_service.py`（1125 行）：导出 `_append_workflow_export_data` L793-864、依赖提取 L943-1019、版本 `api/constants/dsl_version.py` + `services/dsl_version.py`；清洗清单 L834-850 | ✅ **Wave 1 已落地**（2026-09-18）：`api/agents/workflow_dsl.py` + `GET /agents/workflows/<id>/export`、`POST /agents/workflows/import`；api_key 永不出平台、agent_id/task_template_id 置空、子工作流按名导出/按名解析（缺失拒绝）；webpage 导入/导出按钮 | ✅ |
| 2 | **单节点调试 + last-run 预填**（不建运行记录跑一个节点） | `workflow_entry.py:202-315 single_step_run`、`workflow.py:1657 last-run 端点` | ✅ **Wave 1 已落地**：`api/agents/workflow_test_run.py` + `POST /agents/workflows/<id>/steps/<key>/test-run`——agent 步骤出任务预览（选中 Agent + 内容，零副作用），dify/coze 步骤真实调用；画布面板「测试运行」按钮 | ✅ |
| 3 | **系统变量前缀**（`sys.*` 命名空间，Dify `variable_prefixes.py` 只有 4 个固定前缀） | `api/core/workflow/variable_prefixes.py`、`system_variables.py` | ✅ **Wave 1 已落地**：`{{sys.run_id/workflow_id/workflow_name/project_id/root_task_id/root_task_title/step_key/step_name/step_description}}`；未知 sys.* 渲染空串不透传 | ✅ |
| 4 | **节点级 error_strategy=default-value**（失败后用预设默认输出继续跑；fail-branch 作为图边） | 前端 `web/app/components/workflow/nodes/_base/components/error-handle/types.ts`（`none|fail-branch|default-value` + `default_value:[{key,type,value}]`）；执行点 `workflow_app_runner.py:586-607` | Wave 2：`WorkflowStep.default_outputs`（JSON）+ `on_failure=default`——失败时把默认值写 SharedContext 并按成功推进；画布面板配默认值 | Wave 2 |
| 5 | **暂停/恢复 = 整图状态快照**（HITL/审批等待的通用底座） | `api/core/app/layers/pause_state_persist_layer.py:39-67`（WorkflowResumptionContext pydantic 信封，大状态下放对象存储）+ `api/tasks/async_workflow_tasks.py:203-300 resume` | Wave 2：run 表加 pause_state（JSON/对象存储），pause 时快照 step_runs+context，恢复时重放；对「Agent 任务等人审批」场景价值最大 | Wave 2 |
| 6 | **触发器三层分离**（定义/登记/日志）+ **next_run_at 轮询器**（`for update skip_locked` 批取 + per-tick 熔断） | `api/models/trigger.py:221-420`（AppTrigger/WorkflowSchedulePlan/WorkflowWebhookTrigger/WorkflowTriggerLog）、`api/schedule/workflow_schedule_task.py:17-112` | Wave 2：我们 workflow_triggers 已有定义+登记，缺**触发日志表**与常驻轮询（现靠外部打 fire-triggers，roadmap 已列）；照抄 skip_locked 批取 + 熔断限流 | Wave 2 |
| 7 | **节点执行 trace 增强**（index 排序号/predecessor_node_id/process_data 中间态/execution_metadata token 费用） | `api/models/workflow.py:969-1140`（WorkflowNodeExecutionModel）、trace 端点 `workflow_run.py:256-312` | Wave 2：WorkflowStepRun 补 process_data/execution_metadata 列 + 控制台渲染（token/费用我们对齐 LLM 网关指标） | Wave 2/3 |
| 8 | **HTTP 通用请求节点**（SSRF 防护、超时/响应大小限制） | graphon 内置，Dify 装配 `node_factory.py:371-379` | Wave 2：连接器加 `provider: "http"`（method/url/headers/body 模板渲染），复用现有 dispatch；SSRF 防护抄概念（私网地址黑名单） | Wave 2 |
| 9 | **引擎层 hooks**（on_graph_start/on_node_run_*/on_event/on_graph_end，把限流/日志/可观测外挂） | `pause_state_persist_layer.py:77` 签名注释、`layers/observability.py` | Wave 3：`_advance_workflow`/`complete_step_run` 外挂事件层，SSE/审计/配额不再侵入主循环 | Wave 3 |
| 10 | **LLM 生成工作流**（需求文本→graph DSL，planner+node-builder 分步 prompt + 校验循环） | `api/core/workflow/generator/`（runner + prompts） | Wave 3：canvas「AI 生成工作流」——LLM 产出我们的 DSL JSON → 导入校验 → 一键建流；我们已有 ai_task_split/planner 基建可复用 | Wave 3 |

**审慎清单（不建议抄）**：
- `llm` 一次补全节点：与我们「步骤=Agent 任务」模型冲突（Dify 自己在 agent/agent_v2 两代间挣扎）；LLM 调用应做成 Agent 执行模式而非新节点类型；
- `conversation` 会话变量/跨轮 memory：为 chatflow 设计，我们是任务型工作流，引入变量跨运行生命周期的隔离负担不值；
- graphon 依赖化引擎：API 剧烈变动，抄形状不引依赖；
- trigger-plugin/插件 daemon：与我们的连接器路线冲突，事件订阅在连接器层做；
- RAG pipeline 专属件（datasource/knowledge_index/rag 前缀）：无对应场景；
- HITL 多接收者/审批渠道矩阵：企业多角色才需要，先做单接收者 + token 表单 + 超时兜底（其 WAITING/TIMEOUT/EXPIRED/SUBMITTED 状态机值得照抄，`nodes/human_input/enums.py`）。

## 4. Dify 关键实现笔记（供后续波次查阅）

- **执行模型**：graphon = queue-based + event-driven + worker 池（3~10 workers，`workflow_entry.py:152-163` 装配）；`engine.run()` 是事件生成器，Dify 侧 `_handle_event`（`workflow_app_runner.py:418-732`）逐事件转 SSE Queue。我们顺序调度+局部并行够用，不抄 worker 池。
- **命令通道**：`CommandChannel`（Abort/暂停指令入引擎，InMemory/Redis/Celery 实现，`command_channels.py:41-98`）——外部停止运行的干净抽象，Wave 3 可借鉴给我们的 cancel 加"协作式取消"。
- **单节点调试实现细节**：`run_free_node` 凭空造 start→目标节点迷你图（`workflow_entry.py:317-361`）；调试结果持久化为 triggered_from=SINGLE_STEP 的 node_execution 供 last-run 预填。
- **DSL 版本策略**：只比 major（跨 major 拒绝→PENDING 待确认，minor 落后→带警告导入）。
- **导出清洗清单**（抄为防泄漏基线）：tool/agent credential_id、webhook_url、schedule config、subscription_id、dataset_ids（tenant 派生 AES）。
- **调度轮询**：`poll_workflow_schedules` 每 tick `SELECT ... WHERE next_run_at <= now FOR UPDATE SKIP LOCKED LIMIT N` → 计算下次时间 → Celery group 派发 + 熔断计数。

## 5. 交付记录

- **Wave 1（2026-09-18，本批）**：上表 #1/#2/#3 ✅——api-server `feat/workflow-dify-wave1`（19 新测试）、webpage `feat/workflow-dify-wave1-ui`（导入/导出/测试运行 UI）。
- Wave 2/3：见上表待办，逐波独立交付。
