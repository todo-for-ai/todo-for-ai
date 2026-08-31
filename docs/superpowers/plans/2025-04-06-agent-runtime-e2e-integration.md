# Agent Runtime 端到端闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Agent Runtime a fully closed-loop system: task creation → AI execution → result writeback → user visibility.

**Architecture:** Keep the existing pull-based lease model, but (1) write AI output into the task content on commit, (2) auto-trigger agent lease immediately when `is_ai_task=true` tasks are created, avoiding the need for WebSocket push in local dev, and (3) provide a local OpenClaw-compatible `/process` mock so the runtime can actually run AI logic without real tokens in development.

**Tech Stack:** Python Flask (backend), TypeScript React (frontend), PM2 (process management), local HTTP mock (Python `http.server` or Flask)

---

## Task 1: Write Agent Output Back to Task Content on Commit

**Files:**
- Modify: `todo-for-ai-api-server/api/agent_runtime_commit.py`
- Test: manual via `python3` + `httpx` against local backend

### Step 1: Read current commit endpoint

Command: `cat todo-for-ai-api-server/api/agent_runtime_commit.py`
Expected: Confirm `commit_task` only updates `task.status` and `attempt.state`

### Step 2: Add result writeback to task.content

In `commit_task` (around line 121), after `final_status == 'succeeded'`:

```python
if final_status == 'succeeded':
    task.status = TaskStatus.DONE
    task.completed_at = now
    attempt.state = AgentTaskAttemptState.COMMITTED
    # Write agent result back to task content
    result_data = data.get('result') or {}
    output = result_data.get('output', '')
    if output:
        try:
            existing = json.loads(task.content) if task.content else {}
            if not isinstance(existing, dict):
                existing = {"content": task.content}
        except Exception:
            existing = {"content": task.content}
        existing['agent_output'] = output
        existing['agent_metadata'] = result_data.get('metadata', {})
        existing['processed_by'] = result_data.get('processed_by', 'agent')
        task.content = json.dumps(existing, ensure_ascii=False)
```

Add `import json` at the top of the file if missing.

### Step 3: Reload backend and verify with a manual task push

Create a task with `content={"prompt":"hello"}`, trigger pull + commit via Python script, then assert `task.content` contains `"agent_output"`.

Run verification script:
```bash
python3 << 'PYEOF'
import sys, json, httpx
sys.path.insert(0, 'todo-for-ai-api-server')
from app import app
from models import Task, TaskStatus, AgentKey
with app.app_context():
    key = AgentKey.query.filter_by(is_active=True).first().reveal()
auth = httpx.post("http://127.0.0.1:50110/todo-for-ai/api/v1/agent/auth/introspect", json={"agent_key": key}).json()
token = auth["data"]["access_token"]
resp = httpx.post("http://127.0.0.1:50110/todo-for-ai/api/v1/agent/tasks/pull", json={"max_tasks":1}, headers={"Authorization":f"Bearer {token}"})
tasks = resp.json()["data"]["tasks"]
if tasks:
    tid = tasks[0]["task_id"]
    httpx.post(f"http://127.0.0.1:50110/todo-for-ai/api/v1/agent/tasks/{tid}/commit",
        json={"attempt_id": tasks[0]["attempt_id"], "lease_id": tasks[0]["lease_id"], "status": "succeeded", "result": {"output": "mock ai result"}},
        headers={"Authorization": f"Bearer {token}", "Idempotency-Key": "test-1"})
    with app.app_context():
        t = Task.query.get(tid)
        print("agent_output in content:", "agent_output" in (t.content or ""))
PYEOF
```
Expected output: `agent_output in content: True`

### Step 4: Commit

```bash
git add todo-for-ai-api-server/api/agent_runtime_commit.py
git commit -m "feat(agent-runtime): write agent output into task.content on commit"
```

---

## Task 2: Auto-Assign AI Tasks on Creation (Remove WS Dependency for Local)

**Files:**
- Modify: `todo-for-ai-api-server/api/tasks.py` (or wherever `Task` is created)
- Modify: `todo-for-ai-api-server/services/agent_runtime_controller.py`
- Test: manual via creating a task with `is_ai_task=true`

### Step 1: Find task creation endpoint

Command: `grep -n "is_ai_task" todo-for-ai-api-server/api/tasks.py | head -10`
Expected: Show line numbers where `is_ai_task` is set during task creation

### Step 2: Read `agent_runtime_controller.py`

Command: `cat todo-for-ai-api-server/services/agent_runtime_controller.py`
Expected: Understand if there is already a `submit_task_to_runtime` or similar helper

