# Remove AI Summarize Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely remove the AI summarize feature and all related code from the backend and frontend.

**Architecture:** Identify all files referencing `ai_summarize`, remove API endpoints, frontend routes/UI, and clean up any related imports or registrations.

**Tech Stack:** Python (Flask), React/TypeScript

---

## File Structure

**Files to Delete:**
- `todo-for-ai-api-server/api/ai_summarize.py` — Backend API module
- `todo-for-ai-webpage/src/pages/ai-summarize/` (if exists) or any AI summary related frontend components

**Files to Modify:**
- `todo-for-ai-api-server/app.py` — Unregister `ai_summarize` blueprint
- `todo-for-ai-api-server/api/__init__.py` — Remove import if present
- `todo-for-ai-webpage/src/api/` — Remove any ai-summarize API client files
- `todo-for-ai-webpage/src/i18n/resources/` — Remove translation keys for ai-summarize
- `todo-for-ai-webpage/src/pages/index.ts` — Remove exports if present
- `todo-for-ai-webpage/src/router/` or `App.tsx` — Remove route registration

---

### Task 1: Audit and List All References

**Files:**
- Search across all submodules

- [ ] **Step 1: Search backend references**

Run:
```bash
grep -r "ai_summarize\|ai-summarize\|aiSummarize\|AISummarize" todo-for-ai-api-server/ --include="*.py" -l
grep -r "ai_summarize\|ai-summarize\|aiSummarize\|AISummarize" todo-for-ai-webpage/ --include="*.ts" --include="*.tsx" --include="*.js" -l
```

Expected: A definitive list of files to modify/delete.

- [ ] **Step 2: Search frontend i18n and router**

Run:
```bash
grep -r "summarize\|summary" todo-for-ai-webpage/src/i18n/ --include="*.json" -l | head -10
grep -r "summarize\|summary" todo-for-ai-webpage/src/ --include="*.tsx" --include="*.ts" -l | head -20
```

Expected: Find any UI, API client, route, or translation related to AI summary.

- [ ] **Step 3: Commit the audit results as a checklist in a temp file**

Create a temporary checklist file `docs/REMINDERS_AI_SUMMARIZE_REMOVAL.md` with the exact files to touch (to be deleted at the end).

---

### Task 2: Remove Backend AI Summarize API

**Files:**
- Delete: `todo-for-ai-api-server/api/ai_summarize.py`
- Modify: `todo-for-ai-api-server/app.py`
- Modify: `todo-for-ai-api-server/api/__init__.py` (if imports exist)

- [ ] **Step 1: Verify `app.py` registration**

Run:
```bash
grep -n "ai_summarize" todo-for-ai-api-server/app.py
```

Expected: One or more lines showing blueprint import and registration.

- [ ] **Step 2: Remove blueprint registration from `app.py`**

Edit `todo-for-ai-api-server/app.py`:
- Remove `from api.ai_summarize import ai_summarize_bp` or equivalent import.
- Remove `app.register_blueprint(ai_summarize_bp, ...)` line.

- [ ] **Step 3: Delete `todo-for-ai-api-server/api/ai_summarize.py`**

Run:
```bash
rm todo-for-ai-api-server/api/ai_summarize.py
```

- [ ] **Step 4: Clean `api/__init__.py` if needed**

Run:
```bash
grep -n "ai_summarize" todo-for-ai-api-server/api/__init__.py || echo "No import found"
```

If found, remove the import line.

- [ ] **Step 5: Verify backend still starts**

Run:
```bash
cd todo-for-ai-api-server && python -c "from app import create_app; app = create_app(); print('OK')"
```

Expected: `OK` with no import errors.

- [ ] **Step 6: Commit**

```bash
git add todo-for-ai-api-server/
git commit -m "feat(orgs-prep): remove ai_summarize api and blueprint registration"
```

---

### Task 3: Remove Frontend AI Summarize Code

**Files:**
- Search and delete any `todo-for-ai-webpage/src/pages/ai-summarize*` or `AISummarize*` components.
- Modify router/config files to remove routes.
- Modify i18n files to remove related translation keys.
- Modify API client index exports if needed.

- [ ] **Step 1: Audit exact frontend files**

Run:
```bash
find todo-for-ai-webpage/src -type f \( -name "*summar*" -o -name "*Summar*" \)
grep -rn "aiSummarize\|ai_summarize\|ai-summarize\|/summarize" todo-for-ai-webpage/src/ --include="*.ts" --include="*.tsx" --include="*.json"
```

Expected: Precise list of files to delete or modify.

- [ ] **Step 2: Delete dedicated frontend pages/components**

Delete any files found from the audit whose sole purpose is the AI summarize feature.

- [ ] **Step 3: Remove route registration**

Search and edit router files (e.g., `todo-for-ai-webpage/src/App.tsx`, `todo-for-ai-webpage/src/router/index.tsx`, or similar):

Run:
```bash
grep -rn "summarize\|Summarize" todo-for-ai-webpage/src/App.tsx todo-for-ai-webpage/src/router/ --include="*.tsx" --include="*.ts"
```

Remove the route object/element declaration.

- [ ] **Step 4: Remove i18n keys**

Search translation files for summarize-related keys and remove them.

Run:
```bash
grep -rn "summarize" todo-for-ai-webpage/src/i18n/ --include="*.json"
```

Edit and delete the relevant JSON keys.

- [ ] **Step 5: Remove API client code**

Search and remove any `aiSummarizeApi` or `summarizeProject` API client functions.

- [ ] **Step 6: Verify frontend build**

Run:
```bash
cd todo-for-ai-webpage && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add todo-for-ai-webpage/
git commit -m "feat(orgs-prep): remove ai summarize frontend routes, components, api, and i18n"
```

---

### Task 4: Final Verification and Cleanup

**Files:**
- Delete: `docs/REMINDERS_AI_SUMMARIZE_REMOVAL.md`
- Modify: Any remaining stray references

- [ ] **Step 1: Final cross-repo grep**

Run:
```bash
grep -rn "ai_summarize\|ai-summarize\|aiSummarize\|AISummarize" todo-for-ai-api-server/ todo-for-ai-webpage/ --include="*.py" --include="*.ts" --include="*.tsx" --include="*.json" || echo "Clean"
```

Expected: `Clean` (or only references inside logs/test artifacts which can be ignored).

- [ ] **Step 2: Remove temporary checklist**

```bash
rm -f docs/REMINDERS_AI_SUMMARIZE_REMOVAL.md
```

- [ ] **Step 3: Commit cleanup**

```bash
git add docs/
git commit -m "chore(orgs-prep): finalize ai summarize removal cleanup"
```

---

## Execution Selection (Inline by Default)

**Auto-selecting: Inline Execution**

This is a deletion/refactoring task with low integration risk. Inline execution is efficient because:
- The scope is well-defined (search and delete)
- No new logic to design
- Verification is straightforward (grep + build)

**Proceeding to execute with superpowers:executing-plans if requested.**
