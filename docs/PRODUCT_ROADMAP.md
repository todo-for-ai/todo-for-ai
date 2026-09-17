
> **进展（2026-09-18）**：Dify 工作流引擎系统性对标 + Wave 1 借鉴落地（api-server + webpage，详见 `docs/DIFY_WORKFLOW_BENCHMARK.md`）：
> - ✅ 对标方法：克隆 Dify main 浅拷贝至 references/dify，通读编排层/节点/DSL/HITL/触发器（其图引擎已抽为 graphon PyPI 包）；许可证为修改版 Apache 2.0，含**多租户 SaaS 限制**——todo-for-ai 是 workspace 多租户模型，**只借鉴概念自研实现，不拷代码**
> - ✅ Wave 1 ①：**DSL YAML 导入导出**（借鉴 Dify app_dsl_service 的可移植性 + 泄漏防护）——导出清洗 api_key/agent_id/task_template_id、子工作流按名导出；导入校验版本兼容/step_key 唯一/依赖存在/成环（Kahn）/子工作流按名解析（缺失拒绝）；`GET /agents/workflows/<id>/export` + `POST /agents/workflows/import` + 页头导入/卡片导出按钮
> - ✅ Wave 1 ②：**单步测试运行**（借鉴 Dify single_step_run）——`POST /agents/workflows/<id>/steps/<key>/test-run`：agent 步骤出「将选中的 Agent + 任务内容」预览（零副作用），dify/coze 步骤真实调用远端并回显输出/错误；画布步骤面板「测试运行」按钮 + 结果卡
> - ✅ Wave 1 ③：**{{sys.*}} 系统变量前缀**（借鉴 Dify variable_prefixes）——run_id/workflow_id/workflow_name/project_id/root_task_*/step_* 九个系统变量可在连接器 inputs 中引用；未知 sys.* 渲染空串不透传
> - ✅ 验收：api-server 新增 19 例（DSL 清洗/往返/校验/路由 + 测试运行三模式 + sys 占位符），套件 46 工作流测试全绿 + 全量门禁 exit 0；webpage tsc/build/319 测试全绿
> - ⏭️ Wave 2（已排）：节点级 default-value 错误策略、暂停/恢复整图快照（HITL 底座）、触发日志表 + next_run_at skip_locked 轮询、HTTP 通用节点（SSRF 防护）；Wave 3：引擎事件层 hooks、LLM 生成工作流
