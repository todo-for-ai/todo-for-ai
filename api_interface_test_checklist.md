# API接口测试清单 - 统一数据结构验证

## 测试目标
验证todo-for-ai-api-server/api下的每一个接口的响应数据结构是否符合统一的数据结构要求。

## 统一响应格式规范
```json
{
  "code": 200,           // HTTP状态码
  "message": "Success",  // 响应消息
  "data": {...},         // 数据内容（可选）
  "path": "/api/path",   // 请求路径
  "timestamp": "ISO时间戳" // 时间戳
}
```

## 基础路由接口
- [x] GET `/` - 根路径 ✅ 符合统一格式
- [x] GET `/health` - 行业标准健康检查 ✅ 符合统一格式
- [x] GET `/todo-for-ai/api/v1/health` - API版本健康检查 ✅ 符合统一格式

## Auth模块接口 (`/todo-for-ai/api/v1/auth`)
- [ ] GET `/todo-for-ai/api/v1/auth/login` - 启动登录流程
- [ ] GET `/todo-for-ai/api/v1/auth/login/github` - GitHub登录
- [ ] GET `/todo-for-ai/api/v1/auth/login/google` - Google登录
- [ ] GET `/todo-for-ai/api/v1/auth/callback` - OAuth回调（兼容）
- [ ] GET `/todo-for-ai/api/v1/auth/callback/github` - GitHub回调
- [ ] GET `/todo-for-ai/api/v1/auth/google/callback` - Google回调
- [ ] POST `/todo-for-ai/api/v1/auth/logout` - 用户登出
- [ ] GET `/todo-for-ai/api/v1/auth/me` - 获取当前用户信息
- [ ] PUT `/todo-for-ai/api/v1/auth/me` - 更新当前用户信息
- [ ] POST `/todo-for-ai/api/v1/auth/verify` - 验证JWT令牌
- [ ] POST `/todo-for-ai/api/v1/auth/refresh` - 刷新访问令牌
- [ ] GET `/todo-for-ai/api/v1/auth/users` - 获取用户列表
- [ ] GET `/todo-for-ai/api/v1/auth/users/{id}` - 获取指定用户信息
- [ ] PUT `/todo-for-ai/api/v1/auth/users/{id}/status` - 更新用户状态

## Projects模块接口 (`/todo-for-ai/api/v1/projects`)
- [ ] GET `/todo-for-ai/api/v1/projects` - 获取项目列表
- [ ] POST `/todo-for-ai/api/v1/projects` - 创建新项目
- [ ] GET `/todo-for-ai/api/v1/projects/{id}` - 获取单个项目详情
- [ ] PUT `/todo-for-ai/api/v1/projects/{id}` - 更新项目
- [ ] DELETE `/todo-for-ai/api/v1/projects/{id}` - 删除项目
- [ ] POST `/todo-for-ai/api/v1/projects/{id}/archive` - 归档项目
- [ ] POST `/todo-for-ai/api/v1/projects/{id}/restore` - 恢复项目
- [ ] GET `/todo-for-ai/api/v1/projects/{id}/tasks` - 获取项目任务列表
- [ ] GET `/todo-for-ai/api/v1/projects/{id}/context-rules` - 获取项目上下文规则

## Tasks模块接口 (`/todo-for-ai/api/v1/tasks`)
- [ ] GET `/todo-for-ai/api/v1/tasks` - 获取任务列表
- [ ] POST `/todo-for-ai/api/v1/tasks` - 创建新任务
- [ ] GET `/todo-for-ai/api/v1/tasks/{id}` - 获取单个任务详情
- [ ] PUT `/todo-for-ai/api/v1/tasks/{id}` - 更新任务
- [ ] DELETE `/todo-for-ai/api/v1/tasks/{id}` - 删除任务

## Context Rules模块接口 (`/todo-for-ai/api/v1/context-rules`)
- [ ] GET `/todo-for-ai/api/v1/context-rules` - 获取上下文规则列表
- [ ] POST `/todo-for-ai/api/v1/context-rules` - 创建新的上下文规则
- [ ] GET `/todo-for-ai/api/v1/context-rules/{id}` - 获取单个上下文规则详情
- [ ] PUT `/todo-for-ai/api/v1/context-rules/{id}` - 更新上下文规则
- [ ] DELETE `/todo-for-ai/api/v1/context-rules/{id}` - 删除上下文规则
- [ ] POST `/todo-for-ai/api/v1/context-rules/{id}/activate` - 激活上下文规则
- [ ] POST `/todo-for-ai/api/v1/context-rules/{id}/deactivate` - 停用上下文规则
- [ ] POST `/todo-for-ai/api/v1/context-rules/build-context` - 构建上下文字符串
- [ ] GET `/todo-for-ai/api/v1/context-rules/marketplace` - 获取规则广场的公开规则
- [ ] POST `/todo-for-ai/api/v1/context-rules/{id}/copy` - 从规则广场复制规则

