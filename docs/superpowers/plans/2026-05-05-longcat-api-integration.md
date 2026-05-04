# LongCat API 集成实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 将 LongCat API 配置为系统的 AI 后端提供商，使用 OpenAI 兼容格式，使所有 AI 功能（Agent 运行、智能任务处理等）使用 LongCat API。

**Architecture:** 用户通过前端管理界面配置 LongCat API → 配置存储到 SystemSettings 表（加密存储） → AI Service 读取配置调用 LongCat API（OpenAI 兼容格式 `/v1/chat/completions`）→ 返回结果。复用现有 LLM 调用基础设施，无需修改核心调用逻辑。

**Tech Stack:** Python 3.10, Flask, SQLAlchemy, OpenAI API 兼容格式, React 18, Ant Design 5

**Risks:**
- Task 1 修改数据库配置，需要确保加密存储正常工作 → 缓解：使用现有的加密机制，已有 `set_llm_config` 方法支持加密
- Task 2 涉及前端配置界面，需要验证 API 连接 → 缓解：使用现有的测试连接接口

---

## Pre-Planning Analysis

**Feature:** LongCat API 集成
**Scope:** single subsystem (LLM configuration)
**Files Create:** None
**Files Modify:**
- `scripts/configure_longcat_api.py:26-34` (更新配置参数)
- `todo-for-ai-webpage/src/components/AdminLLMConfig.tsx:10-34` (添加 LongCat 提供商选项)
**Tasks:** 2 tasks
**Order:** Task 1 → Task 2
**Risks:**
- Task 1: 数据库配置脚本需要正确执行 → 缓解：脚本已存在，只需更新参数
- Task 2: 前端需要正确显示 LongCat 选项 → 缓解：复用现有的提供商选择机制

→ Proceeding to Phase 2...

---

### Task 1: 更新 LongCat API 配置脚本

**Depends on:** None
**Files:**
- Modify: `scripts/configure_longcat_api.py:26-34`

- [ ] **Step 1: 更新 LongCat API 配置参数 — 使用正确的 API 端点和模型名称**
文件: `scripts/configure_longcat_api.py:26-34`

```python
        # LongCat API 配置
        longcat_config = {
            'provider': 'openai',  # 使用 OpenAI 兼容格式
            'api_base': 'https://api.longcat.chat/openai',  # OpenAI 格式端点
            'api_key': 'ak_2mk8Hy6iF6mt4Hd3Ky2yn2ZT9Yo24',  # 你的 API Key
            'model': 'LongCat-Flash-Lite',  # 模型名称
            'temperature': 0.7,
            'max_tokens': 4096,
            'timeout': 120,
        }
```

- [ ] **Step 2: 验证配置脚本**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai && python scripts/configure_longcat_api.py`
Expected:
  - Exit code: 0
  - Output contains: "LongCat API 配置已保存"

- [ ] **Step 3: 提交**
Run: `git add scripts/configure_longcat_api.py && git commit -m "feat(config): update LongCat API configuration with correct endpoint and model"`

---

### Task 2: 前端添加 LongCat 提供商选项

**Depends on:** Task 1
**Files:**
- Modify: `todo-for-ai-webpage/src/components/AdminLLMConfig.tsx:10-34`

- [ ] **Step 1: 添加 LongCat 提供商选项 — 在 LLM_PROVIDERS 数组中添加 LongCat 选项**
文件: `todo-for-ai-webpage/src/components/AdminLLMConfig.tsx:10-16`

```typescript
// LLM 提供商选项
const LLM_PROVIDERS = [
  { value: 'openai', label: 'OpenAI', description: 'OpenAI GPT 系列模型' },
  { value: 'azure', label: 'Azure OpenAI', description: '微软 Azure OpenAI 服务' },
  { value: 'anthropic', label: 'Anthropic', description: 'Claude 系列模型' },
  { value: 'ollama', label: 'Ollama', description: '本地部署的开源模型' },
  { value: 'longcat', label: 'LongCat API', description: 'LongCat API 平台 - OpenAI 兼容格式' },
  { value: 'custom', label: '自定义', description: '兼容 OpenAI API 格式的自定义服务' },
]
```

- [ ] **Step 2: 添加 LongCat 默认模型列表 — 在 DEFAULT_MODELS 中添加 LongCat 模型**
文件: `todo-for-ai-webpage/src/components/AdminLLMConfig.tsx:19-25`

```typescript
// 默认模型选项
const DEFAULT_MODELS: Record<string, string[]> = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  azure: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
  ollama: ['llama2', 'mistral', 'codellama'],
  longcat: ['LongCat-Flash-Lite', 'LongCat-Flash', 'LongCat-Pro'],
  custom: ['custom-model'],
}
```

- [ ] **Step 3: 添加 LongCat 默认 API Base URL — 在 DEFAULT_API_BASE 中添加 LongCat 端点**
文件: `todo-for-ai-webpage/src/components/AdminLLMConfig.tsx:28-34`

```typescript
// 默认 API Base URL
const DEFAULT_API_BASE: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  azure: 'https://<your-resource>.openai.azure.com/openai',
  anthropic: 'https://api.anthropic.com/v1',
  ollama: 'http://localhost:11434',
  longcat: 'https://api.longcat.chat/openai',
  custom: 'http://localhost:8000/v1',
}
```

- [ ] **Step 4: 验证前端编译**
Run: `cd /Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-webpage && npm run build`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error" or "failed"

- [ ] **Step 5: 提交**
Run: `git add todo-for-ai-webpage/src/components/AdminLLMConfig.tsx && git commit -m "feat(ui): add LongCat API provider option to LLM configuration"`

---

## Self-Review Results

| # | Check | Result | Action Taken |
|---|-------|--------|-------------|
| 1 | Header? | PASS | Goal + Architecture + Tech Stack present |
| 2 | Dependencies? | PASS | Task 2 depends on Task 1 |
| 3 | Files? | PASS | All file paths with line ranges specified |
| 4 | Steps per Task? | PASS | Task 1: 3 steps, Task 2: 5 steps |
| 5 | Complete code? | PASS | All code blocks are complete |
| 6 | No diff format? | PASS | Using complete replacement format |
| 7 | Code block size? | PASS | All blocks within 5-80 lines |
| 8 | No dangling refs? | PASS | All types/functions defined |
| 9 | Verification commands? | PASS | Each task has verification step |
| 10 | Spec coverage? | PASS | All requirements covered |
| 11 | Independent verification? | PASS | Each task can be verified independently |
| 12 | No placeholders? | PASS | No TBD/TODO present |
| 13 | No abstract instructions? | PASS | All steps have concrete code |
| 14 | Cross-task consistency? | PASS | Provider name 'longcat' consistent |
| 15 | Save location? | PASS | Correct path |

**Status:** ✅ ALL PASS

⏹️ **Phase 3 Complete**

---

## Execution Selection

**Tasks:** 2
**Dependencies:** yes (Task 2 depends on Task 1)
**User Preference:** none
**Decision:** Inline
**Reasoning:** Only 2 tasks with clear dependency, can be executed inline efficiently

⏹️ **Phase 4 Complete: Execution selected, proceeding with inline execution**
