# Global API Error Message Display

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ensure all API error catch blocks show the backend's specific error message to users, falling back to a generic i18n message only when no backend message is available.

**Architecture:** Create a single utility function `getErrorMessage()` that reliably extracts the backend error message from `ApiHttpError` / generic `Error` objects. Then update all ~25 catch blocks that currently ignore the error object and show only a hardcoded fallback.

**Tech Stack:** React, TypeScript, Ant Design `message`, existing `ApiHttpError` class

---

## Problem

When backend returns `{"code": 400, "message": "Token name already exists"}`, the `apiClient` correctly throws `ApiHttpError(400, "Token name already exists")`. But many catch blocks do:

```tsx
catch (error) {
  message.error(tc('messages.createFailed'))  // ignores error.message!
}
```

User sees generic "创建失败" instead of the actual reason "Token name already exists".

## Pattern Categories

- **Client-side validation** (e.g. `title required`, `only images`) — no API call, NO change needed
- **API catch blocks that already use `error?.message || fallback`** — already correct, NO change needed
- **API catch blocks that ignore error** — NEED FIX (~25 locations across 15 files)

---

### Task 1: Create `getErrorMessage` utility

**Files:**
- Create: `todo-for-ai-webpage/src/utils/errorUtils.ts`

- [ ] **Step 1: Create the utility function**

```typescript
/**
 * Extract a human-readable error message from any thrown value.
 *
 * Priority:
 * 1. ApiHttpError / Error instances → error.message (contains backend message)
 * 2. String values → the string itself
 * 3. Fallback → caller-provided fallback string
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message || fallback
  }
  if (typeof error === 'string' && error) {
    return error
  }
  return fallback
}
```

- [ ] **Step 2: Verify export**

Run: `cd todo-for-ai-webpage && npx tsc --noEmit src/utils/errorUtils.ts 2>&1 | head -5`
Expected: No errors

---

### Task 2: Fix APITokenManager (user's specific complaint)

**Files:**
- Modify: `todo-for-ai-webpage/src/components/APITokenManager.tsx`

- [ ] **Step 1: Add import**

Add at top of file:
```typescript
import { getErrorMessage } from '../utils/errorUtils'
```

- [ ] **Step 2: Update 4 catch blocks**

Line 28: `message.error(getErrorMessage(error, tc('apiTokenManager.messages.loadFailed')))`
Line 42: `message.error(getErrorMessage(error, tc('apiTokenManager.messages.createFailed')))`
Line 52: `message.error(getErrorMessage(error, tc('apiTokenManager.messages.deleteFailed')))`
Line 78: `message.error(getErrorMessage(error, tc('apiTokenManager.messages.loadFailed')))`

Lines 98, 104 are clipboard copy errors (not API errors) — leave as-is.

---

### Task 3: Fix hooks (`src/hooks/`)

**Files:**
- Modify: `todo-for-ai-webpage/src/hooks/useTaskDetail.ts`
- Modify: `todo-for-ai-webpage/src/hooks/useCreateContextRule.ts`
- Modify: `todo-for-ai-webpage/src/hooks/useProjectPromptEditor.ts`
- Modify: `todo-for-ai-webpage/src/hooks/useProjectPin.ts`
- Modify: `todo-for-ai-webpage/src/hooks/useUserManagement.ts`

Pattern for every file:
1. Add `import { getErrorMessage } from '../utils/errorUtils'`
2. Change `message.error(tp('messages.xxx'))` → `message.error(getErrorMessage(error, tp('messages.xxx')))`
3. Change `message.error(t('messages.xxx'))` → `message.error(getErrorMessage(error, t('messages.xxx')))`
4. Keep lines that already use `error?.message ||` as-is (they work fine)
5. Skip client-side validation errors (e.g. `titleRequired`)

- [ ] **Step 1: Fix `useTaskDetail.ts`**
  - Line 118: `message.error(getErrorMessage(error, tp('messages.deleteFailed')))`

- [ ] **Step 2: Fix `useCreateContextRule.ts`**
  - Line 115: `message.error(getErrorMessage(error, t('messages.saveError')))`
  - Line 133: `message.error(getErrorMessage(error, t('messages.loadError')))`

- [ ] **Step 3: Fix `useProjectPromptEditor.ts`**
  - Line 74: `message.error(getErrorMessage(error, tp('messages.previewLoadFailed')))`
  - Line 98: `message.error(getErrorMessage(error, tp('messages.saveFailed')))`

- [ ] **Step 4: Fix `useUserManagement.ts`**
  - Line 108: `message.error(getErrorMessage(error, t('messages.loadFailed')))`
  - Line 152: `message.error(getErrorMessage(error, t('messages.updateFailed')))`

---

### Task 4: Fix page components (`src/pages/`)

**Files:**
- Modify: `todo-for-ai-webpage/src/pages/Dashboard.tsx`
- Modify: `todo-for-ai-webpage/src/pages/Settings.tsx`
- Modify: `todo-for-ai-webpage/src/pages/CreateProject.tsx`
- Modify: `todo-for-ai-webpage/src/pages/RuleMarketplace.tsx`
- Modify: `todo-for-ai-webpage/src/pages/ContextRules.tsx`
- Modify: `todo-for-ai-webpage/src/pages/TaskLogs.tsx`
- Modify: `todo-for-ai-webpage/src/pages/Projects.tsx`

