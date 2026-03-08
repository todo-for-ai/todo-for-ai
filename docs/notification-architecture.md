# 通知系统架构说明

## 目标

把通知能力抽象成统一平台模块，而不是零散页面逻辑：

- 任意业务点都可以发出统一的 Notification Event
- 站内信、外部通知、已读未读、重试、投递审计都围绕事件中心展开
- 外部发送通过 Redis 队列异步执行，避免请求线程直连第三方
- 不引入 Kafka / RabbitMQ，先用现有 Redis 做可靠队列和分布式锁

## 后端模块

### 1. 事件层
- notification_events
- 对外暴露统一事件类型目录
- 每个事件只保留一条 canonical log

### 2. 站内信层
- user_notifications
- 面向用户收件箱，记录已读/未读、跳转链接、正文

### 3. 外部投递层
- notification_deliveries
- 一条 event + 一条 channel = 一条 delivery
- 记录状态、尝试次数、下次重试、请求快照、返回摘要

### 4. 队列层
- core/notification_queue.py
- Redis List: ready queue
- Redis ZSet: retry schedule
- Redis NX Lock: 同一 delivery 只允许一个 worker 真正处理

### 5. 发送层
- core/notification_providers.py
- 负责 provider payload 渲染和 HTTP 发送
- 当前支持：webhook / feishu / wecom / dingtalk

### 6. 调度层
- core/notification_dispatcher.py
- 负责提升到期重试任务、消费 ready queue、失败退避、更新 event / delivery 状态

### 7. Worker
- scripts/run_notification_dispatcher.py
- 可单次执行，也可常驻轮询

## 关键数据流

1. 业务代码发出通知事件
2. 写入 notification_events
3. 生成 user_notifications
4. 解析组织 / 项目 / 个人外部 channel
5. 创建 notification_deliveries
6. 事务提交后把 delivery 入 Redis 队列
7. Worker 消费并发送
8. 成功则标记 sent；失败则 retry/dead

## 可靠性策略

- 事件日志和 delivery 先落库，再入队
- Redis 负责 ready queue + retry schedule
- worker 消费时用 Redis 锁避免并发重复发送
- notification_deliveries(event_id, channel_id) 设唯一索引，避免重复投递记录
- 即使队列里重复消息，也会在 DB 状态检查时被跳过
- Redis 不可用时，worker 仍可从数据库扫描到期 pending/retrying 任务进行补偿

## 运行方式

- 单次补偿：python3 todo-for-ai-api-server/scripts/run_notification_dispatcher.py --once
- 常驻 worker：python3 todo-for-ai-api-server/scripts/run_notification_dispatcher.py

## 前端模块

- src/modules/notifications/
- hooks/useNotifications.ts
- hooks/useNotificationCatalog.ts
- hooks/useNotificationChannels.ts
- constants.ts

前端职责：
- 收件箱列表与未读数展示
- 站内通知偏好配置
- 组织 / 项目 / 个人三级 channel 配置
- 统一复用事件目录和 channel 管理逻辑

## 后续可扩展点

- 浏览器实时推送（SSE / WebSocket）
- 批量聚合通知
- 静默时段 / 免打扰
- 平台级通知模板
- 投递监控面板
