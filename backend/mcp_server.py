#!/usr/bin/env python3
"""
MCP (Model Context Protocol) Server for Todo for AI

This server implements the MCP protocol to allow AI assistants to interact
with the Todo for AI task management system.

MCP Protocol Reference:
- https://spec.modelcontextprotocol.io/
"""

import asyncio
import json
import logging
import sys
from typing import Any, Dict, List, Optional, Union
from datetime import datetime

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
    TextContent,
    Tool,
)

# Import our application models and database
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import importlib.util
spec = importlib.util.spec_from_file_location("app_module", "app.py")
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)
create_app = app_module.create_app
from models import db, Project, Task, ContextRule, ApiToken, User

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TodoMCPServer:
    """MCP Server for Todo for AI system"""

    def __init__(self, api_token: Optional[str] = None):
        self.app = create_app()
        self.server = Server("todo-for-ai")
        self.api_token = api_token
        self.current_user = None
        self._authenticate()
        self._setup_handlers()

    def _authenticate(self):
        """验证API Token并设置当前用户"""
        if not self.api_token:
            logger.warning("No API token provided - running in unauthenticated mode")
            return

        with self.app.app_context():
            try:
                # 验证API Token
                api_token_obj = ApiToken.verify_token(self.api_token)
                if not api_token_obj:
                    logger.error("Invalid or expired API token")
                    raise ValueError("Invalid or expired API token")

                # 设置当前用户
                self.current_user = api_token_obj.user
                if not self.current_user:
                    logger.error("API token has no associated user")
                    raise ValueError("API token has no associated user")

                logger.info(f"Authenticated as user: {self.current_user.email} (ID: {self.current_user.id})")

            except Exception as e:
                logger.error(f"Authentication failed: {str(e)}")
                raise

    def _check_permission(self, resource_type: str, resource_id: Optional[int] = None) -> bool:
        """检查用户是否有权限访问指定资源"""
        if not self.current_user:
            logger.warning("No authenticated user - denying access")
            return False

        # 管理员有所有权限
        if self.current_user.role == 'admin':
            return True

        # 检查资源权限
        if resource_type == 'project' and resource_id:
            project = Project.query.get(resource_id)
            if project and project.creator_id == self.current_user.id:
                return True
        elif resource_type == 'task' and resource_id:
            task = Task.query.get(resource_id)
            if task:
                # 检查是否是任务创建者或项目创建者
                if task.creator_id == self.current_user.id:
                    return True
                if task.project and task.project.creator_id == self.current_user.id:
                    return True

        # 默认拒绝访问
        logger.warning(f"Access denied for user {self.current_user.id} to {resource_type} {resource_id}")
        return False

    def _setup_handlers(self):
        """Setup MCP protocol handlers"""
        
        @self.server.list_tools()
        async def handle_list_tools() -> ListToolsResult:
            """List available tools for AI interaction"""
            return ListToolsResult(
                tools=[
                    Tool(
                        name="list_projects",
                        description="List all projects with optional filtering",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "status": {
                                    "type": "string",
                                    "enum": ["active", "archived", "deleted"],
                                    "description": "Filter projects by status"
                                },
                                "search": {
                                    "type": "string",
                                    "description": "Search projects by name or description"
                                }
                            }
                        }
                    ),
                    Tool(
                        name="get_project",
                        description="Get detailed information about a specific project",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "project_id": {
                                    "type": "integer",
                                    "description": "The ID of the project to retrieve"
                                }
                            },
                            "required": ["project_id"]
                        }
                    ),
                    Tool(
                        name="create_project",
                        description="Create a new project",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "The name of the project"
                                },
                                "description": {
                                    "type": "string",
                                    "description": "The description of the project"
                                },
                                "color": {
                                    "type": "string",
                                    "description": "The color code for the project (hex format)"
                                }
                            },
                            "required": ["name"]
                        }
                    ),
                    Tool(
                        name="list_tasks",
                        description="List tasks with optional filtering",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "project_id": {
                                    "type": "integer",
                                    "description": "Filter tasks by project ID"
                                },
                                "status": {
                                    "type": "string",
                                    "enum": ["todo", "in_progress", "review", "done", "cancelled"],
                                    "description": "Filter tasks by status"
                                },
                                "priority": {
                                    "type": "string",
                                    "enum": ["low", "medium", "high", "urgent"],
                                    "description": "Filter tasks by priority"
                                },
                                "assignee": {
                                    "type": "string",
                                    "description": "Filter tasks by assignee"
                                },
                                "search": {
                                    "type": "string",
                                    "description": "Search tasks by title or description"
                                },
                                "limit": {
                                    "type": "integer",
                                    "description": "Maximum number of tasks to return (default: 50)"
                                }
                            }
                        }
                    ),
                    Tool(
                        name="get_task",
                        description="Get detailed information about a specific task",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "task_id": {
                                    "type": "integer",
                                    "description": "The ID of the task to retrieve"
                                }
                            },
                            "required": ["task_id"]
                        }
                    ),
                    Tool(
                        name="create_task",
                        description="Create a new task with AI creator identification",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "project_id": {
                                    "type": "integer",
                                    "description": "The ID of the project this task belongs to"
                                },
                                "title": {
                                    "type": "string",
                                    "description": "The title of the task"
                                },
                                "description": {
                                    "type": "string",
                                    "description": "The description of the task"
                                },
                                "content": {
                                    "type": "string",
                                    "description": "The detailed content of the task (Markdown format)"
                                },
                                "status": {
                                    "type": "string",
                                    "enum": ["todo", "in_progress", "review", "done", "cancelled"],
                                    "description": "The status of the task"
                                },
                                "priority": {
                                    "type": "string",
                                    "enum": ["low", "medium", "high", "urgent"],
                                    "description": "The priority of the task"
                                },
                                "ai_identifier": {
                                    "type": "string",
                                    "description": "AI identifier (e.g., 'Claude-3.5-Sonnet', 'GPT-4', 'MCP Client')"
                                },
                                "assignee": {
                                    "type": "string",
                                    "description": "The person assigned to this task"
                                },
                                "due_date": {
                                    "type": "string",
                                    "format": "date",
                                    "description": "The due date of the task (YYYY-MM-DD format)"
                                },
                                "estimated_hours": {
                                    "type": "number",
                                    "description": "Estimated hours to complete the task"
                                },
                                "tags": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Tags associated with the task"
                                }
                            },
                            "required": ["project_id", "title"]
                        }
                    ),
                    Tool(
                        name="update_task",
                        description="Update an existing task",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "task_id": {
                                    "type": "integer",
                                    "description": "The ID of the task to update"
                                },
                                "title": {"type": "string"},
                                "description": {"type": "string"},
                                "content": {"type": "string"},
                                "status": {
                                    "type": "string",
                                    "enum": ["todo", "in_progress", "review", "done", "cancelled"]
                                },
                                "priority": {
                                    "type": "string",
                                    "enum": ["low", "medium", "high", "urgent"]
                                },
                                "assignee": {"type": "string"},
                                "due_date": {"type": "string", "format": "date"},
                                "estimated_hours": {"type": "number"},
                                "completion_rate": {"type": "integer", "minimum": 0, "maximum": 100},
                                "tags": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                }
                            },
                            "required": ["task_id"]
                        }
                    ),
                    Tool(
                        name="delete_task",
                        description="Delete a task",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "task_id": {
                                    "type": "integer",
                                    "description": "The ID of the task to delete"
                                }
                            },
                            "required": ["task_id"]
                        }
                    ),
                    Tool(
                        name="get_context_rules",
                        description="Get merged context rules for AI execution",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "project_id": {
                                    "type": "integer",
                                    "description": "Project ID to get project-specific rules (optional)"
                                }
                            }
                        }
                    ),
                    Tool(
                        name="get_project_tasks_by_name",
                        description="Get all pending tasks for a project by project name, sorted by creation time",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "project_name": {
                                    "type": "string",
                                    "description": "The name of the project to get tasks for"
                                },
                                "status_filter": {
                                    "type": "array",
                                    "items": {
                                        "type": "string",
                                        "enum": ["todo", "in_progress", "review"]
                                    },
                                    "description": "Filter tasks by status (default: todo, in_progress, review)",
                                    "default": ["todo", "in_progress", "review"]
                                }
                            },
                            "required": ["project_name"]
                        }
                    ),
                    Tool(
                        name="get_task_by_id",
                        description="Get detailed task information by task ID",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "task_id": {
                                    "type": "integer",
                                    "description": "The ID of the task to retrieve"
                                }
                            },
                            "required": ["task_id"]
                        }
                    ),
                    Tool(
                        name="start_task",
                        description="Mark a task as in progress to avoid duplicate execution by other AI instances",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "task_id": {
                                    "type": "integer",
                                    "description": "The ID of the task to start"
                                },
                                "ai_identifier": {
                                    "type": "string",
                                    "description": "AI identifier (e.g., 'Claude-3.5-Sonnet', 'GPT-4', 'MCP Client')"
                                }
                            },
                            "required": ["task_id", "ai_identifier"]
                        }
                    ),
                    Tool(
                        name="submit_task_feedback",
                        description="Submit feedback for a completed or in-progress task",
                        inputSchema={
                            "type": "object",
                            "properties": {
                                "task_id": {
                                    "type": "integer",
                                    "description": "The ID of the task to provide feedback for"
                                },
                                "project_name": {
                                    "type": "string",
                                    "description": "The name of the project this task belongs to"
                                },
                                "feedback_content": {
                                    "type": "string",
                                    "description": "The feedback content describing what was done"
                                },
                                "status": {
                                    "type": "string",
                                    "enum": ["in_progress", "review", "done", "cancelled"],
                                    "description": "The new status of the task after feedback"
                                },
                                "ai_identifier": {
                                    "type": "string",
                                    "description": "Identifier of the AI providing feedback (optional)"
                                }
                            },
                            "required": ["task_id", "project_name", "feedback_content", "status"]
                        }
                    )
                ]
            )
        
        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> CallToolResult:
            """Handle tool calls from AI clients"""
            try:
                with self.app.app_context():
                    if name == "list_projects":
                        return await self._list_projects(arguments)
                    elif name == "get_project":
                        return await self._get_project(arguments)
                    elif name == "create_project":
                        return await self._create_project(arguments)
                    elif name == "list_tasks":
                        return await self._list_tasks(arguments)
                    elif name == "get_task":
                        return await self._get_task(arguments)
                    elif name == "create_task":
                        return await self._create_task(arguments)
                    elif name == "update_task":
                        return await self._update_task(arguments)
                    elif name == "delete_task":
                        return await self._delete_task(arguments)
                    elif name == "get_context_rules":
                        return await self._get_context_rules(arguments)
                    elif name == "get_project_tasks_by_name":
                        return await self._get_project_tasks_by_name(arguments)
                    elif name == "get_task_by_id":
                        return await self._get_task_by_id(arguments)
                    elif name == "start_task":
                        return await self._start_task(arguments)
                    elif name == "submit_task_feedback":
                        return await self._submit_task_feedback(arguments)
                    else:
                        raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                logger.error(f"Error handling tool call {name}: {str(e)}")
                return CallToolResult(
                    content=[TextContent(type="text", text=f"Error: {str(e)}")],
                    isError=True
                )
    
    async def _list_projects(self, arguments: Dict[str, Any]) -> CallToolResult:
        """List projects with optional filtering"""
        try:
            query = Project.query
            
            # Apply filters
            if 'status' in arguments:
                query = query.filter(Project.status == arguments['status'])
            
            if 'search' in arguments:
                search_term = f"%{arguments['search']}%"
                query = query.filter(
                    db.or_(
                        Project.name.ilike(search_term),
                        Project.description.ilike(search_term)
                    )
                )
            
            projects = query.all()
            
            projects_data = []
            for project in projects:
                # Get task statistics
                task_stats = db.session.query(
                    Task.status,
                    db.func.count(Task.id).label('count')
                ).filter(Task.project_id == project.id).group_by(Task.status).all()
                
                stats = {
                    'total_tasks': sum(stat.count for stat in task_stats),
                    'todo_tasks': next((stat.count for stat in task_stats if stat.status == 'todo'), 0),
                    'in_progress_tasks': next((stat.count for stat in task_stats if stat.status == 'in_progress'), 0),
                    'done_tasks': next((stat.count for stat in task_stats if stat.status == 'done'), 0),
                }
                
                projects_data.append({
                    'id': project.id,
                    'name': project.name,
                    'description': project.description,
                    'color': project.color,
                    'status': project.status,
                    'created_at': project.created_at.isoformat(),
                    'updated_at': project.updated_at.isoformat(),
                    'stats': stats
                })
            
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps({
                        'projects': projects_data,
                        'total': len(projects_data)
                    }, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error listing projects: {str(e)}")
            raise

    async def _get_project(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Get detailed information about a specific project"""
        try:
            project_id = arguments['project_id']

            # 检查权限
            if not self._check_permission('project', project_id):
                return CallToolResult(
                    content=[TextContent(type="text", text="Access denied: You don't have permission to access this project")],
                    isError=True
                )

            project = Project.query.get(project_id)

            if not project:
                return CallToolResult(
                    content=[TextContent(type="text", text=f"Project with ID {project_id} not found")],
                    isError=True
                )

            # Get task statistics
            task_stats = db.session.query(
                Task.status,
                db.func.count(Task.id).label('count')
            ).filter(Task.project_id == project.id).group_by(Task.status).all()

            stats = {
                'total_tasks': sum(stat.count for stat in task_stats),
                'todo_tasks': next((stat.count for stat in task_stats if stat.status == 'todo'), 0),
                'in_progress_tasks': next((stat.count for stat in task_stats if stat.status == 'in_progress'), 0),
                'done_tasks': next((stat.count for stat in task_stats if stat.status == 'done'), 0),
            }

            # Get recent tasks
            recent_tasks = Task.query.filter(Task.project_id == project.id)\
                .order_by(Task.updated_at.desc()).limit(10).all()

            project_data = {
                'id': project.id,
                'name': project.name,
                'description': project.description,
                'color': project.color,
                'status': project.status,
                'created_at': project.created_at.isoformat(),
                'updated_at': project.updated_at.isoformat(),
                'created_by': project.created_by,
                'stats': stats,
                'recent_tasks': [
                    {
                        'id': task.id,
                        'title': task.title,
                        'status': task.status,
                        'priority': task.priority,
                        'updated_at': task.updated_at.isoformat()
                    } for task in recent_tasks
                ]
            }

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(project_data, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error getting project: {str(e)}")
            raise

    async def _create_project(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Create a new project"""
        try:
            # 检查是否有认证用户
            if not self.current_user:
                return CallToolResult(
                    content=[TextContent(type="text", text="Authentication required to create projects")],
                    isError=True
                )

            project = Project(
                name=arguments['name'],
                description=arguments.get('description', ''),
                color=arguments.get('color', '#1890ff'),
                creator_id=self.current_user.id,
                created_by=f'mcp-client-{self.current_user.email}'
            )

            db.session.add(project)
            db.session.commit()

            project_data = {
                'id': project.id,
                'name': project.name,
                'description': project.description,
                'color': project.color,
                'status': project.status,
                'created_at': project.created_at.isoformat(),
                'message': 'Project created successfully'
            }

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(project_data, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error creating project: {str(e)}")
            db.session.rollback()
            raise

    async def _list_tasks(self, arguments: Dict[str, Any]) -> CallToolResult:
        """List tasks with optional filtering"""
        try:
            # 基础查询，只显示用户有权限的任务
            if self.current_user:
                if self.current_user.role == 'admin':
                    # 管理员可以看到所有任务
                    query = Task.query.join(Project)
                else:
                    # 普通用户只能看到自己创建的项目中的任务
                    query = Task.query.join(Project).filter(Project.creator_id == self.current_user.id)
            else:
                return CallToolResult(
                    content=[TextContent(type="text", text="Authentication required to list tasks")],
                    isError=True
                )

            # Apply filters
            if 'project_id' in arguments:
                project_id = arguments['project_id']
                # 检查项目权限
                if not self._check_permission('project', project_id):
                    return CallToolResult(
                        content=[TextContent(type="text", text="Access denied: You don't have permission to access this project's tasks")],
                        isError=True
                    )
                query = query.filter(Task.project_id == project_id)

            if 'status' in arguments:
                query = query.filter(Task.status == arguments['status'])

            if 'priority' in arguments:
                query = query.filter(Task.priority == arguments['priority'])

            if 'assignee' in arguments:
                query = query.filter(Task.assignee == arguments['assignee'])

            if 'search' in arguments:
                search_term = f"%{arguments['search']}%"
                query = query.filter(
                    db.or_(
                        Task.title.ilike(search_term),
                        Task.description.ilike(search_term),
                        Task.content.ilike(search_term)
                    )
                )

            # Limit results
            limit = arguments.get('limit', 50)
            tasks = query.order_by(Task.updated_at.desc()).limit(limit).all()

            tasks_data = []
            for task in tasks:
                tasks_data.append({
                    'id': task.id,
                    'project_id': task.project_id,
                    'project_name': task.project.name,
                    'project_color': task.project.color,
                    'title': task.title,
                    'description': task.description,
                    'content': task.content,
                    'status': task.status,
                    'priority': task.priority,
                    'assignee': task.assignee,
                    'due_date': task.due_date.isoformat() if task.due_date else None,
                    'estimated_hours': task.estimated_hours,
                    'completion_rate': task.completion_rate,
                    'tags': task.tags,
                    'created_at': task.created_at.isoformat(),
                    'updated_at': task.updated_at.isoformat(),
                    'created_by': task.created_by
                })

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps({
                        'tasks': tasks_data,
                        'total': len(tasks_data),
                        'filters_applied': {k: v for k, v in arguments.items() if k != 'limit'}
                    }, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error listing tasks: {str(e)}")
            raise

    async def _get_task(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Get detailed information about a specific task"""
        try:
            task_id = arguments['task_id']
            task = Task.query.join(Project).filter(Task.id == task_id).first()

            if not task:
                return CallToolResult(
                    content=[TextContent(type="text", text=f"Task with ID {task_id} not found")],
                    isError=True
                )

            task_data = {
                'id': task.id,
                'project_id': task.project_id,
                'project_name': task.project.name,
                'project_color': task.project.color,
                'title': task.title,
                'description': task.description,
                'content': task.content,
                'status': task.status,
                'priority': task.priority,
                'assignee': task.assignee,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'estimated_hours': task.estimated_hours,
                'completion_rate': task.completion_rate,
                'tags': task.tags,
                'created_at': task.created_at.isoformat(),
                'updated_at': task.updated_at.isoformat(),
                'created_by': task.created_by,
                'completed_at': task.completed_at.isoformat() if task.completed_at else None
            }

            # 获取项目级别的上下文规则并拼接到任务内容后
            if task.project:
                # 获取任务创建者的用户ID，如果没有则使用当前用户ID
                task_user_id = task.creator_id if task.creator_id else (self.current_user.id if self.current_user else None)

                project_context = ContextRule.build_context_string(
                    project_id=task.project.id,
                    user_id=task_user_id,
                    for_tasks=True,
                    for_projects=False
                )

                if project_context:
                    # 将项目上下文拼接到任务内容后
                    original_content = task_data.get('content', '')
                    task_data['content'] = f"{original_content}\n\n## 项目上下文规则\n\n{project_context}"

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(task_data, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error getting task: {str(e)}")
            raise

    async def _create_task(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Create a new task"""
        try:
            # Validate project exists
            project = Project.query.get(arguments['project_id'])
            if not project:
                return CallToolResult(
                    content=[TextContent(type="text", text=f"Project with ID {arguments['project_id']} not found")],
                    isError=True
                )

            # Parse due_date if provided
            due_date = None
            if 'due_date' in arguments and arguments['due_date']:
                try:
                    due_date = datetime.strptime(arguments['due_date'], '%Y-%m-%d').date()
                except ValueError:
                    return CallToolResult(
                        content=[TextContent(type="text", text="Invalid due_date format. Use YYYY-MM-DD")],
                        isError=True
                    )

            # Get AI identifier
            ai_identifier = arguments.get('ai_identifier', 'MCP Client')

            task = Task(
                project_id=arguments['project_id'],
                title=arguments['title'],
                content=arguments.get('content', arguments.get('description', '')),
                status=arguments.get('status', 'todo'),
                priority=arguments.get('priority', 'medium'),
                due_date=due_date,
                tags=arguments.get('tags', []),
                created_by='mcp-client',
                creator_type='ai',
                creator_identifier=ai_identifier,
                is_ai_task=arguments.get('is_ai_task', True)
            )

            db.session.add(task)
            db.session.commit()

            task_data = {
                'id': task.id,
                'project_id': task.project_id,
                'project_name': project.name,
                'title': task.title,
                'content': task.content,
                'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
                'priority': task.priority.value if hasattr(task.priority, 'value') else str(task.priority),
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'tags': task.tags,
                'is_ai_task': task.is_ai_task,
                'creator_type': task.creator_type,
                'creator_identifier': task.creator_identifier,
                'created_at': task.created_at.isoformat(),
                'message': 'Task created successfully'
            }

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(task_data, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error creating task: {str(e)}")
            db.session.rollback()
            raise

    async def _update_task(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Update an existing task"""
        try:
            task_id = arguments['task_id']
            task = Task.query.get(task_id)

            if not task:
                return CallToolResult(
                    content=[TextContent(type="text", text=f"Task with ID {task_id} not found")],
                    isError=True
                )

            # Update fields if provided
            if 'title' in arguments:
                task.title = arguments['title']
            if 'description' in arguments:
                task.description = arguments['description']
            if 'content' in arguments:
                task.content = arguments['content']
            if 'status' in arguments:
                task.status = arguments['status']
                # Set completion date if task is marked as done
                if arguments['status'] == 'done' and task.completed_at is None:
                    task.completed_at = datetime.utcnow()
                elif arguments['status'] != 'done':
                    task.completed_at = None
            if 'priority' in arguments:
                task.priority = arguments['priority']
            if 'assignee' in arguments:
                task.assignee = arguments['assignee']
            if 'due_date' in arguments:
                if arguments['due_date']:
                    try:
                        task.due_date = datetime.strptime(arguments['due_date'], '%Y-%m-%d').date()
                    except ValueError:
                        return CallToolResult(
                            content=[TextContent(type="text", text="Invalid due_date format. Use YYYY-MM-DD")],
                            isError=True
                        )
                else:
                    task.due_date = None
            if 'estimated_hours' in arguments:
                task.estimated_hours = arguments['estimated_hours']
            if 'completion_rate' in arguments:
                task.completion_rate = arguments['completion_rate']
            if 'tags' in arguments:
                task.tags = arguments['tags']

            task.updated_at = datetime.utcnow()
            db.session.commit()

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps({'message': 'Task updated successfully', 'task_id': task.id}, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error updating task: {str(e)}")
            db.session.rollback()
            raise

    async def _delete_task(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Delete a task"""
        try:
            task_id = arguments['task_id']
            task = Task.query.get(task_id)

            if not task:
                return CallToolResult(
                    content=[TextContent(type="text", text=f"Task with ID {task_id} not found")],
                    isError=True
                )

            task_data = {
                'id': task.id,
                'title': task.title,
                'project_id': task.project_id,
                'message': 'Task deleted successfully'
            }

            db.session.delete(task)
            db.session.commit()

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(task_data, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error deleting task: {str(e)}")
            db.session.rollback()
            raise

    async def _get_context_rules(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Get merged context rules for AI execution"""
        try:
            project_id = arguments.get('project_id')

            # 确保有当前用户
            if not self.current_user:
                return CallToolResult(
                    content=[TextContent(type="text", text="Error: No authenticated user")],
                    isError=True
                )

            # 使用模型的方法获取适用的规则（支持用户隔离）
            all_rules = ContextRule.get_applicable_rules(
                project_id=project_id,
                user_id=self.current_user.id,
                for_tasks=True,
                for_projects=False
            )

            # Build merged content
            merged_content_parts = []
            rules_info = []

            for rule in all_rules:
                merged_content_parts.append(f"# {rule.name}")
                if rule.description:
                    merged_content_parts.append(f"## Description: {rule.description}")
                merged_content_parts.append(rule.content)
                merged_content_parts.append("")  # Empty line separator

                rules_info.append({
                    'id': rule.id,
                    'name': rule.name,
                    'description': rule.description,
                    'rule_type': rule.rule_type,
                    'priority': rule.priority,
                    'project_id': rule.project_id
                })

            merged_content = "\n".join(merged_content_parts)

            result_data = {
                'merged_content': merged_content,
                'rules_applied': rules_info,
                'total_rules': len(all_rules),
                'global_rules_count': len(global_rules),
                'project_rules_count': len(project_rules),
                'project_id': project_id
            }

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(result_data, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error getting context rules: {str(e)}")
            raise

    async def _get_project_tasks_by_name(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Get all pending tasks for a project by project name"""
        try:
            project_name = arguments.get('project_name')
            status_filter = arguments.get('status_filter', ['todo', 'in_progress', 'review'])

            if not project_name:
                raise ValueError("project_name is required")

            # Find project by name
            project = Project.query.filter_by(name=project_name).first()
            if not project:
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=json.dumps({
                            'error': f'Project "{project_name}" not found',
                            'available_projects': [p.name for p in Project.query.all()]
                        }, indent=2)
                    )]
                )

            # Get tasks with status filter, ordered by creation time
            query = Task.query.filter_by(project_id=project.id)
            if status_filter:
                query = query.filter(Task.status.in_(status_filter))

            tasks = query.order_by(Task.created_at.asc()).all()

            tasks_data = []
            for task in tasks:
                task_dict = task.to_dict()
                task_dict['project_name'] = project.name
                tasks_data.append(task_dict)

            result_data = {
                'project_name': project.name,
                'project_id': project.id,
                'status_filter': status_filter,
                'total_tasks': len(tasks_data),
                'tasks': tasks_data
            }

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(result_data, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error getting project tasks by name: {str(e)}")
            raise

    async def _get_task_by_id(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Get detailed task information by task ID"""
        try:
            task_id = arguments.get('task_id')

            if not task_id:
                raise ValueError("task_id is required")

            task = Task.query.get(task_id)
            if not task:
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=json.dumps({
                            'error': f'Task with ID {task_id} not found'
                        }, indent=2)
                    )]
                )

            # Get project information
            project = Project.query.get(task.project_id)

            task_data = task.to_dict()
            task_data['project_name'] = project.name if project else None
            task_data['project_description'] = project.description if project else None

            # 获取项目级别的上下文规则并拼接到任务内容后
            if project:
                # 获取任务创建者的用户ID，如果没有则使用当前用户ID
                task_user_id = task.creator_id if task.creator_id else (self.current_user.id if self.current_user else None)

                project_context = ContextRule.build_context_string(
                    project_id=project.id,
                    user_id=task_user_id,
                    for_tasks=True,
                    for_projects=False
                )

                if project_context:
                    # 将项目上下文拼接到任务内容后
                    original_content = task_data.get('content', '')
                    task_data['content'] = f"{original_content}\n\n## 项目上下文规则\n\n{project_context}"

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(task_data, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error getting task by ID: {str(e)}")
            raise

    async def _start_task(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Mark a task as in progress to avoid duplicate execution"""
        try:
            task_id = arguments['task_id']
            ai_identifier = arguments['ai_identifier']

            task = Task.query.get(task_id)
            if not task:
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=json.dumps({
                            'error': f'Task {task_id} not found'
                        }, indent=2)
                    )],
                    isError=True
                )

            # Check if task is already in progress
            task_status_str = task.status.value if hasattr(task.status, 'value') else str(task.status)
            if task_status_str == 'in_progress':
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=json.dumps({
                            'warning': f'Task {task_id} is already in progress',
                            'task_id': task_id,
                            'current_status': task_status_str,
                            'message': 'Task was already started by another process'
                        }, indent=2)
                    )]
                )

            # Check if task is not in a startable state
            task_status_str = task.status.value if hasattr(task.status, 'value') else str(task.status)
            if task_status_str not in ['todo']:
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=json.dumps({
                            'error': f'Task {task_id} cannot be started from status "{task_status_str}"',
                            'task_id': task_id,
                            'current_status': task_status_str,
                            'message': 'Only tasks with status "todo" can be started'
                        }, indent=2)
                    )],
                    isError=True
                )

            # Update task status to in_progress
            task.status = 'in_progress'
            task.updated_at = datetime.utcnow()

            # Add feedback about who started the task
            task.feedback_content = f"Task started by {ai_identifier}"
            task.feedback_at = datetime.utcnow()

            # Update project last activity
            project = Project.query.get(task.project_id)
            if project:
                project.last_activity_at = datetime.utcnow()

            db.session.commit()

            result_data = {
                'task_id': task_id,
                'status': 'in_progress',
                'started_by': ai_identifier,
                'message': 'Task successfully started',
                'timestamp': datetime.utcnow().isoformat()
            }

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(result_data, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error starting task: {str(e)}")
            db.session.rollback()
            raise

    async def _submit_task_feedback(self, arguments: Dict[str, Any]) -> CallToolResult:
        """Submit feedback for a task"""
        try:
            task_id = arguments.get('task_id')
            project_name = arguments.get('project_name')
            feedback_content = arguments.get('feedback_content')
            status = arguments.get('status')
            ai_identifier = arguments.get('ai_identifier', 'AI Assistant')

            if not all([task_id, project_name, feedback_content, status]):
                raise ValueError("task_id, project_name, feedback_content, and status are required")

            # Verify task exists and belongs to the specified project
            task = Task.query.get(task_id)
            if not task:
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=json.dumps({
                            'error': f'Task with ID {task_id} not found'
                        }, indent=2)
                    )]
                )

            project = Project.query.get(task.project_id)
            if not project or project.name != project_name:
                return CallToolResult(
                    content=[TextContent(
                        type="text",
                        text=json.dumps({
                            'error': f'Task {task_id} does not belong to project "{project_name}"'
                        }, indent=2)
                    )]
                )

            # Update task with feedback
            task.feedback_content = feedback_content
            task.feedback_at = datetime.utcnow()
            task.status = status

            # Update project last activity
            project.last_activity_at = datetime.utcnow()

            db.session.commit()

            result_data = {
                'task_id': task_id,
                'project_name': project_name,
                'status': status,
                'feedback_submitted': True,
                'feedback_content': feedback_content,
                'ai_identifier': ai_identifier,
                'timestamp': datetime.utcnow().isoformat()
            }

            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(result_data, indent=2)
                )]
            )
        except Exception as e:
            logger.error(f"Error submitting task feedback: {str(e)}")
            db.session.rollback()
            raise

async def main():
    """Main entry point for the MCP server"""
    logger.info("Starting Todo for AI MCP Server...")

    # 从命令行参数获取API Token
    api_token = None
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            if arg.startswith('--api-token='):
                api_token = arg.split('=', 1)[1]
                break
            elif arg.startswith('--api_token='):
                api_token = arg.split('=', 1)[1]
                break

    # 从环境变量获取API Token（如果命令行没有提供）
    if not api_token:
        api_token = os.environ.get('TODO_API_TOKEN')

    if api_token:
        logger.info("API Token provided - running in authenticated mode")
    else:
        logger.warning("No API Token provided - running in unauthenticated mode (limited functionality)")

    # Create server instance
    mcp_server = TodoMCPServer(api_token=api_token)

    # Setup stdio server
    async with stdio_server(mcp_server.server) as streams:
        logger.info("MCP Server is running and ready to accept connections")
        await mcp_server.server.run(*streams)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("MCP Server stopped by user")
    except Exception as e:
        logger.error(f"MCP Server error: {str(e)}")
        sys.exit(1)
