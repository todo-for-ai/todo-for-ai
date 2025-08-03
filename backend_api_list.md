# Todo for AI - 后端API端点列表

## 基础信息
- **API基础路径**: `/todo-for-ai/api/v1/`
- **认证方式**: JWT Token 或 API Token
- **响应格式**: JSON

## API端点详细列表

### 1. 认证模块 (auth)
**基础路径**: `/todo-for-ai/api/v1/auth/`

| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `/login` | 启动GitHub登录流程（向后兼容） | 无 |
| GET | `/login/github` | 启动GitHub登录流程 | 无 |
| GET | `/login/google` | 启动Google登录流程 | 无 |
| GET | `/callback` | GitHub OAuth回调处理（向后兼容） | 无 |
| GET | `/callback/github` | GitHub OAuth回调处理 | 无 |
| GET | `/google/callback` | Google OAuth回调处理 | 无 |
| POST | `/logout` | 用户登出 | JWT |
| GET | `/me` | 获取当前用户信息 | JWT |
| PUT | `/me` | 更新当前用户信息 | JWT |
| POST | `/verify` | 验证JWT令牌 | 无 |
| POST | `/refresh` | 刷新访问令牌 | JWT(refresh) |
| GET | `/users` | 获取用户列表（管理员功能） | JWT |
| GET | `/users/<int:user_id>` | 获取指定用户信息 | JWT |
| PUT | `/users/<int:user_id>/status` | 更新用户状态（管理员功能） | JWT |

### 2. 项目管理模块 (projects)
**基础路径**: `/todo-for-ai/api/v1/projects/`

| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `` | 获取项目列表 | JWT |
| POST | `` | 创建新项目 | JWT |
| GET | `/<int:project_id>` | 获取单个项目详情 | JWT |
| PUT | `/<int:project_id>` | 更新项目 | JWT |
| DELETE | `/<int:project_id>` | 删除项目（软删除） | JWT |
| POST | `/<int:project_id>/archive` | 归档项目 | JWT |
| POST | `/<int:project_id>/restore` | 恢复项目 | JWT |
| GET | `/<int:project_id>/tasks` | 获取项目的任务列表 | JWT |
| GET | `/<int:project_id>/context-rules` | 获取项目的上下文规则 | JWT |

### 3. 任务管理模块 (tasks)
**基础路径**: `/todo-for-ai/api/v1/tasks/`

| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `` | 获取任务列表 | JWT |
| POST | `` | 创建新任务 | JWT |
| GET | `/<int:task_id>` | 获取单个任务详情 | JWT |
| PUT | `/<int:task_id>` | 更新任务 | JWT |
| DELETE | `/<int:task_id>` | 删除任务 | JWT |
| GET | `/<int:task_id>/history` | ✅ 获取任务历史记录 | JWT |
| GET | `/<int:task_id>/attachments` | ✅ 获取任务附件列表 | JWT |
| DELETE | `/<int:task_id>/attachments/<int:attachment_id>` | ✅ 删除任务附件 | JWT |

### 4. 上下文规则模块 (context-rules)
**基础路径**: `/todo-for-ai/api/v1/context-rules/`

| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `` | 获取上下文规则列表 | JWT |
| POST | `` | 创建新的上下文规则 | JWT |
| GET | `/<int:rule_id>` | 获取单个上下文规则详情 | JWT |
| PUT | `/<int:rule_id>` | 更新上下文规则 | JWT |
| DELETE | `/<int:rule_id>` | 删除上下文规则 | JWT |
| POST | `/<int:rule_id>/activate` | 激活上下文规则 | JWT |
| POST | `/<int:rule_id>/deactivate` | 停用上下文规则 | JWT |
| POST | `/build-context` | 构建上下文字符串 | JWT |
| GET | `/marketplace` | 获取规则广场的公开规则 | JWT |
| POST | `/<int:rule_id>/copy` | 从规则广场复制规则 | JWT |
| GET | `/global` | ✅ 获取全局上下文规则 | JWT |
| GET | `/merged` | ✅ 获取合并后的上下文规则 | JWT |
| GET | `/preview` | ✅ 预览合并后的规则 | JWT |

### 5. Token管理模块 (tokens)
**基础路径**: `/todo-for-ai/api/v1/tokens/`

| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `` | 获取当前用户的Token列表 | JWT |
| POST | `` | 创建新的API Token | JWT |
| GET | `/<int:token_id>` | 获取Token详情 | JWT |
| PUT | `/<int:token_id>` | 更新Token | JWT |
| POST | `/<int:token_id>/renew` | 续期Token | JWT |
| GET | `/<int:token_id>/reveal` | 获取解密的完整token | JWT |
| DELETE | `/<int:token_id>` | 删除（停用）Token | JWT |
| POST | `/verify` | 验证Token（公开接口） | 无 |
| POST | `/cleanup` | 清理过期的Token | JWT |

### 6. MCP服务模块 (mcp)
**基础路径**: `/todo-for-ai/api/v1/mcp/`

| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `/tools` | 列出可用的MCP工具 | API Token |
| POST | `/call` | 调用MCP工具 | API Token |

### 7. 仪表盘模块 (dashboard)
**基础路径**: `/todo-for-ai/api/v1/dashboard/`

| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `/stats` | 获取仪表盘统计数据 | JWT |
| GET | `/activity-heatmap` | 获取用户活跃度热力图数据 | JWT |
| GET | `/activity-summary` | 获取活跃度摘要统计 | JWT |

### 8. Pin管理模块 (pins)
**基础路径**: `/todo-for-ai/api/v1/pins/`

| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `` | 获取当前用户的Pin配置 | JWT |
| POST | `` | Pin一个项目 | JWT |
| DELETE | `/<int:project_id>` | 取消Pin一个项目 | JWT |
| PUT | `/reorder` | 重新排序Pin | JWT |
| GET | `/check/<int:project_id>` | 检查项目的Pin状态 | JWT |
| GET | `/stats` | 获取Pin统计信息 | JWT |
| GET | `/task-counts` | 获取Pin项目的待执行任务数量 | JWT |

### 9. 用户设置模块 (user-settings)
**基础路径**: `/todo-for-ai/api/v1/user-settings/`

| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `` | 获取当前用户的设置 | JWT |
| PUT | `` | 更新当前用户的设置 | JWT |
| PUT | `/language` | 更新用户语言设置 | JWT |

### 10. API Token管理模块 (api-tokens)
**基础路径**: `/todo-for-ai/api/v1/api-tokens/`

| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `` | 获取当前用户的API Token列表 | JWT |
| POST | `` | 创建新的API Token | JWT |
| PUT | `/<int:token_id>` | 更新API Token | JWT |
| GET | `/<int:token_id>/reveal` | 获取解密的完整token | JWT |
| DELETE | `/<int:token_id>` | 删除API Token | JWT |
| POST | `/verify` | 验证API Token（用于MCP认证） | 无 |

### 11. 文档模块 (docs)
**基础路径**: `/todo-for-ai/api/v1/docs/`

| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `` | 获取API文档 | 无 |

### 12. 基础路由
| 方法 | 路径 | 功能描述 | 认证要求 |
|------|------|----------|----------|
| GET | `/` | 服务基本信息 | 无 |
| GET | `/health` | 健康检查 | 无 |
| GET | `/todo-for-ai/api/v1/health` | API健康检查 | 无 |

## 注意事项
1. 所有API路径都以 `/todo-for-ai/api/v1/` 为前缀
2. JWT认证需要在请求头中包含 `Authorization: Bearer <token>`
3. API Token认证可以通过请求头或查询参数传递
4. 所有响应都使用统一的ApiResponse格式
