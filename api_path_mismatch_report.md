# API路径不匹配问题报告

## 检查结果概述

经过详细检查前端API调用和后端API端点，发现了一些前端调用的API端点在后端不存在的问题。

## 🚨 发现的问题

### 1. Context Rules API 不匹配

**前端调用但后端不存在的端点：**

1. **`/context-rules/global`** (contextRules.ts:145)
   - 前端调用：`getGlobalContextRules()`
   - 后端状态：❌ 不存在此端点
   - 影响：获取全局上下文规则功能无法正常工作

2. **`/context-rules/merged`** (contextRules.ts:151)
   - 前端调用：`getMergedContextRules()`
   - 后端状态：❌ 不存在此端点
   - 影响：获取合并后的上下文规则功能无法正常工作

3. **`/context-rules/preview`** (contextRules.ts:159)
   - 前端调用：`previewMergedRules()`
   - 后端状态：❌ 不存在此端点
   - 影响：预览合并后的规则功能无法正常工作

### 2. Tasks API 不匹配

**前端调用但后端不存在的端点：**

1. **`/tasks/{id}/history`** (tasks.ts:146)
   - 前端调用：`getTaskHistory()`
   - 后端状态：❌ 不存在此端点
   - 影响：获取任务历史功能无法正常工作
   - 注意：后端有TaskHistory模型，但没有对应的API端点

2. **`/tasks/{id}/attachments`** (tasks.ts:151, 162)
   - 前端调用：`getTaskAttachments()`, `deleteTaskAttachment()`
   - 后端状态：❌ 不存在此端点
   - 影响：任务附件管理功能无法正常工作

## ✅ 正常匹配的API

### 1. Auth API - 完全匹配
- `/auth/login/github` ✅
- `/auth/login/google` ✅
- `/auth/logout` ✅
- `/auth/me` ✅
- `/auth/verify` ✅
- `/auth/refresh` ✅
- `/auth/users` ✅
- `/auth/users/{id}` ✅
- `/auth/users/{id}/status` ✅

### 2. Projects API - 完全匹配
- `/projects` ✅
- `/projects/{id}` ✅
- `/projects/{id}/archive` ✅
- `/projects/{id}/restore` ✅
- `/projects/{id}/tasks` ✅
- `/projects/{id}/context-rules` ✅

### 3. Tasks API - 基础功能匹配
- `/tasks` ✅
- `/tasks/{id}` ✅
- 基础CRUD操作都正常

### 4. Context Rules API - 基础功能匹配
- `/context-rules` ✅
- `/context-rules/{id}` ✅
- `/context-rules/build-context` ✅
- `/context-rules/{id}/copy` ✅
- `/context-rules/marketplace` ✅

### 5. Dashboard API - 完全匹配
- `/dashboard/stats` ✅
- `/dashboard/activity-heatmap` ✅
- `/dashboard/activity-summary` ✅

### 6. Pins API - 完全匹配
- `/pins` ✅
- `/pins/{id}` ✅
- `/pins/reorder` ✅
- `/pins/check/{id}` ✅
- `/pins/stats` ✅
- `/pins/task-counts` ✅

## 🔧 需要修复的问题

### 优先级1：Context Rules API缺失端点

需要在后端添加以下端点：

1. **GET `/context-rules/global`**
   - 功能：获取全局上下文规则
   - 实现：过滤 `is_global=True` 的规则

2. **GET `/context-rules/merged`**
   - 功能：获取合并后的上下文规则
   - 参数：`project_id` (可选)
   - 实现：合并全局规则和项目规则

3. **GET `/context-rules/preview`**
   - 功能：预览合并后的规则
   - 参数：`project_id` (可选)
   - 实现：类似merged但用于预览

### 优先级2：Tasks API缺失端点

需要在后端添加以下端点：

1. **GET `/tasks/{id}/history`**
   - 功能：获取任务历史记录
   - 实现：使用现有的TaskHistory模型

2. **GET `/tasks/{id}/attachments`**
   - 功能：获取任务附件列表
   - 实现：需要创建TaskAttachment模型

3. **DELETE `/tasks/{id}/attachments/{attachment_id}`**
   - 功能：删除任务附件
   - 实现：需要创建TaskAttachment模型

## 📋 修复计划

### 阶段1：修复Context Rules API
1. 在 `context_rules.py` 中添加缺失的端点
2. 实现全局规则查询逻辑
3. 实现规则合并逻辑
4. 测试前端调用

### 阶段2：修复Tasks API
1. 在 `tasks.py` 中添加历史查询端点
2. 创建TaskAttachment模型（如果需要）
3. 实现附件管理端点
4. 测试前端调用

### 阶段3：测试验证
1. 使用Playwright测试所有修复的端点
2. 验证前端功能正常工作
3. 检查错误处理和权限控制

## 🎯 预期结果

修复完成后：
- 所有前端API调用都有对应的后端端点
- Context Rules的高级功能（全局规则、合并预览）正常工作
- Tasks的历史记录和附件管理功能正常工作
- 前端不再出现404或500错误

## 📝 注意事项

1. **权限控制**：新增的端点需要添加适当的权限检查
2. **数据隔离**：确保用户只能访问自己的数据
3. **错误处理**：统一的错误响应格式
4. **文档更新**：更新API文档以反映新增的端点
