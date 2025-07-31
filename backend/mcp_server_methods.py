"""
Additional methods for MCP Server
"""

import json
import logging
from datetime import datetime
from typing import Any, Dict

from mcp.types import CallToolResult, TextContent
from models import db, Task, Project, ContextRule

logger = logging.getLogger(__name__)

class MCPServerMethods:
    """Additional methods for MCP Server"""
    
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
                'description': task.description,
                'content': task.content,
                'status': task.status,
                'priority': task.priority,
                'assignee': task.assignee,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'estimated_hours': task.estimated_hours,
                'tags': task.tags,
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
            
            task_data = {
                'id': task.id,
                'project_id': task.project_id,
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
                'updated_at': task.updated_at.isoformat(),
                'completed_at': task.completed_at.isoformat() if task.completed_at else None,
                'message': 'Task updated successfully'
            }
            
            return CallToolResult(
                content=[TextContent(
                    type="text",
                    text=json.dumps(task_data, indent=2)
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
            
            # Merge rules by priority (higher priority first)
            all_rules = sorted(
                global_rules + project_rules,
                key=lambda x: x.priority,
                reverse=True
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