### Step 3: Add auto-lease trigger after task creation

In the task creation endpoint (e.g., `todo-for-ai-api-server/api/tasks.py`), after `db.session.commit()` when a new task is created:

```python
from services.agent_runtime_controller import AgentRuntimeController

if task.is_ai_task:
    AgentRuntimeController.auto_assign_task(task)
```

In `services/agent_runtime_controller.py`, add/implement:

```python
class AgentRuntimeController:
    @staticmethod
    def auto_assign_task(task):
        from models import Agent, AgentKey, AgentTaskAttempt, AgentTaskLease, TaskStatus, db
        from datetime import datetime, timedelta
        from api.agent_common import generate_id, now_utc

        agent = Agent.query.filter_by(workspace_id=task.owner_id, runner_enabled=True, status='ACTIVE').first()
        if not agent:
            return

        now = now_utc()
        attempt_id = generate_id('att')
        lease_id = generate_id('lea')
        lease_exp = now + timedelta(seconds=60)

        attempt = AgentTaskAttempt(
            attempt_id=attempt_id,
            task_id=task.id,
            agent_id=agent.id,
            workspace_id=agent.workspace_id,
            state='ACTIVE',
            lease_id=lease_id,
            started_at=now,
            created_by=f'system',
        )
        lease = AgentTaskLease(
            lease_id=lease_id,
            task_id=task.id,
            attempt_id=attempt_id,
            agent_id=agent.id,
            workspace_id=agent.workspace_id,
            expires_at=lease_exp,
            active=True,
            created_by=f'system',
        )
        db.session.add(attempt)
        db.session.add(lease)
        if task.status == TaskStatus.TODO:
            task.status = TaskStatus.IN_PROGRESS
        db.session.commit()
```

### Step 4: Verify auto-assignment works

Create a task via API or Python shell with `is_ai_task=True`, then check that `AgentTaskLease` row exists.

```bash
python3 << 'PYEOF'
import sys
sys.path.insert(0, 'todo-for-ai-api-server')
from app import app
from models import Task, AgentTaskLease, db
with app.app_context():
    t = Task(project_id=1083, owner_id=5, creator_id=1, title="Auto test", content='{"prompt":"auto"}', is_ai_task=True, status='TODO')
    db.session.add(t); db.session.commit()
    leases = AgentTaskLease.query.filter_by(task_id=t.id).count()
    print("leases after creation:", leases)
PYEOF
```
Expected output: `leases after creation: 1`

### Step 5: Commit

```bash
git add todo-for-ai-api-server/api/tasks.py todo-for-ai-api-server/services/agent_runtime_controller.py
git commit -m "feat(agent-runtime): auto-assign AI tasks to active agent on creation"
```

---

## Task 3: Provide Local OpenClaw Mock for Development

**Files:**
- Create: `agent-runtime/scripts/mock_openclaw_server.py`
- Modify: `agent-runtime/src/runtime/main.py` (fallback to call mock if `OPENCLAW_MOCK=true`)
- Modify: `ecosystem.config.js` (add mock server process when env allows)

### Step 1: Create mock server

Create `agent-runtime/scripts/mock_openclaw_server.py`:

```python
#!/usr/bin/env python3
"""Minimal OpenClaw /process mock for local dev."""
import json
import http.server
import socketserver
import re

PORT = int(__import__('os').getenv("MOCK_OPENCLAW_PORT", "18789"))

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/healthz":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "status": "live"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/process":
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            prompt = body.get("prompt", "")
            # Echo-style mock with a little logic
            reply = f"[MOCK-OPENCLAW] Acknowledged: {prompt}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "output": reply, "metadata": {"mock": True}}).encode())
        else:
            self.send_response(404)
            self.end_headers()

with socketserver.ThreadingTCPServer(("", PORT), Handler) as httpd:
    print(f"Mock OpenClaw listening on :{PORT}")
    httpd.serve_forever()
```

Make it executable:
```bash
chmod +x agent-runtime/scripts/mock_openclaw_server.py
```

### Step 2: Update runtime to prefer mock when env flag is set

In `agent-runtime/src/runtime/main.py`, in `OpenClawClient.process_task`, add a mock branch:

```python
        task_input = {
            "prompt": prompt,
            "context": context or {},
        }

        # Local dev mock override
        if os.getenv("OPENCLAW_MOCK") == "true":
            return {"success": True, "output": f"[MOCK] {prompt}", "metadata": {"mock": True}}

        try:
            resp = await self.client.post(
                "/process",
                json=task_input,
                timeout=60.0,
            )
            if resp.status_code == 200:
                return resp.json()
            return await self._process_via_cli(task_input)
        except Exception as e:
            return await self._process_via_cli(task_input)
```

