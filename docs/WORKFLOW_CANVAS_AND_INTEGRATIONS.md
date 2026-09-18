# 工作流画布编辑器与外部平台集成（Dify / Coze）

> 2026-09-17 交付。两件事：① 多 Agent 协作工作流的**执行闭环**——步骤任务完成自动推进 DAG；② **用户自定义工作流**的画布式编辑器 + 外部工作流平台连接器。

## 一、执行闭环（多 Agent 协作流程完善）

### 此前的问题

工作流步骤被派发为普通 Agent 任务后，**没有任何机制把"任务完成"传回工作流引擎**：
`POST /workflow-runs/<id>/steps/<key>/complete` 回调只能由人在网页控制台手动点，
或外部通过 MCP 工具触发。真实 Agent 执行的步骤会永远停在 RUNNING，DAG 不推进，
多 Agent 协作流水线实际上断在第一步完成后。

### 现在的链路

```
_start_step 建 Task → agent-runtime pull/claim → Agent 提交 commit
    → commit_task 翻转任务终态
    → maybe_autocomplete_for_task(task_id)   ← 新增挂钩
    → complete_step_run 核心（状态迁移/SharedContext 回写/自动重试/声誉/经验/沙箱收尾）
    → _advance_workflow 推进 DAG → 下游步骤自动派发
```

挂钩覆盖三条任务终态路径（`api/agents/workflow_completion.py::maybe_autocomplete_for_task`）：

| 路径 | 位置 | 行为 |
|---|---|---|
| Agent 提交 | `api/agent_runtime_commit.py` commit_task | succeeded → 步骤成功；failed/cancelled → 步骤失败（触发步骤级自动重试） |
| 人工置 DONE | `api/tasks/routes_tasks.py` 更新任务 | 步骤成功（结果以下游可读的 SharedContext 承载） |
| 评审通过 | `api/tasks/routes_review.py` submit_review approve | 步骤成功 |

防护：只有 RUNNING 状态的步骤会被自动完成（防人工回调与自动回调双写）；
闭环内任何异常回滚并告警，绝不反噬任务提交本身。人工回调路由保留，二者语义一致
（核心逻辑同源于 `complete_step_run`）。

## 二、画布式工作流编辑器（React Flow）

入口：`/workflows` 页工作流卡片上的「画布编辑」按钮（`WorkflowCanvasModal`）。

- **画布**：React Flow（@xyflow/react，已在依赖中）自定义节点 `StepNode`——图标 +
  名称 + step_key + 徽标（指定 Agent / 能力数 / 条件 / 重试 / 子工作流 / 连接器）。
- **连线即依赖**：从节点右侧锚点拖到另一节点左侧即建立 `depends_on`；自动拒绝自环与成环；
  删除连线/节点同步清理依赖引用。
- **右侧配置面板**（`StepConfigPanel`）：名称/描述/上游依赖（只读展示可移除）/指定 Agent/
  要求能力/失败策略/超时/重试/子工作流/条件执行（operator 全集）。
- **坐标持久化**：节点位置存 `definition.layout`（随版本快照留存）；无坐标时 dagre 自动布局；
  工具栏可手动「自动布局」。
- **保存**：走既有 `PUT /agents/workflows/<id>`，自动生成新版本（版本历史/diff/回滚照常可用）。
- 保存前校验：step_key 非空且唯一、依赖引用存在、连接器必填项。

## 三、外部平台连接器（Dify / Coze）

**定位**：不重造 Dify/Coze（Dify 为 AGPL，不可拷码），而是把它们的**工作流**作为本平台
工作流中的一个步骤类型来调用——本平台的 DAG 负责编排（Agent 步骤 + 外部平台步骤混排），
Dify/Coze 负责其擅长的 LLM 应用流。

### 步骤配置

`WorkflowStep.integration_config`（JSON，迁移 000031）：

