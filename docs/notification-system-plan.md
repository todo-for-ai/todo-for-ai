# 通知中心功能规划

## 1. 背景与目标

当前仓库已经具备一部分“外部通知通道”的基础设施：

- 后端已有 `notification_channels`、`notification_deliveries`、`task_event_outbox` 三张表；
- 已支持按 `user / organization / project` 范围维护 channel；
- 但目前只覆盖 agent automation 侧的 webhook 通道；
- 尚未有真正的“站内信 / 通知中心”模型、收件箱接口、未读统计和 UI；
- 也没有把任务创建、完成、被提及、被分配等业务事件统一抽象成通知事件目录。

本次目标不是一次性做完所有集成，而是先把通知功能规划成一个可逐步上线的系统，并优先落地“最小可用版本”：

1. 有统一的站内通知模型；
2. 有统一的通知事件目录；
3. 有组织 / 项目 / 个人三级通知配置；
4. 有站内信收件箱与未读能力；
5. 有对外同步的 provider 适配层，先支持 webhook schema，预留飞书 / 企业微信 / 钉钉；
6. 先保证“任务创建 / 状态完成 / 被提及 / 被分配”这几类高价值事件可跑通。

## 2. 术语与对象

### 2.1 通知事件（Notification Event）

指业务上发生的、可驱动通知的事件。例如：

- `task.created`
- `task.completed`
- `task.assigned`
- `task.mentioned`
- `task.status_changed`

每个事件需要包含：

- `event_type`
- `event_id`
- `occurred_at`
- `actor`：谁触发
- `resource`：关联任务 / 项目 / 组织
- `targets`：应该收到通知的人
- `payload`：标题、摘要、链接、字段 diff 等

### 2.2 站内通知（In-App Notification）

发给具体用户的站内消息，是用户收件箱里的实体。至少需要支持：

- 标题、摘要、正文 / 扩展内容
- 分类（任务、邀请、系统）
- 优先级
- 已读 / 未读
- 点击跳转链接
- 幂等键（避免重复插入）
- 与原始事件关联（event_id / event_type）

### 2.3 外部通道（External Channel）

把通知同步到外部平台的配置实体。按范围分为：

- 组织级
- 项目级
- 个人级

每个范围下可以配置多条 channel，例如：

- 飞书机器人
- 企业微信机器人
- 钉钉机器人
- 通用 webhook

## 3. 范围与优先级

### 3.1 本轮优先实现

- 统一通知事件目录与元数据；
- 站内通知数据模型与 API；
- 任务事件到站内通知的生成链路；
- 组织 / 项目 / 个人三级通知配置接口；
- 外部 provider schema 设计与基本校验；
- 前端个人通知中心入口与通知配置 UI；
- 前端项目 / 组织通知配置入口的基础表单；
- 先实现通用 webhook 出口，并把飞书 / 企业微信 / 钉钉作为 provider 类型纳入配置模型。

### 3.2 本轮暂不深入

- App 内实时推送（WebSocket / SSE）；
- 复杂通知模板编辑器；
- 外部平台富卡片的全部格式能力；
- 高级频控、聚合、静默时段；
- 完整消息中心首页 redesign。

## 4. 推荐的事件目录

建议先固定一份事件目录，供站内和外部通道共用：

### 4.1 任务类
- `task.created`
- `task.updated`
- `task.status_changed`
- `task.completed`
- `task.assigned`
- `task.unassigned`
- `task.mentioned`
- `task.due_soon`
- `task.overdue`

### 4.2 协作类
- `project.member_added`
- `organization.member_invited`
- `organization.member_joined`

### 4.3 系统类
- `system.announcement`
- `system.agent_run_failed`

其中本轮建议真正接线的只有：

- `task.created`
- `task.completed`
- `task.assigned`
- `task.mentioned`

## 5. 配置优先级与覆盖规则

通知配置需要支持三级覆盖：

