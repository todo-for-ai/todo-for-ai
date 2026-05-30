# 完整实施计划：组织功能 + 通知系统 + 删除AI摘要

> **目标**：让组织功能真正可用，通知系统形成完整闭环（顶栏铃铛+后端worker），彻底删除AI摘要功能

---

## 第一部分：删除AI摘要功能（前后端彻底清理）

### 要删除的文件
- `todo-for-ai-api-server/api/ai_summarize.py` — 后端API
- `todo-for-ai-webpage/src/pages/` 中任何AI摘要相关页面/组件
- 前端i18n中的摘要相关翻译键

### 要修改的文件
- `todo-for-ai-api-server/app.py` — 移除ai_summarize蓝图注册
- `todo-for-ai-webpage/src/App.tsx` 或路由配置 — 移除摘要路由
- `todo-for-ai-webpage/src/api/` — 移除摘要API客户端

---

## 第二部分：组织功能修复（解决import冲突）

### 核心问题
`api/organizations.py` (stub) 和 `api/organizations/` (完整实现) 同名冲突，导致stub被加载。

### 解决方案
1. 删除 `api/organizations.py`
2. 验证 `api/organizations/` 包中的路由完整：
   - GET/POST /organizations — 列表和创建
   - GET/PUT /organizations/:id — 详情和更新
   - GET /organizations/:id/members — 成员列表
   - POST /organizations/:id/members/invite — 邀请成员
   - PUT/DELETE /organizations/:id/members/:user_id — 更新/移除成员
   - GET /organizations/:id/roles — 角色列表
   - POST /organizations/:id/roles — 创建角色
   - PUT/DELETE /organizations/:id/roles/:role_id — 更新/删除角色
3. 如需补充DELETE /organizations/:id — 添加删除组织端点

---

## 第三部分：通知系统闭环

### 后端已有
- UserNotification模型和API (/notifications, /notifications/unread-count等)
- 任务事件触发 (create_task_notifications)
- Channel配置API (目前在agent_automation下，可用但位置不佳)
- 通知投递调度器 (core/notification_dispatcher.py)
- Provider适配 (webhook/飞书/钉钉/企微)

### 需要补充
1. **前端顶栏通知铃铛**
   - 在TopNavigation.tsx中添加Bell图标
   - 显示未读消息数量badge
   - 点击下拉显示最近通知列表
   - 点击通知跳转到相关页面
   - 支持标记已读

2. **PM2通知调度worker**
   - 在ecosystem.config.js中添加notification-dispatcher进程
   - 运行scripts/run_notification_dispatcher.py
   - 定时消费Redis队列中的待投递通知

3. **Channel API独立** (可选但建议)
   - 将channel路由从agent_automation提取到独立channels.py
   - 保持URL不变，前端无感知

---

## 执行顺序

1. **删除AI摘要** — 清理无关代码
2. **修复组织功能** — 删除stub文件即可让真实代码生效
3. **添加通知铃铛** — 前端组件
4. **添加PM2 worker** — 后端持续运行
5. **验证闭环** — 创建任务→触发通知→铃铛显示→点击查看

---

## 验收标准

- [ ] AI摘要功能彻底消失，前后端无残留代码
- [ ] 组织列表/创建/详情/成员管理/角色管理全部可正常工作
- [ ] 顶栏显示铃铛图标，有新通知时显示未读数字
- [ ] 点击铃铛下拉显示通知列表，点击可跳转
- [ ] PM2中notification-dispatcher进程正常运行
- [ ] 创建任务后，相关用户能在站内通知中看到新消息