```json
{
  "provider": "dify",              // dify | coze
  "base_url": "",                  // 留空用官方默认（dify: https://api.dify.ai/v1，coze: https://api.coze.cn）
  "api_key": "app-...",            // 明文入库即加密（encrypt_str），API 回传脱敏 ••••xxxx + api_key_set
  "workflow_id": "",               // coze 必填
  "inputs": {"query": "{{step_result_research}}"},
  "timeout_seconds": 100
}
```

- **dify**：`POST {base}/v1/workflows/run`（blocking 模式），`data.status == "succeeded"` 视为成功，
  `data.outputs` 写入步骤 `result_summary`。
- **coze**：`POST {base}/v1/workflow/run`，`code == 0` 视为成功，`data`（JSON 字符串）解析后写入。
- **输入占位符**：`{{step_result_上游key}}`（上游 SharedContext 输出）、`{{context.名}}`（运行参数）、
  `{{root_task_title}}`、`{{root_task_id}}`、`{{run_id}}`、`{{step_key}}`、`{{step_description}}`；未知占位符替换为空串。

### 执行语义

- 配置了连接器的步骤**不创建 Agent 任务**：`_start_step` 直接外呼远端 API，远端结果经
  同一个 `complete_step_run` 核心回写——DAG 推进 / 自动重试 / 失败策略 / SSE 实时控制台
  与 Agent 步骤完全一致。
- 默认后台线程执行（不阻塞请求路径）；失败按步骤 `retry_count` 自动重试，`on_failure`
  策略（abort/skip/continue）照常生效。
- provider 非法的配置在保存时即被 400 拒绝；直写模型的脏配置回退为普通 Agent 步骤。

## 四、顺带修复的既有 bug（主干上即可复现）

| Bug | 影响 | 位置 |
|---|---|---|
| `launch_workflow` 用了未导入的 `Project` | HTTP 启动运行必 500 | api/agents/workflow_runs.py |
| `create_workflow` / `launch_workflow` / 子工作流启动缺 `flush()` | 建工作流（带步骤）/ 启动运行 / 子工作流必崩（id 为 None） | workflow_routes / workflow_runs / _workflow_helpers |
| 列表端点 `args.get(k, type=)`（dict 无此签名） | 工作流/运行/审计/外部 Agent 列表全 500 | workflow_routes / workflow_runs / maintenance / cross_project |
| `paginate_query(query, args)` 传 dict + `ApiResponse.paginated` 不存在 + 分页后双重 to_dict | 同上 | api/base.py + 四个列表端点 |
| `list_audit_logs` 缺 `or_` 导入 | 审计列表 500 | maintenance.py |

## 五、验证

- api-server：新增 `tests/unit/api/test_workflow_loop_and_external.py` 27 例
  （闭环四路 + commit HTTP E2E：introspect → 启动 → commit → 断言下游步骤自动启动；
  连接器全链路：加密/脱敏/占位符渲染/dify/coze/失败重试/路由校验/列表回归），全量门禁通过。
- webpage：tsc 零新增错误 + vite build 通过 + vitest 314 passed；画布文件 eslint 0 问题。
- 浏览器 GUI 冒烟（worktree 后端 :5099 + dev 前端 :5199，scratch sqlite）：
  模板实例化 → 画布打开 → 节点选中 → 连接器开关 + Dify Key 填写 → 保存 →
  API 复核 version=2、`definition.layout` 持久化、`integration_config` 密文落库且回读脱敏。

## 六、后续方向（未做）

- WorkflowTrigger 常驻调度（当前仍依赖外部周期打 `POST /maintenance/fire-triggers`）。
- 运行态画布（run console 以画布展示步骤实时状态，复用本编辑器节点）。
- 连接器扩展：n8n / 通用 HTTP webhook 步骤类型；连接器连通性测试按钮（test connection）。
- agent-runtime 感知工作流（步骤任务的提示词带上步骤元数据，进一步缩短交接断点）。