1. 项目级
2. 组织级
3. 个人级

推荐规则：

- **站内通知**：默认总是可用，但个人可以关闭某些事件；
- **外部同步**：按“最近范围优先”解析；
- 如果项目级存在某事件的显式配置，则优先使用项目级；
- 如果项目级未配置，则回退到组织级；
- 如果组织级未配置，则回退到个人级；
- 同一范围内允许多个 channel 同时命中；
- `enabled=false` 表示该 channel 完全禁用；
- 事件列表为空表示“订阅该范围下全部事件”；
- 后续若要支持“显式屏蔽”，可增加 `mode=allow|deny`。

## 6. 数据模型设计

## 6.1 复用现有表

### `notification_channels`
扩展为通用通知通道配置表，新增语义：

- `channel_type` 不再只限 `in_app/webhook`，扩展为：
  - `in_app`
  - `webhook`
  - `feishu`
  - `wecom`
  - `dingtalk`
- `config` 按 provider 保存：
  - webhook：`url`、`headers`
  - 飞书：`webhook_url`、`secret`
  - 企业微信：`webhook_url`、`mentioned_list`、`mentioned_mobile_list`
  - 钉钉：`webhook_url`、`secret`、`at_mobiles`

### `notification_deliveries`
继续作为外部投递审计表，记录：

- 投递到哪条 channel；
- 本次发送状态；
- HTTP 响应摘要；
- 重试信息。

### `task_event_outbox`
本轮继续沿用，但将语义从“仅 agent automation 事件”提升为“通知 / 自动化共用的业务事件 outbox”。

## 6.2 新增表：`user_notifications`

建议新增站内通知表：

- `user_id`
- `event_id`
- `event_type`
- `category`
- `title`
- `body`
- `level`
- `link_url`
- `resource_type`
- `resource_id`
- `actor_user_id`
- `project_id`
- `organization_id`
- `extra_payload`
- `read_at`
- `archived_at`
- `dedup_key`

建议索引：

- `(user_id, read_at, created_at)`
- `(event_type, created_at)`
- `dedup_key unique`

## 6.3 新增表：`notification_event_logs`（可选）

如果后续希望把“原始通知事件”与“每个收件人的站内信”解耦，可以增加事件日志表；本轮可先不做，直接以 outbox + user_notifications 为主。

## 7. 后端处理链路

### 7.1 事件产生

优先挂在现有 `api/tasks.py` 的创建 / 更新链路中：

- 创建任务后：
  - 生成 `task.created`
- 状态切到 done 后：
  - 生成 `task.completed`
- assignees 发生变化时：
  - 为新增 assignee 生成 `task.assigned`
- mentions 发生变化时：
  - 为新增 mention 生成 `task.mentioned`

### 7.2 站内通知生成

新增一个通知服务层，例如：

- `services/notification_catalog.py`
- `services/notification_service.py`
- `services/notification_delivery_service.py`

其中：

- `notification_catalog`：维护事件目录、显示名、默认模板、默认目标解析策略；
- `notification_service`：根据事件生成站内通知；
- `notification_delivery_service`：解析三级配置并创建外部投递记录。

### 7.3 外部同步

推荐采用 outbox 模式：

1. 业务事件写入 `task_event_outbox`；
2. 同步调用先完成站内通知插入；
3. 对命中的外部 channel 创建 `notification_deliveries`；
4. 实际发送先做同步版本或简单 worker，后续再独立后台任务。

## 8. API 设计

## 8.1 站内通知

### GET `/notifications`
支持：

- `unread_only`
- `category`
- `page`
- `per_page`

### GET `/notifications/unread-count`
返回未读数。

### POST `/notifications/<id>/read`
单条已读。

### POST `/notifications/read-all`
全部已读。

## 8.2 通知配置

建议保留现有 channel API 路径，但升级字段校验与 provider 能力：