### Step 3: Add mock server to PM2 ecosystem (conditional)

Update `ecosystem.config.js` to include the mock server process:

```javascript
    {
      name: 'todo-for-ai-openclaw-mock',
      cwd: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/agent-runtime',
      script: '/usr/bin/python3',
      args: 'scripts/mock_openclaw_server.py',
      env: {
        NODE_ENV: 'development',
        MOCK_OPENCLAW_PORT: '18789',
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      log_date_format: 'YYYY-MM-DDTHH:mm:ss',
      out_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/openclaw-mock-out.log',
      error_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/openclaw-mock-error.log',
      merge_logs: true,
    },
```

Also update `todo-for-ai-agent-runtime` env to set `OPENCLAW_MOCK: 'true'` in local dev if desired, or leave it to the run_local.py Bridge.

For now, update `agent-runtime/scripts/run_local.py` to inject `OPENCLAW_MOCK=true`:

```python
os.environ.setdefault("OPENCLAW_MOCK", "true")
```

### Step 4: Test mock integration

Restart PM2 processes and verify:

```bash
PM2_HOME=/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2 pm2 start ecosystem.config.js
```

Then trigger a task execution and check logs for `[MOCK]` prefix in the output.

```bash
PM2_HOME=/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2 pm2 logs todo-for-ai-agent-runtime --lines 50 | grep -E "task.completed|MOCK"
```

Expected: `task.completed task_id=...` with MOClaw mock output.

### Step 5: Commit

```bash
git add agent-runtime/scripts/mock_openclaw_server.py agent-runtime/src/runtime/main.py agent-runtime/scripts/run_local.py ecosystem.config.js
git commit -m "feat(agent-runtime): add local OpenClaw mock server for dev"
```

---

## Task 4: Surface Agent Result in Frontend Task Detail

**Files:**
- Modify: `todo-for-ai-webpage/src/pages/TaskDetailPage.tsx` (or equivalent task detail view)
- Test: browser / manual eyeball

### Step 1: Find task detail component

Command: `find todo-for-ai-webpage/src -name "*Task*Detail*" -o -name "*task*detail*" | head -10`
Expected: Reveal the exact file path of the task detail page

### Step 2: Read task detail component

Command: `cat <file from step 1>`
Expected: Understand how `task.content` is rendered

### Step 3: Detect and render `agent_output`

If `task.content` is parsed as JSON and contains `agent_output`, render it in a distinct card/box above the normal content.

Pseudo-code (React-like):

```tsx
const parsedContent = useMemo(() => {
  try { return JSON.parse(task.content); } catch { return null; }
}, [task.content]);

{parsedContent?.agent_output && (
  <div className="agent-result-card">
    <div className="agent-result-label">AI Result</div>
    <div className="agent-result-body">{parsedContent.agent_output}</div>
  </div>
)}
```

If using existing UI system (e.g., Ant Design), use `Card` or `Alert` component.

### Step 4: Verify visually

Open the frontend, navigate to a task that has `agent_output` in its content, and confirm the AI result card is visible.

### Step 5: Commit

```bash
git add todo-for-ai-webpage/src/pages/TaskDetailPage.tsx
git commit -m "feat(agent-runtime): display AI agent output in task detail"
```

---

## Final Integration Verification

### Step 1: Run full PM2 stack

```bash
PM2_HOME=/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2 pm2 start ecosystem.config.js
```

### Step 2: Create an AI task via frontend or API

### Step 3: Wait 10-15 seconds for runtime to pull and execute

### Step 4: Check PM2 logs

```bash
PM2_HOME=/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2 pm2 logs todo-for-ai-agent-runtime --lines 30
```
Expected: `task.starting`, then `task.completed`

### Step 5: Verify result in task detail page

Expected: Task status = DONE, task detail shows "AI Result" card with mock output.

### Step 6: Commit any final fixes

---

## Acceptance Criteria

- [ ] Commit endpoint writes `agent_output` into `task.content`
- [ ] Creating `is_ai_task=true` automatically creates an `AgentTaskLease`
- [ ] Local OpenClaw mock runs under PM2 and responds to `/process`
- [ ] Agent runtime completes tasks using the mock and logs `task.completed`
- [ ] Frontend task detail displays a distinct card when `agent_output` exists
- [ ] Full flow (create task → auto lease → mock execution → result visible) works without manual steps
