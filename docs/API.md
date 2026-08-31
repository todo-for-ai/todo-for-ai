# Todo for AI - API Documentation

## Overview

The Todo for AI API provides comprehensive endpoints for managing projects, tasks, and user authentication. This RESTful API is designed to work seamlessly with AI assistants through the MCP (Model Context Protocol) integration.

**Base URL**: `http://localhost:50110/todo-for-ai/api/v1`

## Authentication

### JWT Token Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### GitHub OAuth

The system supports GitHub OAuth for user authentication:

```http
GET /auth/github
GET /auth/callback
```

## Core Endpoints

### Projects

#### List Projects
```http
GET /projects
```

**Response:**
```json
{
  "projects": [
    {
      "id": 1,
      "name": "Website Redesign",
      "description": "Complete redesign of company website",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "task_count": 5,
      "completed_tasks": 2
    }
  ]
}
```

#### Create Project
```http
POST /projects
Content-Type: application/json

{
  "name": "New Project",
  "description": "Project description"
}
```

#### Get Project Details
```http
GET /projects/{project_id}
```

#### Update Project
```http
PUT /projects/{project_id}
Content-Type: application/json

{
  "name": "Updated Project Name",
  "description": "Updated description"
}
```

#### Delete Project
```http
DELETE /projects/{project_id}
```

### Tasks

#### List Tasks
```http
GET /tasks?project_id={project_id}&status={status}
```

**Query Parameters:**
- `project_id` (optional): Filter by project
- `status` (optional): Filter by status (todo, in_progress, review, done, cancelled)
- `assignee` (optional): Filter by assignee
- `priority` (optional): Filter by priority (low, medium, high, urgent)

#### Create Task
```http
POST /tasks
Content-Type: application/json

{
  "project_id": 1,
  "title": "Implement user authentication",
  "content": "Add OAuth integration for secure user login",
  "priority": "high",
  "status": "todo",
  "assignee": "john@example.com",
  "due_date": "2024-02-01",
  "estimated_hours": 8,
  "is_ai_task": true,
  "tags": ["authentication", "security"]
}
```

#### Get Task Details
```http
GET /tasks/{task_id}
```

#### Update Task
```http
PUT /tasks/{task_id}
Content-Type: application/json

{
  "title": "Updated task title",
  "status": "in_progress",
  "priority": "urgent"
}
```

#### Submit Task Feedback
```http
POST /tasks/{task_id}/feedback
Content-Type: application/json

{
  "feedback_content": "Task completed successfully. All tests passing.",
  "status": "done",
  "ai_identifier": "claude-assistant"
}
```

### Users

#### Get Current User
```http
GET /users/me
```

#### Update User Profile
```http
PUT /users/me
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "preferences": {
    "notifications": true,
    "theme": "dark"
  }
}
```

### Dashboard

#### Get Dashboard Stats (User-Isolated)
```http
GET /dashboard/stats
Authorization: Bearer <jwt-or-api-token>
```

Response now includes:
- Backward-compatible fields: `projects`, `tasks`
- Scope-aware fields: `scopes.owned`, `scopes.participated`
- Organization/Agent fields: `organizations.summary`, `organizations.top_organizations`

Example:
```json
{
  "projects": {"total": 12, "active": 9},
  "tasks": {"total": 120, "todo": 30, "in_progress": 20, "review": 5, "done": 65, "ai_executing": 8},
  "scopes": {
    "owned": {
      "projects": {"total": 12, "active": 9},
      "tasks": {"total": 120, "todo": 30, "in_progress": 20, "review": 5, "done": 65, "ai_executing": 8}
    },
    "participated": {
      "projects": {"total": 18, "active": 14},
      "tasks": {"total": 214, "todo": 44, "in_progress": 40, "review": 12, "done": 118, "ai_executing": 16}
    }
  },
  "organizations": {
    "summary": {"total": 4, "total_agents": 23, "active_agents_7d": 11},
    "top_organizations": [
      {
        "organization_id": 1,
        "organization_name": "Platform Team",
        "my_role": "owner",
        "total_agents": 9,
        "active_agents_7d": 6,
        "last_agent_activity_at": "2026-03-05T09:01:23"
      }
    ]
  }
}
```

## MCP Integration Endpoints

### MCP-Specific Operations

#### Get Project Tasks (MCP)
```http
GET /mcp/projects/{project_name}/tasks
```

