#!/usr/bin/env python3
"""
Simple MCP Server for Todo for AI

A simplified implementation that provides basic MCP functionality
for AI assistants to interact with the Todo for AI system.
"""

import asyncio
import json
import logging
import sys
from typing import Any, Dict, List

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SimpleMCPServer:
    """Simple MCP Server implementation"""
    
    def __init__(self):
        self.tools = self._define_tools()
        
    def _define_tools(self) -> List[Dict[str, Any]]:
        """Define available tools"""
        return [
            {
                "name": "list_projects",
                "description": "List all projects with optional filtering",
                "parameters": {
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
            },
            {
                "name": "create_project",
                "description": "Create a new project",
                "parameters": {
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
            },
            {
                "name": "list_tasks",
                "description": "List tasks with optional filtering",
                "parameters": {
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
                        "limit": {
                            "type": "integer",
                            "description": "Maximum number of tasks to return (default: 50)"
                        }
                    }
                }
            },
            {
                "name": "create_task",
                "description": "Create a new task",
                "parameters": {
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
                        "assignee": {
                            "type": "string",
                            "description": "The person assigned to this task"
                        }
                    },
                    "required": ["project_id", "title"]
                }
            },
            {
                "name": "update_task",
                "description": "Update an existing task",
                "parameters": {
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
                        "assignee": {"type": "string"}
                    },
                    "required": ["task_id"]
                }
            },
            {
                "name": "delete_task",
                "description": "Delete a task",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "task_id": {
                            "type": "integer",
                            "description": "The ID of the task to delete"
                        }
                    },
                    "required": ["task_id"]
                }
            },
            {
                "name": "get_context_rules",
                "description": "Get merged context rules for AI execution",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "project_id": {
                            "type": "integer",
                            "description": "Project ID to get project-specific rules (optional)"
                        }
                    }
                }
            }
        ]
    
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming MCP requests"""
        try:
            method = request.get("method")
            params = request.get("params", {})
            request_id = request.get("id")
            
            if method == "initialize":
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {
                            "tools": {}
                        },
                        "serverInfo": {
                            "name": "todo-for-ai",
                            "version": "1.0.0"
                        }
                    }
                }
            
            elif method == "tools/list":
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "tools": self.tools
                    }
                }
            
            elif method == "tools/call":
                tool_name = params.get("name")
                arguments = params.get("arguments", {})
                
                result = await self.call_tool(tool_name, arguments)
                
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": result
                            }
                        ]
                    }
                }
            
            else:
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                }
                
        except Exception as e:
            logger.error(f"Error handling request: {str(e)}")
            return {
                "jsonrpc": "2.0",
                "id": request.get("id"),
                "error": {
                    "code": -32603,
                    "message": f"Internal error: {str(e)}"
                }
            }
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        """Call a specific tool"""
        # Import here to avoid circular imports
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))

        # Import directly from the app.py file
        import importlib.util
        import os

        # Load app.py module
        app_path = os.path.join(os.path.dirname(__file__), 'app.py')
        spec = importlib.util.spec_from_file_location("app", app_path)
        app_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(app_module)

        from models import db, Project, Task, ContextRule

        app = app_module.create_app()
        
        with app.app_context():
            if tool_name == "list_projects":
                return await self._list_projects(arguments)
            elif tool_name == "create_project":
                return await self._create_project(arguments)
            elif tool_name == "list_tasks":
                return await self._list_tasks(arguments)
            elif tool_name == "create_task":
                return await self._create_task(arguments)
            elif tool_name == "update_task":
                return await self._update_task(arguments)
            elif tool_name == "delete_task":
                return await self._delete_task(arguments)
            elif tool_name == "get_context_rules":
                return await self._get_context_rules(arguments)
            else:
                raise ValueError(f"Unknown tool: {tool_name}")
    
    async def _list_projects(self, arguments: Dict[str, Any]) -> str:
        """List projects"""
        from models import Project, Task, db
        
        query = Project.query
        
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
            task_count = Task.query.filter(Task.project_id == project.id).count()
            projects_data.append({
                'id': project.id,
                'name': project.name,
                'description': project.description,
                'color': project.color,
                'status': project.status.value if hasattr(project.status, 'value') else str(project.status),
                'task_count': task_count,
                'created_at': project.created_at.isoformat()
            })
        
        return json.dumps({
            'projects': projects_data,
            'total': len(projects_data)
        }, indent=2)
    
    async def _create_project(self, arguments: Dict[str, Any]) -> str:
        """Create a new project"""
        from models import Project, db
        
        project = Project(
            name=arguments['name'],
            description=arguments.get('description', ''),
            color=arguments.get('color', '#1890ff'),
            created_by='mcp-client'
        )
        
        db.session.add(project)
        db.session.commit()
        
        return json.dumps({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'color': project.color,
            'status': project.status.value if hasattr(project.status, 'value') else str(project.status),
            'message': 'Project created successfully'
        }, indent=2)
    
    async def _list_tasks(self, arguments: Dict[str, Any]) -> str:
        """List tasks"""
        from models import Task, Project, db
        
        query = Task.query.join(Project)
        
        if 'project_id' in arguments:
            query = query.filter(Task.project_id == arguments['project_id'])
        
        if 'status' in arguments:
            query = query.filter(Task.status == arguments['status'])
        
        if 'priority' in arguments:
            query = query.filter(Task.priority == arguments['priority'])
        
        limit = arguments.get('limit', 50)
        tasks = query.order_by(Task.updated_at.desc()).limit(limit).all()
        
        tasks_data = []
        for task in tasks:
            tasks_data.append({
                'id': task.id,
                'project_id': task.project_id,
                'project_name': task.project.name,
                'title': task.title,
                'description': task.description,
                'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
                'priority': task.priority.value if hasattr(task.priority, 'value') else str(task.priority),
                'assignee': task.assignee,
                'created_at': task.created_at.isoformat()
            })
        
        return json.dumps({
            'tasks': tasks_data,
            'total': len(tasks_data)
        }, indent=2)
    
    async def _create_task(self, arguments: Dict[str, Any]) -> str:
        """Create a new task"""
        from models import Task, Project, db
        
        # Validate project exists
        project = Project.query.get(arguments['project_id'])
        if not project:
            raise ValueError(f"Project with ID {arguments['project_id']} not found")
        
        task = Task(
            project_id=arguments['project_id'],
            title=arguments['title'],
            description=arguments.get('description', ''),
            content=arguments.get('content', ''),
            status=arguments.get('status', 'todo'),
            priority=arguments.get('priority', 'medium'),
            assignee=arguments.get('assignee'),
            created_by='mcp-client'
        )
        
        db.session.add(task)
        db.session.commit()
        
        return json.dumps({
            'id': task.id,
            'project_id': task.project_id,
            'title': task.title,
            'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
            'priority': task.priority.value if hasattr(task.priority, 'value') else str(task.priority),
            'message': 'Task created successfully'
        }, indent=2)
    
    async def _update_task(self, arguments: Dict[str, Any]) -> str:
        """Update an existing task"""
        from models import Task, db
        from datetime import datetime
        
        task_id = arguments['task_id']
        task = Task.query.get(task_id)
        
        if not task:
            raise ValueError(f"Task with ID {task_id} not found")
        
        # Update fields if provided
        for field in ['title', 'description', 'content', 'status', 'priority', 'assignee']:
            if field in arguments:
                setattr(task, field, arguments[field])
        
        task.updated_at = datetime.utcnow()
        db.session.commit()
        
        return json.dumps({
            'id': task.id,
            'title': task.title,
            'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
            'message': 'Task updated successfully'
        }, indent=2)

    async def _delete_task(self, arguments: Dict[str, Any]) -> str:
        """Delete a task"""
        from models import Task, db

        task_id = arguments['task_id']
        task = Task.query.get(task_id)

        if not task:
            raise ValueError(f"Task with ID {task_id} not found")

        # Store task info before deletion
        task_info = {
            'id': task.id,
            'title': task.title,
            'project_id': task.project_id,
            'status': task.status.value if hasattr(task.status, 'value') else str(task.status),
            'message': 'Task deleted successfully'
        }

        # Delete the task
        db.session.delete(task)
        db.session.commit()

        return json.dumps(task_info, indent=2)

    async def _get_context_rules(self, arguments: Dict[str, Any]) -> str:
        """Get merged context rules"""
        from models import ContextRule
        
        project_id = arguments.get('project_id')
        
        # Get global rules
        global_rules = ContextRule.query.filter(
            ContextRule.rule_type == 'global',
            ContextRule.is_active == True
        ).order_by(ContextRule.priority.desc()).all()
        
        # Get project rules if project_id is provided
        project_rules = []
        if project_id:
            project_rules = ContextRule.query.filter(
                ContextRule.rule_type == 'project',
                ContextRule.project_id == project_id,
                ContextRule.is_active == True
            ).order_by(ContextRule.priority.desc()).all()
        
        # Merge rules by priority
        all_rules = sorted(
            global_rules + project_rules,
            key=lambda x: x.priority,
            reverse=True
        )
        
        # Build merged content
        merged_content_parts = []
        for rule in all_rules:
            merged_content_parts.append(f"# {rule.name}")
            if rule.description:
                merged_content_parts.append(f"## Description: {rule.description}")
            merged_content_parts.append(rule.content)
            merged_content_parts.append("")
        
        merged_content = "\n".join(merged_content_parts)
        
        return json.dumps({
            'merged_content': merged_content,
            'total_rules': len(all_rules),
            'global_rules_count': len(global_rules),
            'project_rules_count': len(project_rules)
        }, indent=2)

async def run_server():
    """Run the MCP server"""
    server = SimpleMCPServer()
    logger.info("Simple MCP Server started")
    
    try:
        while True:
            # Read JSON-RPC request from stdin
            line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
            if not line:
                break
            
            try:
                request = json.loads(line.strip())
                response = await server.handle_request(request)
                
                # Write JSON-RPC response to stdout
                print(json.dumps(response), flush=True)
                
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received: {line}")
                continue
                
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(run_server())
