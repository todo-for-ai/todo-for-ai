"""
API文档接口
"""

from flask import Blueprint, jsonify

docs_bp = Blueprint('docs', __name__)


@docs_bp.route('', methods=['GET'])
def api_docs():
    """API文档"""
    docs = {
        "title": "Todo for AI API Documentation",
        "version": "1.0.0",
        "description": "RESTful API for Todo for AI task management system",
        "base_url": "http://localhost:50110/todo-for-ai/api/v1",
        "authentication": {
            "type": "Bearer Token",
            "description": "Use Authorization: Bearer <token> header or ?token=<token> query parameter",
            "endpoints": {
                "create_token": "POST /todo-for-ai/api/v1/tokens",
                "verify_token": "POST /todo-for-ai/api/v1/tokens/verify"
            }
        },
        "endpoints": {
            "projects": {
                "list": {
                    "method": "GET",
                    "url": "/todo-for-ai/api/v1/projects",
                    "description": "Get list of projects with filtering and sorting",
                    "parameters": {
                        "page": "Page number (default: 1)",
                        "per_page": "Items per page (default: 20, max: 100)",
                        "search": "Search in name and description",
                        "status": "Filter by status (active, archived)",
                        "archived": "Filter archived projects (true/false)",
                        "has_pending_tasks": "Filter by pending tasks (true/false)",
                        "time_range": "Filter by activity time (today, week, month)",
                        "sort_by": "Sort field (name, created_at, updated_at, last_activity_at, total_tasks, pending_tasks, completed_tasks)",
                        "sort_order": "Sort order (asc, desc)"
                    }
                },
                "create": {
                    "method": "POST",
                    "url": "/todo-for-ai/api/v1/projects",
                    "description": "Create a new project",
                    "body": {
                        "name": "Project name (required)",
                        "description": "Project description",
                        "color": "Project color (hex)",
                        "github_url": "GitHub repository URL",
                        "project_context": "Project-level context information"
                    }
                },
                "get": {
                    "method": "GET",
                    "url": "/todo-for-ai/api/v1/projects/{id}",
                    "description": "Get project by ID"
                },
                "update": {
                    "method": "PUT",
                    "url": "/todo-for-ai/api/v1/projects/{id}",
                    "description": "Update project"
                },
                "delete": {
                    "method": "DELETE",
                    "url": "/todo-for-ai/api/v1/projects/{id}",
                    "description": "Delete project"
                },
                "archive": {
                    "method": "POST",
                    "url": "/todo-for-ai/api/v1/projects/{id}/archive",
                    "description": "Archive project"
                },
                "restore": {
                    "method": "POST",
                    "url": "/todo-for-ai/api/v1/projects/{id}/restore",
                    "description": "Restore archived project"
                }
            },
            "tasks": {
                "list": {
                    "method": "GET",
                    "url": "/todo-for-ai/api/v1/tasks",
                    "description": "Get list of tasks with filtering and sorting",
                    "parameters": {
                        "page": "Page number (default: 1)",
                        "per_page": "Items per page (default: 20, max: 100)",
                        "project_id": "Filter by project ID",
                        "status": "Filter by status (todo, in_progress, review, done, cancelled)",
                        "priority": "Filter by priority (low, medium, high, urgent)",
                        "assignee": "Filter by assignee",
                        "search": "Search in title, description, and content",
                        "sort_by": "Sort field (title, created_at, updated_at, due_date, priority)",
                        "sort_order": "Sort order (asc, desc)"
                    }
                },
                "create": {
                    "method": "POST",
                    "url": "/todo-for-ai/api/v1/tasks",
                    "description": "Create a new task",
                    "body": {
                        "project_id": "Project ID (required)",
                        "title": "Task title (required)",
                        "description": "Task description",
                        "content": "Task content (Markdown)",
                        "status": "Task status (default: todo)",
                        "priority": "Task priority (default: medium)",
                        "assignee": "Assigned person",
                        "due_date": "Due date (ISO format)",
                        "estimated_hours": "Estimated hours",
                        "tags": "Array of tags",
                        "related_files": "Array of related file paths",
                        "is_ai_task": "Whether assigned to AI (default: true)"
                    }
                },
                "get": {
                    "method": "GET",
                    "url": "/todo-for-ai/api/v1/tasks/{id}",
                    "description": "Get task by ID"
                },
                "update": {
                    "method": "PUT",
                    "url": "/todo-for-ai/api/v1/tasks/{id}",
                    "description": "Update task"
                },
                "delete": {
                    "method": "DELETE",
                    "url": "/todo-for-ai/api/v1/tasks/{id}",
                    "description": "Delete task"
                }
            },
            "context_rules": {
                "list": {
                    "method": "GET",
                    "url": "/todo-for-ai/api/v1/context-rules",
                    "description": "Get list of context rules"
                },
                "create": {
                    "method": "POST",
                    "url": "/todo-for-ai/api/v1/context-rules",
                    "description": "Create a new context rule"
                },
                "get": {
                    "method": "GET",
                    "url": "/todo-for-ai/api/v1/context-rules/{id}",
                    "description": "Get context rule by ID"
                },
                "update": {
                    "method": "PUT",
                    "url": "/todo-for-ai/api/v1/context-rules/{id}",
                    "description": "Update context rule"
                },
                "delete": {
                    "method": "DELETE",
                    "url": "/todo-for-ai/api/v1/context-rules/{id}",
                    "description": "Delete context rule"
                },
                "merged": {
                    "method": "GET",
                    "url": "/todo-for-ai/api/v1/context-rules/merged",
                    "description": "Get merged context rules for AI execution"
                }
            },
            "tokens": {
                "list": {
                    "method": "GET",
                    "url": "/todo-for-ai/api/v1/tokens",
                    "description": "Get list of API tokens (requires authentication)"
                },
                "create": {
                    "method": "POST",
                    "url": "/todo-for-ai/api/v1/tokens",
                    "description": "Create a new API token (requires authentication)",
                    "body": {
                        "name": "Token name (required)",
                        "description": "Token description",
                        "expires_days": "Expiration in days"
                    }
                },
                "verify": {
                    "method": "POST",
                    "url": "/todo-for-ai/api/v1/tokens/verify",
                    "description": "Verify a token (public endpoint)",
                    "body": {
                        "token": "Token to verify (required)"
                    }
                },
                "renew": {
                    "method": "POST",
                    "url": "/todo-for-ai/api/v1/tokens/{id}/renew",
                    "description": "Renew token expiration (requires authentication)"
                },
                "delete": {
                    "method": "DELETE",
                    "url": "/todo-for-ai/api/v1/tokens/{id}",
                    "description": "Deactivate token (requires authentication)"
                }
            },
            "mcp": {
                "tools": {
                    "method": "GET",
                    "url": "/todo-for-ai/api/v1/mcp/tools",
                    "description": "List available MCP tools"
                },
                "call": {
                    "method": "POST",
                    "url": "/todo-for-ai/api/v1/mcp/call",
                    "description": "Call an MCP tool",
                    "body": {
                        "name": "Tool name (required)",
                        "arguments": "Tool arguments object"
                    }
                }
            }
        },
        "response_format": {
            "success": {
                "success": True,
                "data": "Response data",
                "message": "Success message"
            },
            "error": {
                "success": False,
                "error": "Error message",
                "details": "Error details (optional)"
            },
            "pagination": {
                "data": "Array of items",
                "pagination": {
                    "page": "Current page",
                    "per_page": "Items per page",
                    "total": "Total items",
                    "pages": "Total pages",
                    "has_next": "Has next page",
                    "has_prev": "Has previous page"
                }
            }
        },
        "status_codes": {
            "200": "Success",
            "201": "Created",
            "400": "Bad Request",
            "401": "Unauthorized",
            "404": "Not Found",
            "500": "Internal Server Error"
        }
    }
    
    return jsonify(docs)
