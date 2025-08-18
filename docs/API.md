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