Pattern: Same as Task 3 — add import, change catch blocks.

- [ ] **Step 1: Fix `Dashboard.tsx`**
  - Line 44: `message.error(getErrorMessage(error, tc('messages.error.general')))`

- [ ] **Step 2: Fix `Settings.tsx`**
  - Line 93: `message.error(getErrorMessage(error, tp('messages.saveError')))`

- [ ] **Step 3: Fix `CreateProject.tsx`**
  - Line 50: `message.error(getErrorMessage(error, tpRef.current('messages.loadFailed')))`
  - Line 85: `message.error(getErrorMessage(error, tp('messages.loadFailed')))`

- [ ] **Step 4: Fix `RuleMarketplace.tsx`**
  - Line 29: `message.error(getErrorMessage(error, tp('messages.installFailed')))`

- [ ] **Step 5: Fix `ContextRules.tsx`**
  - Line 53: `message.error(getErrorMessage(error, String(error)))` (currently passes raw error)

- [ ] **Step 6: Fix `TaskLogs.tsx`**
  - Line 26: `message.error(getErrorMessage(error, 'Failed to load task logs'))`
  - Line 47: `message.error(getErrorMessage(error, 'Failed to append task log'))`

- [ ] **Step 7: Fix `Projects.tsx`**
  - Line 78: `message.error(getErrorMessage(error, String(error)))` (currently passes raw error)

---

### Task 5: Fix component catch blocks (`src/components/`)

**Files:**
- Modify: `todo-for-ai-webpage/src/components/Kanban/KanbanBoard.tsx`
- Modify: `todo-for-ai-webpage/src/components/ActivityHeatmap.tsx`
- Modify: `todo-for-ai-webpage/src/components/ActivityHeatmap/hooks/useActivityHeatmap.ts`
- Modify: `todo-for-ai-webpage/src/components/TaskDetail/hooks/useTaskDetail.ts`
- Modify: `todo-for-ai-webpage/src/components/CreateTask/hooks/useTaskCreation.ts`
- Modify: `todo-for-ai-webpage/src/components/CustomPrompts/TaskPromptButtons.tsx`
- Modify: `todo-for-ai-webpage/src/components/ProjectDetail/TaskListSection.tsx`

Pattern: Same as Task 3 — add import, change catch blocks. Skip client-side validation.

- [ ] **Step 1: Fix `KanbanBoard.tsx`**
  - Line 75: `message.error(getErrorMessage(error, tc('kanban.messages.fetchFailed')))`
  - Line 169: `message.error(getErrorMessage(error, tc('kanban.messages.updateFailed')))`

- [ ] **Step 2: Fix `ActivityHeatmap.tsx`**
  - Line 34: `message.error(getErrorMessage(error, tp('heatmap.loadError')))`

- [ ] **Step 3: Fix `useActivityHeatmap.ts`**
  - Line 20: `message.error(getErrorMessage(error, tp('heatmap.loadError')))`

- [ ] **Step 4: Fix `components/TaskDetail/hooks/useTaskDetail.ts`**
  - Line 36: `message.error(getErrorMessage(error, tp('messages.statusUpdateFailed')))`
  - Line 49: `message.error(getErrorMessage(error, tp('messages.deleteFailed')))`

- [ ] **Step 5: Fix `useTaskCreation.ts`**
  - Line 56: `message.error(getErrorMessage(error, tp('messages.createFailed')))`
  - (Line 28 is client-side validation — skip)

- [ ] **Step 6: Fix `TaskPromptButtons.tsx`**
  - Line 178: `message.error(getErrorMessage(error, tp('messages.saveFailed')))`
  - Line 193: `message.error(getErrorMessage(error, tp('messages.deleteFailed')))`
  - Line 221: `message.error(getErrorMessage(error, tp('messages.reorderFailed')))`
  - (Line 155 is client-side validation — skip)

- [ ] **Step 7: Fix `TaskListSection.tsx`**
  - Line 48: `message.error(getErrorMessage(error, tp('tasks.table.bulkActions.deleteError')))`
  - Line 73: `message.error(getErrorMessage(error, tp('tasks.table.bulkActions.statusChangeError')))`

---

### Task 6: Verify & smoke test

- [ ] **Step 1: Type-check**

Run: `cd todo-for-ai-webpage && npx tsc --noEmit 2>&1 | tail -20`
Expected: No new errors

- [ ] **Step 2: Verify APITokenManager**

Run: `curl -s -X POST http://127.0.0.1:50111/todo-for-ai/api/v1/api-tokens/ -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"name":"test"}'` twice (second call should return 400 "Token name already exists")
Expected: Second call returns `{"code":400,"message":"Token name already exists",...}`

- [ ] **Step 3: Commit**

Commit message: `fix(ui): show backend error messages in all API catch blocks`
