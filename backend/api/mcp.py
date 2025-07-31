"""
MCP (Model Context Protocol) HTTP API接口
"""

import json
import asyncio
from flask import Blueprint, request, jsonify, g
from models import db, Project, Task, TaskStatus, ContextRule, ApiToken
from api.base import handle_api_error
from app.github_config import require_auth
from datetime import datetime, timedelta
from functools import wraps
import html
import re
from collections import defaultdict
import time

mcp_bp = Blueprint('mcp', __name__)

# 简单的内存频率限制器
rate_limiter = defaultdict(list)


def rate_limit(max_requests=10, window_seconds=60):
    """频率限制装饰器"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 获取客户端标识（IP地址或用户ID）
            client_id = request.remote_addr
            if hasattr(g, 'current_user') and g.current_user:
                client_id = f"user_{g.current_user.id}"

            current_time = time.time()

            # 清理过期的请求记录
            rate_limiter[client_id] = [
                req_time for req_time in rate_limiter[client_id]
                if current_time - req_time < window_seconds
            ]

            # 检查是否超过限制
            if len(rate_limiter[client_id]) >= max_requests:
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'message': f'Maximum {max_requests} requests per {window_seconds} seconds'
                }), 429

            # 记录当前请求
            rate_limiter[client_id].append(current_time)

            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_api_token_auth(f):
    """API Token认证装饰器 - 专门用于MCP接口"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 从请求头获取token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]

        # 验证token
        api_token = ApiToken.verify_token(token)
        if not api_token:
            return jsonify({'error': 'Invalid or expired token'}), 401

        # 将token信息添加到g对象
        g.api_token = api_token
        g.current_user = api_token.user

        return f(*args, **kwargs)

    return decorated_function


def sanitize_input(text):
    """清理输入，防止XSS攻击"""
    if not isinstance(text, str):
        return text

    # HTML转义
    text = html.escape(text)

    # 移除潜在的脚本标签
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    text = re.sub(r'on\w+\s*=', '', text, flags=re.IGNORECASE)

    return text


def validate_integer(value, field_name):
    """验证整数输入"""
    if isinstance(value, int):
        return value

    if isinstance(value, str) and value.isdigit():
        return int(value)

    raise ValueError(f"{field_name} must be a valid integer")


