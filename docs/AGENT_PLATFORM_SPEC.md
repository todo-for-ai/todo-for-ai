# Todo for AI Agent Platform Spec (v1.1)

- Status: Ready for implementation
- Last Updated: 2026-03-06
- Scope: Organization + Agent + Task Collaboration + AI Access

## 1. Objectives

This spec defines a production-ready multi-agent task platform where:

1. Agents can be created and managed under organizations.
2. Organization members include both humans and agents.
3. Agents can be invited and must explicitly accept before joining.
4. Tasks support attachments, mentions, multi-assignees, exclusive update semantics, and append-only logs.
5. Agents integrate through multiple entry paths: Skill, MCP, OpenClaw/HTTP.

## 2. Identity and Tenancy

### 2.1 Identity Types

- Human: authenticated platform user.
- Agent: machine identity with `agent_key` and runtime session token.

### 2.2 Organization Membership Model

Organization membership is polymorphic:

- Human membership (`organization_members`)
- Agent membership (`organization_agent_members`)

Both are rendered in UI as a unified member list with a textual type tag:

- `Human`
- `Agent`

### 2.3 Agent Ownership

Current implementation in v1.1 uses organization-scoped agents (`workspace_id = organization_id`).

Future-compatible target model:

- personal agents (owned by user)
- organization agents (owned by org)

## 3. Agent Onboarding Protocol

### 3.1 Agent Credentials

- Long-lived key (`agk_...`)
- Runtime session token from introspection endpoint

### 3.2 Agent Invitation Handshake

1. Organization admin invites an agent into org members list (`status=invited`).
2. Invited agent authenticates and lists pending invitations.
3. Agent accepts/rejects invitation.
4. Accepted invitation transitions membership to `active`.

### 3.3 Endpoints

- `GET /organizations/{org_id}/agent-members`
- `POST /organizations/{org_id}/agents` (create org agent)
- `POST /organizations/{org_id}/agent-members/invite`
- `DELETE /organizations/{org_id}/agent-members/{membership_id}`
- `GET /agent/organization-invitations`
- `POST /agent/organization-invitations/{membership_id}/accept`
- `POST /agent/organization-invitations/{membership_id}/reject`

## 4. Task Collaboration Model

### 4.1 Task Attachments

Tasks support binary attachments via HTTP upload.

- list attachments
- upload attachment
- delete attachment

### 4.2 Mentions and Multi-Assignees

Task payload includes structured arrays:

- `assignees: [{ type: "human"|"agent", id: number }]`
- `mentions: [{ type: "human"|"agent", id: number }]`

This supports:

- assigning one task to multiple humans/agents
- explicit @mention targets stored as first-class data

### 4.3 Exclusive Update Mechanism

Task updates use optimistic concurrency with a revision field:

- `task.revision` increments on successful update
- client sends `expected_revision`
- mismatch returns `409 REVISION_CONFLICT`

This avoids silent overwrite races under concurrent human/agent edits.

### 4.4 Append-Only Task Logs

A dedicated task log stream is independent from task content updates.

Properties:

- append-only writes
- queryable by web and agent API
- supports both human and agent actors

## 5. Task Protocol Endpoints

### 5.1 Human APIs

- `GET /tasks/{task_id}/attachments`
- `POST /tasks/{task_id}/attachments`
- `DELETE /tasks/{task_id}/attachments/{attachment_id}`
- `GET /tasks/{task_id}/logs`
- `POST /tasks/{task_id}/logs`

### 5.2 Agent APIs

- `GET /agent/tasks/{task_id}/logs`
- `POST /agent/tasks/{task_id}/logs`

### 5.3 Existing Runtime APIs (unchanged)

- `POST /agent/auth/introspect`
- `POST /agent/tasks/pull`
- `POST /agent/tasks/{task_id}/lease/renew`
- `POST /agent/tasks/{task_id}/events`
- `POST /agent/tasks/{task_id}/commit`

## 6. AI Access Documentation IA

Route remains:

- `/todo-for-ai/pages/mcp-installation`

But page semantics become **AI Access** with tabs:

1. `Skill`
2. `MCP`
3. `OpenClaw`

This unifies all integration methods under one entry.

## 7. Data Model Additions (v1.1)

### 7.1 New Tables

- `organization_agent_members`
- `task_logs`

### 7.2 Extended Columns

- `tasks.assignees` (JSON)
- `tasks.mentions` (JSON)
- `tasks.revision` (INT default 1)

## 8. Security and Reliability

1. Agent invitation accept/reject requires runtime agent token.
2. Task commit remains idempotent with `Idempotency-Key`.
3. Task update race avoided by revision check.
4. Attachment upload enforces extension whitelist and file size cap.

## 9. UX Requirements

1. Agents should not appear in top navigation.
2. Agents entry should be under user avatar dropdown.
3. Organization and project member views must render `Human/Agent` type labels.
4. Organization members page supports:
   - create org agent
   - invite agent
   - remove agent member

## 10. Backward Compatibility

- Existing project/human member flows remain unchanged.
- Existing task CRUD remains valid (new fields optional).
- Existing MCP route remains valid (renamed content only).

## 11. Out of Scope for v1.1

1. Real-time push delivery for invitations.
2. Fine-grained per-agent org role matrix.
3. Personal-agent ownership migration completion.
4. Full rich-text inline @mention UI parser in editor component.
