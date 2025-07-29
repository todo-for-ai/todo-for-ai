# 快捷键功能测试指南

## 测试目标
验证 Ctrl+S 快捷键在任务创建/编辑和上下文规则创建/编辑页面中的功能。

## 测试步骤

### 1. 任务创建页面测试
1. 访问 `/todo-for-ai/pages/tasks/create`
2. 填写任务标题和描述
3. 在内容编辑器中输入一些内容
4. 按 `Ctrl+S` 快捷键
5. 验证：
   - 任务应该被保存
   - 页面应该跳转到编辑模式
   - 显示成功消息

### 2. 任务编辑页面测试
1. 编辑一个现有任务
2. 修改任务内容
3. 按 `Ctrl+S` 快捷键
4. 验证：
   - 任务应该被保存
   - 页面应该留在编辑模式
   - 显示成功消息

### 3. 上下文规则创建页面测试
1. 访问 `/todo-for-ai/pages/context-rules/create`
2. 填写规则名称和描述
3. 在内容编辑器中输入规则内容
4. 按 `Ctrl+S` 快捷键
5. 验证：
   - 规则应该被保存
   - 页面应该跳转到规则列表
   - 显示成功消息

### 4. 上下文规则编辑页面测试
1. 编辑一个现有上下文规则
2. 修改规则内容
3. 按 `Ctrl+S` 快捷键
4. 验证：
   - 规则应该被保存
   - 页面应该跳转到规则列表
   - 显示成功消息

### 5. 编辑器内快捷键测试
1. 在任务或规则的内容编辑器中
2. 确保光标在编辑器内
3. 按 `Ctrl+S` 快捷键
4. 验证：
   - 快捷键应该正常工作
   - 不应该有冲突或重复保存

## 修复内容

### 问题1：MilkdownEditor 快捷键冲突
- **问题**：CreateTask 和 MilkdownEditor 都有 Ctrl+S 监听器，但 MilkdownEditor 没有收到 onSave 回调
- **修复**：为 CreateTask 中的 MilkdownEditor 添加了 `onSave={handleSubmitAndEdit}` 回调

### 问题2：CreateContextRule 缺少快捷键支持
- **问题**：上下文规则创建/编辑页面没有 Ctrl+S 快捷键支持
- **修复**：
  - 添加了 `handleKeyDown` 函数来处理快捷键
  - 添加了 `useEffect` 来监听键盘事件
  - 修改了 `handleSubmit` 函数支持无参数调用
  - 为 MarkdownEditor 添加了 `onSave` 回调

### 问题3：表单验证和快捷键集成
- **问题**：快捷键保存时需要验证表单
- **修复**：在快捷键处理中使用 `form.validateFields()` 来获取和验证表单数据

## 技术实现细节

### CreateTask.tsx 修改
```typescript
// 为 MilkdownEditor 添加 onSave 回调
<MilkdownEditor
  value={editorContent}
  onChange={(value) => {
    setEditorContent(value || '')
    form.setFieldsValue({ content: value || '' })
  }}
  onSave={handleSubmitAndEdit}  // 新增
  autoHeight={true}
  minHeight={300}
  maxHeight={800}
  preview="live"
  hideToolbar={false}
/>
```

### CreateContextRule.tsx 修改
```typescript
// 添加快捷键处理
const handleKeyDown = useCallback((event: KeyboardEvent) => {
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault()
    handleSubmit()
  }
}, [handleSubmit])

// 为 MarkdownEditor 添加 onSave 回调
<MarkdownEditor
  value={form.getFieldValue('content') || ''}
  onChange={(value) => form.setFieldsValue({ content: value })}
  onSave={() => handleSubmit()}  // 新增
  height={400}
  placeholder="请输入规则内容..."
/>
```

## 预期结果
- 所有页面的 Ctrl+S 快捷键都应该正常工作
- 不应该有快捷键冲突
- 保存操作应该包含适当的表单验证
- 用户体验应该流畅一致