@mcp_bp.route('/tools', methods=['GET'])
@require_api_token_auth
@rate_limit(max_requests=60, window_seconds=60)
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
@require_api_token_auth
@rate_limit(max_requests=60, window_seconds=60)
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
        elif tool_name == 'create_task':
            result = create_task(arguments)
        elif tool_name == 'get_project_info':
            result = get_project_info(arguments)
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

    # 清理输入
    project_name = sanitize_input(project_name)

    # 查找项目
    project = Project.query.filter_by(name=project_name).first()
    if not project:
        # 只返回当前用户有权限访问的项目
        user_projects = Project.query.filter_by(owner_id=g.current_user.id).all()
        return {
            'error': f'Project "{project_name}" not found',
            'available_projects': [p.name for p in user_projects]
        }

    # 检查权限 - 只能访问自己创建的项目
    if project.owner_id != g.current_user.id:
        return {'error': 'Access denied: You can only access your own projects'}
    
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

    # 验证task_id是整数
    try:
        task_id = validate_integer(task_id, 'task_id')
    except ValueError as e:
        return {'error': str(e)}

    task = Task.query.get(task_id)
    if not task:
        return {'error': f'Task with ID {task_id} not found'}

    # 检查权限 - 只能访问自己创建的任务或自己项目中的任务
    if task.creator_id != g.current_user.id:
        # 检查是否是项目创建者
        project = Project.query.get(task.project_id)
        if not project or project.owner_id != g.current_user.id:
            return {'error': 'Access denied: You can only access your own tasks'}

    # 获取项目信息
    project = Project.query.get(task.project_id)

    task_data = task.to_dict()
    task_data['project_name'] = project.name if project else None
    task_data['project_description'] = project.description if project else None

    # 获取项目级别的上下文规则并拼接到任务内容后
    if project:
        # 获取任务创建者的用户ID
        task_user_id = task.creator_id if task.creator_id else None

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

    # 验证和清理输入
    try:
        task_id = validate_integer(task_id, 'task_id')
    except ValueError as e:
        return {'error': str(e)}

    project_name = sanitize_input(project_name)
    feedback_content = sanitize_input(feedback_content)
    ai_identifier = sanitize_input(ai_identifier)

    # 验证状态值
    valid_statuses = ['in_progress', 'review', 'done', 'cancelled']
    if status not in valid_statuses:
        return {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}

    # 验证任务存在并属于指定项目
    task = Task.query.get(task_id)
    if not task:
        return {'error': f'Task with ID {task_id} not found'}

    project = Project.query.get(task.project_id)
    if not project or project.name != project_name:
        return {'error': f'Task {task_id} does not belong to project "{project_name}"'}

    # 检查权限 - 只能修改自己创建的任务或自己项目中的任务
    if task.creator_id != g.current_user.id and project.owner_id != g.current_user.id:
        return {'error': 'Access denied: You can only modify your own tasks'}
    
    # 跟踪状态变更
    old_status = task.status
    status_changed = str(old_status) != str(status)

    # 更新任务
    task.feedback_content = feedback_content
    task.feedback_at = datetime.utcnow()
    task.status = status

    # 更新项目最后活动时间
    project.last_activity_at = datetime.utcnow()

    db.session.commit()

    # 记录用户活跃度
    user_id = None
    if task.creator_id:
        user_id = task.creator_id
    elif project.owner_id:
        user_id = project.owner_id

    if user_id:
        from models import UserActivity
        try:
            if status_changed:
                UserActivity.record_activity(user_id, 'task_status_changed')
                # 如果任务状态变为完成，额外记录完成任务活跃度
                if status == 'done':
                    UserActivity.record_activity(user_id, 'task_completed')
            else:
                UserActivity.record_activity(user_id, 'task_updated')
        except Exception as e:
            print(f"Warning: Failed to record user activity: {str(e)}")
    
    return {
        'task_id': task_id,
        'project_name': project_name,
        'status': status,
        'feedback_submitted': True,
        'feedback_content': feedback_content,
        'ai_identifier': ai_identifier,
        'timestamp': datetime.utcnow().isoformat()
    }