#### Create Task (MCP)
```http
POST /mcp/tasks
Content-Type: application/json

{
  "project_name": "Website Redesign",
  "title": "AI-generated task",
  "content": "Detailed task description",
  "ai_identifier": "claude-assistant",
  "is_ai_task": true
}
```

## Agent Platform Endpoints

The Agent platform APIs provide workspace-scoped Agent identity, credential management, and runtime task execution.

### Workspace Agent Management

#### List Agents
```http
GET /workspaces/{workspace_id}/agents
Authorization: Bearer <jwt-or-api-token>
```

#### Create Agent
```http
POST /workspaces/{workspace_id}/agents
Content-Type: application/json
Authorization: Bearer <jwt-or-api-token>

{
  "name": "writer-agent-prod",
  "display_name": "Writer Agent",
  "avatar_url": "https://cdn.example.com/agent.png",
  "homepage_url": "https://example.com/agents/writer",
  "contact_email": "agent@example.com",
  "description": "Agent for content generation",
  "capability_tags": ["write", "review"],
  "allowed_project_ids": [1, 2, 3],
  "llm_provider": "openai",
  "llm_model": "gpt-5-mini",
  "temperature": 0.7,
  "top_p": 1.0,
  "max_output_tokens": 4096,
  "context_window_tokens": 128000,
  "reasoning_mode": "balanced",
  "system_prompt": "You are a senior writer.",
  "soul_markdown": "# SOUL\\n\\n## Identity\\n...",
  "response_style": {"tone": "professional"},
  "tool_policy": {"allow": ["search"]},
  "memory_policy": {"mode": "session"},
  "handoff_policy": {"allow_handoff": true},
  "max_concurrency": 1,
  "max_retry": 2,
  "timeout_seconds": 1800,
  "heartbeat_interval_seconds": 20,
  "change_summary": "initial version"
}
```

#### Update Agent
```http
PATCH /workspaces/{workspace_id}/agents/{agent_id}
```

`PATCH` supports all create fields plus:
- `status`: `active | inactive | revoked`
- `change_summary`: SOUL 变更说明（当 `soul_markdown` 更新时将写入版本历史）

#### Revoke Agent
```http
DELETE /workspaces/{workspace_id}/agents/{agent_id}
```

### Agent Key Management

#### Create Agent Key
```http
POST /workspaces/{workspace_id}/agents/{agent_id}/keys
Content-Type: application/json

{
  "name": "prod-key-1"
}
```

#### List Agent Keys
```http
GET /workspaces/{workspace_id}/agents/{agent_id}/keys
```

#### Reveal Agent Key
```http
POST /workspaces/{workspace_id}/agents/{agent_id}/keys/{key_id}/reveal
```

#### Revoke Agent Key
```http
POST /workspaces/{workspace_id}/agents/{agent_id}/keys/{key_id}/revoke
```

#### Generate Connect Link
```http
POST /workspaces/{workspace_id}/agents/{agent_id}/connect-link
Content-Type: application/json

{
  "ttl_seconds": 600
}
```

### Agent SOUL Version Management

#### List SOUL Versions
```http
GET /workspaces/{workspace_id}/agents/{agent_id}/soul/versions?page=1&per_page=20
```

#### Get SOUL Version
```http
GET /workspaces/{workspace_id}/agents/{agent_id}/soul/versions/{version}
```

#### Rollback SOUL
```http
POST /workspaces/{workspace_id}/agents/{agent_id}/soul/rollback
Content-Type: application/json

{
  "version": 3,
  "change_summary": "rollback due to bad prompt update"
}
```

### Agent Secrets Management

#### List Agent Secrets
```http
GET /workspaces/{workspace_id}/agents/{agent_id}/secrets
```

#### Create Secret
```http
POST /workspaces/{workspace_id}/agents/{agent_id}/secrets
Content-Type: application/json

{
  "name": "OPENAI_API_KEY",
  "secret_value": "sk-xxx"
}
```

#### Reveal Secret
```http
POST /workspaces/{workspace_id}/agents/{agent_id}/secrets/{secret_id}/reveal
```

#### Rotate Secret
```http
POST /workspaces/{workspace_id}/agents/{agent_id}/secrets/{secret_id}/rotate
Content-Type: application/json

{
  "secret_value": "sk-new-xxx"
}
```

#### Revoke Secret
```http
POST /workspaces/{workspace_id}/agents/{agent_id}/secrets/{secret_id}/revoke
```

### Agent Runtime

#### Introspect Agent Key
```http
POST /agent/auth/introspect
Content-Type: application/json

{
  "agent_key": "agk_xxx"
}
```

