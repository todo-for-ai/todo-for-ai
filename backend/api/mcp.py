"""
MCP (Model Context Protocol) HTTP API接口
"""

import json
import asyncio
from flask import Blueprint, request, jsonify
from models import db, Project, Task, TaskStatus
from api.base import handle_api_error
from datetime import datetime

mcp_bp = Blueprint('mcp', __name__)


@mcp_bp.route('/tools', methods=['GET'])
def list_tools():
    """列出可用的MCP工具"""
    try:
        tools = [
            {
                "name": "get_project_tasks_by_name",
                "description": "Get all pending tasks for a project by project name, sorted by creation time",
                "inputSchema": {
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
            },
            {
                "name": "get_task_by_id",
                "description": "Get detailed task information by task ID",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "task_id": {
                            "type": "integer",
                            "description": "The ID of the task to retrieve"
                        }
                    },
                    "required": ["task_id"]
                }
            },
            {
                "name": "submit_task_feedback",
                "description": "Submit feedback for a completed or in-progress task",
                "inputSchema": {
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
            }
        ]
        
        return jsonify({
            "tools": tools
        })
    
    except Exception as e:
        return handle_api_error(e)


@mcp_bp.route('/call', methods=['POST'])
def call_tool():
    """调用MCP工具"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        tool_name = data.get('name')
        arguments = data.get('arguments', {})
        
        if not tool_name:
            return jsonify({'error': 'Tool name is required'}), 400
        
        # 调用对应的工具函数
        if tool_name == 'get_project_tasks_by_name':
            result = get_project_tasks_by_name(arguments)
        elif tool_name == 'get_task_by_id':
            result = get_task_by_id(arguments)
        elif tool_name == 'submit_task_feedback':
            result = submit_task_feedback(arguments)
        else:
            return jsonify({'error': f'Unknown tool: {tool_name}'}), 400
        
        return jsonify(result)
    
    except Exception as e:
        return handle_api_error(e)


def get_project_tasks_by_name(arguments):
    """根据项目名称获取任务列表"""
    project_name = arguments.get('project_name')
    status_filter = arguments.get('status_filter', ['todo', 'in_progress', 'review'])
    
    if not project_name:
        return {'error': 'project_name is required'}
    
    # 查找项目
    project = Project.query.filter_by(name=project_name).first()
    if not project:
        return {
            'error': f'Project "{project_name}" not found',
            'available_projects': [p.name for p in Project.query.all()]
        }
    
    # 获取任务
    query = Task.query.filter_by(project_id=project.id)
    if status_filter:
        query = query.filter(Task.status.in_(status_filter))
    
    tasks = query.order_by(Task.created_at.asc()).all()
    
    tasks_data = []
    for task in tasks:
        task_dict = task.to_dict()
        task_dict['project_name'] = project.name
        tasks_data.append(task_dict)
    
    return {
        'project_name': project.name,
        'project_id': project.id,
        'status_filter': status_filter,
        'total_tasks': len(tasks_data),
        'tasks': tasks_data
    }


def get_task_by_id(arguments):
    """根据任务ID获取任务详情"""
    task_id = arguments.get('task_id')
    
    if not task_id:
        return {'error': 'task_id is required'}
    
    task = Task.query.get(task_id)
    if not task:
        return {'error': f'Task with ID {task_id} not found'}
    
    # 获取项目信息
    project = Project.query.get(task.project_id)
    
    task_data = task.to_dict()
    task_data['project_name'] = project.name if project else None
    task_data['project_description'] = project.description if project else None
    
    return task_data


def submit_task_feedback(arguments):
    """提交任务反馈"""
    task_id = arguments.get('task_id')
    project_name = arguments.get('project_name')
    feedback_content = arguments.get('feedback_content')
    status = arguments.get('status')
    ai_identifier = arguments.get('ai_identifier', 'AI Assistant')
    
    if not all([task_id, project_name, feedback_content, status]):
        return {'error': 'task_id, project_name, feedback_content, and status are required'}
    
    # 验证任务存在并属于指定项目
    task = Task.query.get(task_id)
    if not task:
        return {'error': f'Task with ID {task_id} not found'}
    
    project = Project.query.get(task.project_id)
    if not project or project.name != project_name:
        return {'error': f'Task {task_id} does not belong to project "{project_name}"'}
    
    # 更新任务
    task.feedback_content = feedback_content
    task.feedback_at = datetime.utcnow()
    task.status = status
    
    # 更新项目最后活动时间
    project.last_activity_at = datetime.utcnow()
    
    db.session.commit()
    
    return {
        'task_id': task_id,
        'project_name': project_name,
        'status': status,
        'feedback_submitted': True,
        'feedback_content': feedback_content,
        'ai_identifier': ai_identifier,
        'timestamp': datetime.utcnow().isoformat()
    }
