# Agent Runtime Docker Local Development Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline execution recommended) or superpowers:subagent-driven-development.

**Goal:** Make Agent Runtime locally runnable via Docker with a single command, supporting both mock mode (no API keys) and real mode, with clear documentation.

**Architecture:** Add a convenience shell script and docker-compose override for local dev, update README with exact commands, and verify the full build-run-connect flow works with the new Socket.IO client.

**Tech Stack:** Docker, Docker Compose, Bash, Python (Flask-SocketIO backend)

---

## Task 1: Add Local Docker Convenience Script

**Files:**
- Create: `agent-runtime/scripts/run_docker_local.sh`
- Test: `./agent-runtime/scripts/run_docker_local.sh` (builds and runs container)

### Step 1: Create run script

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Defaults for local dev against host backend
API_BASE_URL="${API_BASE_URL:-http://host.docker.internal:50110/todo-for-ai/api/v1}"
OPENCLAW_MOCK="${OPENCLAW_MOCK:-true}"
IMAGE_TAG="${IMAGE_TAG:-todo-for-ai-agent-runtime:local}"

if [ -z "$AGENT_KEY" ]; then
    echo "❌ Error: AGENT_KEY is required"
    echo "Example: AGENT_KEY=agk_xxx ./scripts/run_docker_local.sh"
    exit 1
fi

echo "🔧 Building Docker image..."
docker build -t "${IMAGE_TAG}" "${PROJECT_ROOT}"

echo "🚀 Running Agent Runtime locally..."
docker run -it --rm \
    --name agent-runtime-local \
    -e AGENT_KEY="$AGENT_KEY" \
    -e API_BASE_URL="$API_BASE_URL" \
    -e OPENCLAW_MOCK="$OPENCLAW_MOCK" \
    -e LOG_LEVEL="DEBUG" \
    "${IMAGE_TAG}"
```

Make executable: `chmod +x agent-runtime/scripts/run_docker_local.sh`

### Step 2: Test script syntax

Run: `bash -n agent-runtime/scripts/run_docker_local.sh`
Expected: No output (success)

### Step 3: Commit

```bash
git add agent-runtime/scripts/run_docker_local.sh
git commit -m "feat(agent-runtime): add local Docker convenience script"
```

---

## Task 2: Update docker-compose.yml for Local Dev

**Files:**
- Modify: `agent-runtime/docker-compose.yml`
- Test: `docker compose -f agent-runtime/docker-compose.yml config`

### Step 1: Add OPENCLAW_MOCK and optional WS_URL env vars

In the `environment` block, add:

```yaml
      - OPENCLAW_MOCK=${OPENCLAW_MOCK:-false}
      - WS_URL=${WS_URL:-}
```

Change healthcheck mock-awareness:

```yaml
    healthcheck:
      test: ["CMD", "sh", "-c", "curl -fsS http://127.0.0.1:18789/healthz >/dev/null || curl -fsS http://127.0.0.1:8080/health >/dev/null"]
```

### Step 2: Validate compose syntax

Run: `docker compose -f agent-runtime/docker-compose.yml config > /dev/null`
Expected: Exit code 0

### Step 3: Commit

```bash
git add agent-runtime/docker-compose.yml
git commit -m "feat(agent-runtime): support OPENCLAW_MOCK in docker-compose"
```

---

## Task 3: Update README with Local Docker Instructions

**Files:**
- Modify: `agent-runtime/README.md`

### Step 1: Append local dev section

Find end of README and add:

```markdown
## Local Development with Docker

### Option 1: One-shot script (recommended)

```bash
cd agent-runtime
AGENT_KEY=agk_xxx ./scripts/run_docker_local.sh
```

### Option 2: docker-compose

```bash
cd agent-runtime
export AGENT_KEY=agk_xxx
export API_BASE_URL=http://host.docker.internal:50110/todo-for-ai/api/v1
export OPENCLAW_MOCK=true
docker compose up --build
```

### Verify WebSocket Connection

Watch logs for:
```
websocket.connected
websocket.authenticated
```
```

### Step 2: Commit

```bash
git add agent-runtime/README.md
git commit -m "docs(agent-runtime): add local Docker dev instructions"
```

---

## Task 4: End-to-End Docker Build & Run Verification

**Files:**
- Test: Docker build + container run against local backend

### Step 1: Ensure backend is running

Run: `lsof -i :50110 | grep LISTEN || PM2_HOME=/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2 pm2 start ecosystem.config.js --only todo-for-ai-backend`
Expected: Backend listening on port 50110

### Step 2: Build image

Run: `cd agent-runtime && docker build -t todo-for-ai-agent-runtime:e2e-test .`
Expected: Build completes successfully

### Step 3: Run container in mock mode

Run:
```bash
docker run -d --name agent-runtime-e2e \
  -e AGENT_KEY="agk_W6LcGoXU3KHtr0NkrC5xcp45fqMZL_N47PLSRLcd9bsML-JQ" \
  -e API_BASE_URL="http://host.docker.internal:50110/todo-for-ai/api/v1" \
  -e OPENCLAW_MOCK="true" \
  -e LOG_LEVEL="DEBUG" \
  todo-for-ai-agent-runtime:e2e-test
```

Wait 5 seconds, then check logs:
```bash
docker logs agent-runtime-e2e --tail 20
```

Expected log lines:
- `platform.authenticated agent_id=1`
- `websocket.connected`
- `websocket.authenticated`
- `task.starting ...`
- `task.completed ...`

### Step 4: Cleanup

```bash
docker stop agent-runtime-e2e && docker rm agent-runtime-e2e
docker rmi todo-for-ai-agent-runtime:e2e-test
```

### Step 5: Commit

If any fixes were needed, commit them; otherwise commit as-is:

```bash
git commit --allow-empty -m "test(agent-runtime): verify Docker local build and e2e mock execution"
```

---

## Acceptance Criteria

- [ ] `scripts/run_docker_local.sh` exists and is executable
- [ ] `docker-compose.yml` supports `OPENCLAW_MOCK` and mock-aware healthcheck
- [ ] README documents both one-shot script and docker-compose local dev flows
- [ ] Docker image builds successfully with current Socket.IO requirements
- [ ] Container connects via WebSocket, authenticates, and completes mock tasks