#### Pull Tasks
```http
POST /agent/tasks/pull
Authorization: Bearer <agent-access-token>
Content-Type: application/json

{
  "max_tasks": 1
}
```

`/agent/tasks/pull` 返回新增：
- `agent_profile`: 当前 Agent 运行配置（含 SOUL、版本号、active secret 名称列表）
- `items`: 可执行任务列表

#### Renew Lease
```http
POST /agent/tasks/{task_id}/lease/renew
Authorization: Bearer <agent-access-token>
Content-Type: application/json

{
  "attempt_id": "att_xxx",
  "lease_id": "lea_xxx"
}
```

#### Emit Task Events
```http
POST /agent/tasks/{task_id}/events
Authorization: Bearer <agent-access-token>
Content-Type: application/json
```

#### Commit Task Result
```http
POST /agent/tasks/{task_id}/commit
Authorization: Bearer <agent-access-token>
Idempotency-Key: idem_xxx
Content-Type: application/json
```

## Error Handling

The API uses standard HTTP status codes and returns error details in JSON format:

```json
{
  "error": "Invalid request",
  "message": "Project name is required",
  "code": "VALIDATION_ERROR"
}
```

### Common Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Rate Limiting

API requests are limited to:
- **Authenticated users**: 1000 requests per hour
- **Unauthenticated users**: 100 requests per hour

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Webhooks

Configure webhooks to receive real-time notifications:

```http
POST /webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["task.created", "task.updated", "project.completed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

- `task.created`: New task created
- `task.updated`: Task status or details changed
- `task.completed`: Task marked as done
- `project.created`: New project created
- `project.updated`: Project details changed

## SDK and Libraries

### JavaScript/Node.js
```bash
npm install @todo-for-ai/sdk
```

### Python
```bash
pip install todo-for-ai-python
```

### Example Usage
```javascript
import { TodoForAI } from '@todo-for-ai/sdk';

const client = new TodoForAI({
  apiUrl: 'http://localhost:50110/todo-for-ai/api/v1',
  token: 'your-jwt-token'
});

// Create a project
const project = await client.projects.create({
  name: 'My Project',
  description: 'A new project'
});

// Add a task
const task = await client.tasks.create({
  project_id: project.id,
  title: 'First task',
  content: 'Task description'
});
```

## Organization Agent Members

### List Organization Agent Members
```http
GET /organizations/{organization_id}/agent-members
Authorization: Bearer <jwt-token>
```

### Create Organization Agent
```http
POST /organizations/{organization_id}/agents
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "BuildBot",
  "description": "Org automation agent",
  "capability_tags": ["build", "ci"],
  "allowed_project_ids": [1, 2]
}
```

### Invite Agent to Organization (pending acceptance)
```http
POST /organizations/{organization_id}/agent-members/invite
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "agent_id": 12
}
```

### Agent Invitation Handshake
```http
GET /agent/organization-invitations
Authorization: Bearer <agent-access-token>

POST /agent/organization-invitations/{membership_id}/accept
Authorization: Bearer <agent-access-token>

POST /agent/organization-invitations/{membership_id}/reject
Authorization: Bearer <agent-access-token>
```

## Task Collaboration Extensions

### Upload Task Attachment
```http
POST /tasks/{task_id}/attachments
Authorization: Bearer <jwt-token>
Content-Type: multipart/form-data
```

### List Task Attachments
```http
GET /tasks/{task_id}/attachments
Authorization: Bearer <jwt-token>
```

### Append Task Log (Human)
```http
POST /tasks/{task_id}/logs
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "content": "Started implementation",
  "content_type": "text/markdown"
}
```

### Query Task Logs (Human)
```http
GET /tasks/{task_id}/logs?page=1&per_page=50
Authorization: Bearer <jwt-token>
```

### Append / Query Task Logs (Agent)
```http
POST /agent/tasks/{task_id}/logs
Authorization: Bearer <agent-access-token>
Content-Type: application/json

GET /agent/tasks/{task_id}/logs
Authorization: Bearer <agent-access-token>
```

### Task Update Concurrency Control

`PUT /tasks/{task_id}` now supports optional `expected_revision` field:

```json
{
  "title": "Update title",
  "expected_revision": 3
}
```

If revision mismatches, API returns `409 REVISION_CONFLICT`.

### Multi-assignees and Mentions

Task create/update supports:

```json
{
  "assignees": [{"type": "human", "id": 10}, {"type": "agent", "id": 12}],
  "mentions": [{"type": "human", "id": 10}]
}
```