def create_task(arguments):
    """创建新任务"""
    project_id = arguments.get('project_id')
    title = arguments.get('title')
    content = arguments.get('content', '')
    description = arguments.get('description', '')
    status = arguments.get('status', 'todo')
    priority = arguments.get('priority', 'medium')
    assignee = arguments.get('assignee')
    due_date = arguments.get('due_date')
    estimated_hours = arguments.get('estimated_hours')
    tags = arguments.get('tags', [])
    related_files = arguments.get('related_files', [])
    is_ai_task = arguments.get('is_ai_task', True)
    ai_identifier = arguments.get('ai_identifier', 'MCP Client')

    if not project_id:
        return {'error': 'project_id is required'}

    if not title:
        return {'error': 'title is required'}

    # 清理输入
    title = sanitize_input(title)
    content = sanitize_input(content) if content else ''
    description = sanitize_input(description) if description else ''
    assignee = sanitize_input(assignee) if assignee else None
    ai_identifier = sanitize_input(ai_identifier) if ai_identifier else 'MCP Client'

    # 验证项目存在且用户有权限
    project = Project.query.filter_by(id=project_id).first()
    if not project:
        return {'error': f'Project with ID {project_id} not found'}

    # 检查权限 - 只能在自己创建的项目中创建任务
    if project.owner_id != g.current_user.id:
        return {'error': 'Access denied: You can only create tasks in your own projects'}

    # 验证状态值
    valid_statuses = ['todo', 'in_progress', 'review', 'done', 'cancelled']
    if status not in valid_statuses:
        return {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}

    # 验证优先级值
    valid_priorities = ['low', 'medium', 'high', 'urgent']
    if priority not in valid_priorities:
        return {'error': f'Invalid priority. Must be one of: {", ".join(valid_priorities)}'}

    # 解析due_date
    due_date_obj = None
    if due_date:
        try:
            due_date_obj = datetime.strptime(due_date, '%Y-%m-%d').date()
        except ValueError:
            return {'error': 'Invalid due_date format. Use YYYY-MM-DD'}

    try:
        # 创建任务
        task = Task(
            title=title,
            content=content,
            description=description,
            status=status,
            priority=priority,
            project_id=project_id,
            creator_id=g.current_user.id,
            assignee=assignee,
            due_date=due_date_obj,
            estimated_hours=estimated_hours,
            is_ai_task=is_ai_task,
            ai_identifier=ai_identifier,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        db.session.add(task)
        db.session.commit()

        # 注意：标签和相关文件功能暂时不支持，因为相关模型尚未实现
        # 这些参数会被保存在返回结果中，但不会存储到数据库

        # 记录用户活跃度
        from models import UserActivity
        try:
            UserActivity.record_activity(g.current_user.id, 'task_created')
        except Exception as e:
            print(f"Warning: Failed to record user activity: {str(e)}")

        # 返回创建的任务信息
        return {
            'id': task.id,
            'title': task.title,
            'content': task.content,
            'description': task.description,
            'status': task.status,
            'priority': task.priority,
            'project_id': task.project_id,
            'project_name': project.name,
            'creator_id': task.creator_id,
            'assignee': task.assignee,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'estimated_hours': task.estimated_hours,
            'is_ai_task': task.is_ai_task,
            'ai_identifier': task.ai_identifier,
            'created_at': task.created_at.isoformat(),
            'updated_at': task.updated_at.isoformat(),
            'tags': tags,
            'related_files': related_files
        }

    except Exception as e:
        db.session.rollback()
        return {'error': f'Failed to create task: {str(e)}'}


def get_project_info(arguments):
    """获取项目详细信息"""
    project_id = arguments.get('project_id')
    project_name = arguments.get('project_name')

    if not project_id and not project_name:
        return {'error': 'Either project_id or project_name is required'}

    # 查找项目
    if project_id:
        project = Project.query.filter_by(id=project_id).first()
    else:
        project_name = sanitize_input(project_name)
        project = Project.query.filter_by(name=project_name).first()

    if not project:
        # 只返回当前用户有权限访问的项目
        user_projects = Project.query.filter_by(owner_id=g.current_user.id).all()
        identifier = f'ID {project_id}' if project_id else f'name "{project_name}"'
        return {
            'error': f'Project with {identifier} not found',
            'available_projects': [{'id': p.id, 'name': p.name} for p in user_projects]
        }

    # 检查权限 - 只能访问自己创建的项目
    if project.owner_id != g.current_user.id:
        return {'error': 'Access denied: You can only access your own projects'}

    try:
        # 获取项目统计信息
        total_tasks = Task.query.filter_by(project_id=project.id).count()
        todo_tasks = Task.query.filter_by(project_id=project.id, status='todo').count()
        in_progress_tasks = Task.query.filter_by(project_id=project.id, status='in_progress').count()
        review_tasks = Task.query.filter_by(project_id=project.id, status='review').count()
        done_tasks = Task.query.filter_by(project_id=project.id, status='done').count()
        cancelled_tasks = Task.query.filter_by(project_id=project.id, status='cancelled').count()

        # 获取最近的任务
        recent_tasks = Task.query.filter_by(project_id=project.id)\
                          .order_by(Task.updated_at.desc())\
                          .limit(5)\
                          .all()

        recent_tasks_data = []
        for task in recent_tasks:
            recent_tasks_data.append({
                'id': task.id,
                'title': task.title,
                'status': task.status,
                'priority': task.priority,
                'updated_at': task.updated_at.isoformat()
            })

        return {
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'github_repo': project.github_repo,
            'context': project.context,
            'owner_id': project.owner_id,
            'created_at': project.created_at.isoformat(),
            'updated_at': project.updated_at.isoformat(),
            'statistics': {
                'total_tasks': total_tasks,
                'todo_tasks': todo_tasks,
                'in_progress_tasks': in_progress_tasks,
                'review_tasks': review_tasks,
                'done_tasks': done_tasks,
                'cancelled_tasks': cancelled_tasks,
                'completion_rate': round((done_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2)
            },
            'recent_tasks': recent_tasks_data
        }

    except Exception as e:
        return {'error': f'Failed to get project info: {str(e)}'}
