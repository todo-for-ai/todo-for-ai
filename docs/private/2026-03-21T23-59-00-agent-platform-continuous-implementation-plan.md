# Agent Platform Continuous Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Continuously evolve Todo-for-AI into a scalable multi-agent collaboration platform with a unified event backbone, standardized interaction protocol, capability-safe authorization, and human-in-the-loop governance.

**Architecture:** Keep current production paths stable while adding append-only primitives and parallel read APIs. Use incremental, non-breaking rollout: dual-write first, new query surfaces second, and migration to new paths only after runtime evidence is stable. All high-risk operations stay auditable and reversible.

**Tech Stack:** Flask + SQLAlchemy + MySQL, existing migration runner, React/TypeScript frontend, repo-local PM2 runtime scripts.

---

## Timestamped Decision Log (Private)

- 2026-03-21T23:40:00Z: Chosen strategy is incremental rollout, not big-bang rewrite. Existing APIs remain available until new paths prove stable.
- 2026-03-21T23:55:00Z: P0-1 implemented first: unified `agent_activity_events` table + dual-write from audit + cursor query API.
- 2026-03-21T23:59:00Z: Next P0 focus confirmed: standardize multi-agent interaction contract (`request/resolve`) with strict validation and explicit error codes.

## File Structure Map (Current + Planned)

- Existing backbone write path:
- `todo-for-ai-api-server/api/agent_common.py`
- `todo-for-ai-api-server/models/agent_audit_event.py`

- Existing insights read paths:
- `todo-for-ai-api-server/api/agent_workspace_insights/workspace_activities.py`
- `todo-for-ai-api-server/api/agent_workspace_insights/activity.py`

- Newly added in P0-1:
- `todo-for-ai-api-server/models/agent_activity_event.py`
- `todo-for-ai-api-server/migrations/versions/20260321_235000_add_agent_activity_events.py`
- `todo-for-ai-api-server/api/agent_workspace_insights/activity_events.py`

- Planned for P0-2 (this session):
- Create: `todo-for-ai-api-server/core/interaction_contract.py`
- Create: `todo-for-ai-api-server/api/agent_runtime_interactions.py`
- Modify: `todo-for-ai-api-server/app.py`
- Modify: `docs/AGENT_RUNTIME_SKILL.md`

## Execution Track

### Task 1: Unified Activity Event Foundation (P0-1)

**Files:**
- Modify: `todo-for-ai-api-server/api/agent_common.py`
- Modify: `todo-for-ai-api-server/api/agent_workspace_insights/__init__.py`
- Modify: `todo-for-ai-api-server/models/__init__.py`
- Create: `todo-for-ai-api-server/models/agent_activity_event.py`
- Create: `todo-for-ai-api-server/migrations/versions/20260321_235000_add_agent_activity_events.py`
- Create: `todo-for-ai-api-server/api/agent_workspace_insights/activity_events.py`

- [x] Step 1: Add model and migration for append-only unified activity table.
- [x] Step 2: Add dual-write from `write_agent_audit` into unified table with graceful fallback when table not deployed.
- [x] Step 3: Add cursor API for workspace activity events.
- [x] Step 4: Run compile validation (`python3 -m compileall ...`).
- [x] Step 5: Commit (`2540df5`).

### Task 2: Multi-Agent Interaction Contract (P0-2)

**Files:**
- Create: `todo-for-ai-api-server/core/interaction_contract.py`
- Create: `todo-for-ai-api-server/api/agent_runtime_interactions.py`
- Modify: `todo-for-ai-api-server/app.py`
- Modify: `docs/AGENT_RUNTIME_SKILL.md`

- [ ] Step 1: Define canonical interaction schema (`request`/`resolve`) and error codes in backend validator.
- [ ] Step 2: Add runtime API `POST /agent/interactions/request` with strict schema validation and append-only event write.
- [ ] Step 3: Add runtime API `POST /agent/interactions/{interaction_id}/resolve` with status constraints and audit write.
- [ ] Step 4: Add query API for task-scoped interaction timeline.
- [ ] Step 5: Update runtime docs with timestamped protocol section.
- [ ] Step 6: Run compile validation for changed files and commit.

### Task 3: Capability + Grant Layer (P0-3)

**Files (planned):**
- Create migration(s): `agent_secret_grants`, capability metadata extension
- Modify secret collaboration APIs and runtime pull response shaping
- Add minimal management/query endpoints

- [ ] Step 1: Add data model and migration for short-lived grants.
- [ ] Step 2: Add grant issue/consume/revoke APIs.
- [ ] Step 3: Expose capability refs in runtime pull without leaking raw secrets.
- [ ] Step 4: Add audit hooks and compile checks.

### Task 4: Human-in-the-Loop Governance (P0-4)

- [ ] Step 1: Define risk tiers and blocking policy.
- [ ] Step 2: Add approval-required flow for high-risk interactions.
- [ ] Step 3: Add reviewer-visible timeline entries and resolution reasons.

## Verification Rules

- Every coding task must end with concrete evidence: compile/test output and changed file list.
- No destructive cleanup of unrelated workspace changes.
- Keep incremental commits scoped to touched files only.

## Operating Note

- This is a continuous plan. New timestamped decision entries should be appended in this file before each major implementation batch.