- `GET /users/:id/channels`
- `POST /users/:id/channels`
- `GET /organizations/:id/channels`
- `POST /organizations/:id/channels`
- `GET /projects/:id/channels`
- `POST /projects/:id/channels`
- `PATCH /channels/:id`
- `DELETE /channels/:id`

建议增加：

### GET `/notification-event-catalog`
返回所有可配置事件与默认说明。

### GET `/projects/:id/effective-channels?event_type=...`
保留现有接口，但返回更明确的 provider 信息和继承来源。

## 9. 前端设计

## 9.1 个人设置页

在 `Settings` 中增加：

- “站内通知偏好”
- “外部通知渠道”

个人级可以配置：

- 是否接收站内通知；
- 哪些事件接收站内通知；
- 飞书 / 企业微信 / 钉钉 / Webhook 渠道列表。

## 9.2 项目 / 组织设置页

分别在项目页和组织页增加“通知设置”区块：

- 查看当前范围的通知渠道；
- 新增 / 编辑 / 删除 channel；
- 选择事件类型；
- 填写 provider 参数；
- 显示继承关系说明。

## 9.3 通知中心

最小版本建议放在顶栏铃铛或个人菜单里，支持：

- 未读红点；
- 最近通知列表；
- 标记已读；
- 点击跳转任务详情。

## 10. Provider 适配建议

统一 provider schema：

- `channel_type`
- `config`
- `render(payload)`
- `send(rendered_payload)`

### 10.1 Webhook
直接 POST 标准 JSON：

- `title`
- `text`
- `event_type`
- `link_url`
- `resource`
- `actor`

### 10.2 飞书
先支持机器人 webhook 文本消息，后续再升级卡片。

### 10.3 企业微信
先支持机器人 markdown / text。

### 10.4 钉钉
先支持机器人 markdown / text。

## 11. 安全与权限

- 只有本人可管理个人通知配置；
- 只有项目管理员可管理项目级配置；
- 只有组织管理员可管理组织级配置；
- 凭证类字段需要脱敏回显；
- 后续建议把 secret 单独加密存储；
- 站内通知查询只能看自己的通知。

## 12. 本轮实施拆分

### 阶段 A：基础能力
- 新增 `user_notifications` 表；
- 新增通知目录；
- 新增通知 API；
- 升级 `notification_channels` 的 provider 校验。

### 阶段 B：事件接线
- 在任务创建 / 更新时生成 `task.created` / `task.completed` / `task.assigned` / `task.mentioned`；
- 生成站内通知；
- 为命中的外部 channel 记录投递。

### 阶段 C：前端入口
- 设置页新增个人通知配置；
- 新增通知中心页面；
- 项目 / 组织页加入通知设置面板。

### 阶段 D：外部发送
- 实现 webhook 真发送；
- 为飞书 / 企业微信 / 钉钉增加 provider formatter；
- 增加失败重试和审计。

## 13. 本次实际执行范围

本次代码改动按“最小可用版本”推进：

1. 写入本规划文档；
2. 落地后端 `user_notifications` 模型、迁移、API；
3. 把任务事件接到站内通知；
4. 扩展 channel provider 类型与校验；
5. 补一个基础前端通知中心页面；
6. 在设置页增加个人通知配置入口；
7. 暂不实现真正的第三方 HTTP 发送，只先把 provider 配置与投递记录基础打通。

## 14. 验收标准

- 创建任务后，相关用户能在站内通知中看到 `task.created`；
- 任务完成后，相关用户能收到 `task.completed`；
- 新增 assignee / mention 后，对应用户能收到站内通知；
- 可以查询未读数、单条已读、全部已读；
- 可以在个人 / 项目 / 组织维度创建通知 channel；
- channel 可以选择飞书 / 企业微信 / 钉钉 / webhook；
- 配置表单和接口能校验基本必填字段；
- 现有 agent automation 侧 channel API 不被破坏。