## Tokens模块接口 (`/todo-for-ai/api/v1/tokens`)
- [ ] GET `/todo-for-ai/api/v1/tokens` - 获取当前用户的Token列表
- [ ] POST `/todo-for-ai/api/v1/tokens` - 创建新的API Token
- [ ] GET `/todo-for-ai/api/v1/tokens/{id}` - 获取Token详情
- [ ] PUT `/todo-for-ai/api/v1/tokens/{id}` - 更新Token
- [ ] POST `/todo-for-ai/api/v1/tokens/{id}/renew` - 续期Token
- [ ] GET `/todo-for-ai/api/v1/tokens/{id}/reveal` - 获取解密的完整token
- [ ] DELETE `/todo-for-ai/api/v1/tokens/{id}` - 删除（停用）Token
- [ ] POST `/todo-for-ai/api/v1/tokens/verify` - 验证Token（公开接口）
- [ ] POST `/todo-for-ai/api/v1/tokens/cleanup` - 清理过期的Token

## MCP模块接口 (`/todo-for-ai/api/v1/mcp`)
- [ ] GET `/todo-for-ai/api/v1/mcp/tools` - 列出可用的MCP工具
- [ ] POST `/todo-for-ai/api/v1/mcp/call` - 调用MCP工具

## Docs模块接口 (`/todo-for-ai/api/v1/docs`)
- [ ] GET `/todo-for-ai/api/v1/docs` - API文档

## Pins模块接口 (`/todo-for-ai/api/v1/pins`)
- [ ] GET `/todo-for-ai/api/v1/pins` - 获取当前用户的Pin配置
- [ ] POST `/todo-for-ai/api/v1/pins` - Pin一个项目
- [ ] DELETE `/todo-for-ai/api/v1/pins/{id}` - 取消Pin一个项目
- [ ] PUT `/todo-for-ai/api/v1/pins/reorder` - 重新排序Pin
- [ ] GET `/todo-for-ai/api/v1/pins/check/{id}` - 检查项目的Pin状态
- [ ] GET `/todo-for-ai/api/v1/pins/stats` - 获取Pin统计信息
- [ ] GET `/todo-for-ai/api/v1/pins/task-counts` - 获取Pin项目的待执行任务数量

## Dashboard模块接口 (`/todo-for-ai/api/v1/dashboard`)
- [ ] GET `/todo-for-ai/api/v1/dashboard/stats` - 获取仪表盘统计数据
- [ ] GET `/todo-for-ai/api/v1/dashboard/activity-heatmap` - 获取用户活跃度热力图数据
- [ ] GET `/todo-for-ai/api/v1/dashboard/activity-summary` - 获取活跃度摘要统计

## User Settings模块接口 (`/todo-for-ai/api/v1/user-settings`)
- [ ] GET `/todo-for-ai/api/v1/user-settings` - 获取当前用户的设置
- [ ] PUT `/todo-for-ai/api/v1/user-settings` - 更新当前用户的设置
- [ ] PUT `/todo-for-ai/api/v1/user-settings/language` - 更新用户语言设置

## API Tokens模块接口 (`/todo-for-ai/api/v1/api-tokens`)
- [ ] GET `/todo-for-ai/api/v1/api-tokens` - 获取当前用户的API Token列表
- [ ] POST `/todo-for-ai/api/v1/api-tokens` - 创建新的API Token
- [ ] PUT `/todo-for-ai/api/v1/api-tokens/{id}` - 更新API Token
- [ ] GET `/todo-for-ai/api/v1/api-tokens/{id}/reveal` - 获取解密的完整token
- [ ] DELETE `/todo-for-ai/api/v1/api-tokens/{id}` - 删除API Token
- [ ] POST `/todo-for-ai/api/v1/api-tokens/verify` - 验证API Token

## 错误处理测试
- [ ] GET `/nonexistent` - 测试404错误响应格式
- [ ] GET `/todo-for-ai/api/v1/nonexistent` - 测试API路径下的404错误
- [ ] DELETE `/health` - 测试405方法不允许错误
- [ ] GET `/todo-for-ai/api/v1/projects` - 测试401未授权错误（无token）
- [ ] POST `/todo-for-ai/api/v1/projects` - 测试400错误请求（无效数据）

## 测试统计
- 总接口数量: 85个
- 已测试接口: 0个
- 通过测试: 0个
- 失败测试: 0个
- 测试进度: 0%
