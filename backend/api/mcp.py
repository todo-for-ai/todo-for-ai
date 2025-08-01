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
        from flask import current_app

        auth_start_time = time.time()
        auth_id = f"auth-{int(time.time() * 1000)}-{id(request)}"

        current_app.logger.debug(f"[AUTH_START] {auth_id} API token authentication started", extra={
            'auth_id': auth_id,
            'endpoint': request.endpoint,
            'method': request.method,
            'path': request.path,
            'remote_addr': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', 'Unknown')
        })

        # 从请求头获取token
        auth_header = request.headers.get('Authorization')

        current_app.logger.debug(f"[AUTH_HEADER] {auth_id} Authorization header check", extra={
            'auth_id': auth_id,
            'has_auth_header': bool(auth_header),
            'header_format_valid': bool(auth_header and auth_header.startswith('Bearer ')) if auth_header else False
        })

        if not auth_header or not auth_header.startswith('Bearer '):
            current_app.logger.warning(f"[AUTH_FAILED] {auth_id} Missing or invalid authorization header", extra={
                'auth_id': auth_id,
                'auth_header_present': bool(auth_header),
                'auth_header_format': auth_header[:20] + '...' if auth_header and len(auth_header) > 20 else auth_header
            })
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]
        token_prefix = token[:8] + '...' if len(token) > 8 else token

        current_app.logger.debug(f"[AUTH_TOKEN] {auth_id} Token extracted", extra={
            'auth_id': auth_id,
            'token_prefix': token_prefix,
            'token_length': len(token)
        })

        # 验证token
        token_verify_start = time.time()
        api_token = ApiToken.verify_token(token)
        token_verify_duration = time.time() - token_verify_start

        current_app.logger.debug(f"[AUTH_VERIFY] {auth_id} Token verification completed", extra={
            'auth_id': auth_id,
            'token_prefix': token_prefix,
            'verify_duration_ms': round(token_verify_duration * 1000, 2),
            'token_valid': bool(api_token),
            'token_id': api_token.id if api_token else None,
            'user_id': api_token.user.id if api_token and api_token.user else None
        })

        if not api_token:
            current_app.logger.warning(f"[AUTH_FAILED] {auth_id} Invalid or expired token", extra={
                'auth_id': auth_id,
                'token_prefix': token_prefix,
                'verify_duration_ms': round(token_verify_duration * 1000, 2)
            })
            return jsonify({'error': 'Invalid or expired token'}), 401

        # 将token信息添加到g对象
        g.api_token = api_token
        g.current_user = api_token.user

        auth_duration = time.time() - auth_start_time
        current_app.logger.info(f"[AUTH_SUCCESS] {auth_id} Authentication successful", extra={
            'auth_id': auth_id,
            'auth_duration_ms': round(auth_duration * 1000, 2),
            'token_id': api_token.id,
            'user_id': api_token.user.id,
            'user_email': api_token.user.email if hasattr(api_token.user, 'email') else None,
            'token_name': api_token.name if hasattr(api_token, 'name') else None
        })

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
    import logging
    from flask import current_app

    call_start_time = time.time()
    call_id = f"mcp-call-{int(time.time() * 1000)}-{id(request)}"

    current_app.logger.info(f"[MCP_CALL_START] {call_id} MCP tool call initiated", extra={
        'call_id': call_id,
        'request_id': getattr(g, 'request_id', 'unknown'),
        'user_id': g.current_user.id if hasattr(g, 'current_user') and g.current_user else None,
        'api_token_id': g.api_token.id if hasattr(g, 'api_token') and g.api_token else None,
        'remote_addr': request.remote_addr,
        'user_agent': request.headers.get('User-Agent', 'Unknown'),
        'timestamp': datetime.utcnow().isoformat()
    })

    try:
        data = request.get_json()

        current_app.logger.debug(f"[MCP_CALL_DATA] {call_id} Request data received", extra={
            'call_id': call_id,
            'has_data': bool(data),
            'data_size': len(str(data)) if data else 0,
            'data_keys': list(data.keys()) if data else []
        })

        if not data:
            current_app.logger.warning(f"[MCP_CALL_ERROR] {call_id} No data provided")
            return jsonify({'error': 'No data provided'}), 400

        tool_name = data.get('name')
        arguments = data.get('arguments', {})

        current_app.logger.info(f"[MCP_CALL_TOOL] {call_id} Tool call details", extra={
            'call_id': call_id,
            'tool_name': tool_name,
            'has_arguments': bool(arguments),
            'arguments_keys': list(arguments.keys()) if arguments else [],
            'arguments_size': len(str(arguments)) if arguments else 0
        })

        if not tool_name:
            current_app.logger.warning(f"[MCP_CALL_ERROR] {call_id} Tool name is required")
            return jsonify({'error': 'Tool name is required'}), 400

        # 记录工具调用开始
        tool_start_time = time.time()
        current_app.logger.info(f"[MCP_TOOL_START] {call_id} Executing tool: {tool_name}", extra={
            'call_id': call_id,
            'tool_name': tool_name,
            'arguments': arguments,
            'user_id': g.current_user.id if hasattr(g, 'current_user') and g.current_user else None
        })

        # 调用对应的工具函数
        result = None
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
            current_app.logger.error(f"[MCP_TOOL_ERROR] {call_id} Unknown tool: {tool_name}", extra={
                'call_id': call_id,
                'tool_name': tool_name,
                'available_tools': ['get_project_tasks_by_name', 'get_task_by_id', 'submit_task_feedback', 'create_task', 'get_project_info']
            })
            return jsonify({'error': f'Unknown tool: {tool_name}'}), 400

        tool_duration = time.time() - tool_start_time
        total_duration = time.time() - call_start_time

        # 检查结果中是否有错误
        has_error = isinstance(result, dict) and 'error' in result

        if has_error:
            current_app.logger.warning(f"[MCP_TOOL_ERROR] {call_id} Tool returned error", extra={
                'call_id': call_id,
                'tool_name': tool_name,
                'tool_duration_ms': round(tool_duration * 1000, 2),
                'total_duration_ms': round(total_duration * 1000, 2),
                'error': result.get('error'),
                'result': result
            })
        else:
            current_app.logger.info(f"[MCP_TOOL_SUCCESS] {call_id} Tool executed successfully", extra={
                'call_id': call_id,
                'tool_name': tool_name,
                'tool_duration_ms': round(tool_duration * 1000, 2),
                'total_duration_ms': round(total_duration * 1000, 2),
                'result_size': len(str(result)) if result else 0,
                'result_type': type(result).__name__,
                'result_keys': list(result.keys()) if isinstance(result, dict) else []
            })

        current_app.logger.info(f"[MCP_CALL_END] {call_id} MCP tool call completed", extra={
            'call_id': call_id,
            'tool_name': tool_name,
            'success': not has_error,
            'total_duration_ms': round(total_duration * 1000, 2),
            'status_code': 400 if has_error else 200
        })

        return jsonify(result)

    except Exception as e:
        total_duration = time.time() - call_start_time
        current_app.logger.error(f"[MCP_CALL_EXCEPTION] {call_id} Exception during MCP tool call", extra={
            'call_id': call_id,
            'tool_name': tool_name if 'tool_name' in locals() else 'unknown',
            'total_duration_ms': round(total_duration * 1000, 2),
            'exception_type': type(e).__name__,
            'exception_message': str(e),
            'user_id': g.current_user.id if hasattr(g, 'current_user') and g.current_user else None
        }, exc_info=True)
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
    status = arguments.get('status', 'todo')
    priority = arguments.get('priority', 'medium')
    assignee = arguments.get('assignee')
    due_date = arguments.get('due_date')
    tags = arguments.get('tags', [])
    related_files = arguments.get('related_files', [])
    is_ai_task = arguments.get('is_ai_task', True)
    creator_identifier = arguments.get('ai_identifier', 'MCP Client')

    if not project_id:
        return {'error': 'project_id is required'}

    if not title:
        return {'error': 'title is required'}

    # 清理输入
    title = sanitize_input(title)
    content = sanitize_input(content) if content else ''
    assignee = sanitize_input(assignee) if assignee else None
    creator_identifier = sanitize_input(creator_identifier) if creator_identifier else 'MCP Client'

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
            status=status,
            priority=priority,
            project_id=project_id,
            creator_id=g.current_user.id,
            assignee=assignee,
            due_date=due_date_obj,
            is_ai_task=is_ai_task,
            creator_identifier=creator_identifier,
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
            'status': task.status.value if hasattr(task.status, 'value') else task.status,
            'priority': task.priority.value if hasattr(task.priority, 'value') else task.priority,
            'project_id': task.project_id,
            'project_name': project.name,
            'creator_id': task.creator_id,
            'assignee': task.assignee,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'is_ai_task': task.is_ai_task,
            'creator_identifier': task.creator_identifier,
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
    from flask import current_app

    func_start_time = time.time()
    func_id = f"get-project-info-{int(time.time() * 1000)}-{id(arguments)}"

    current_app.logger.info(f"[GET_PROJECT_INFO_START] {func_id} Function started", extra={
        'func_id': func_id,
        'arguments': arguments,
        'user_id': g.current_user.id if hasattr(g, 'current_user') and g.current_user else None,
        'timestamp': datetime.utcnow().isoformat()
    })

    project_id = arguments.get('project_id')
    project_name = arguments.get('project_name')

    current_app.logger.debug(f"[GET_PROJECT_INFO_ARGS] {func_id} Arguments parsed", extra={
        'func_id': func_id,
        'project_id': project_id,
        'project_name': project_name,
        'has_project_id': bool(project_id),
        'has_project_name': bool(project_name)
    })

    if not project_id and not project_name:
        current_app.logger.warning(f"[GET_PROJECT_INFO_ERROR] {func_id} Missing required arguments")
        return {'error': 'Either project_id or project_name is required'}

    # 查找项目
    query_start_time = time.time()
    if project_id:
        current_app.logger.debug(f"[GET_PROJECT_INFO_QUERY] {func_id} Querying by project_id: {project_id}")
        project = Project.query.filter_by(id=project_id).first()
    else:
        project_name = sanitize_input(project_name)
        current_app.logger.debug(f"[GET_PROJECT_INFO_QUERY] {func_id} Querying by project_name: {project_name}")
        project = Project.query.filter_by(name=project_name).first()

    query_duration = time.time() - query_start_time
    current_app.logger.debug(f"[GET_PROJECT_INFO_QUERY_RESULT] {func_id} Query completed", extra={
        'func_id': func_id,
        'query_duration_ms': round(query_duration * 1000, 2),
        'project_found': bool(project),
        'project_id': project.id if project else None,
        'project_name': project.name if project else None
    })

    if not project:
        # 只返回当前用户有权限访问的项目
        user_projects_query_start = time.time()
        user_projects = Project.query.filter_by(owner_id=g.current_user.id).all()
        user_projects_query_duration = time.time() - user_projects_query_start

        identifier = f'ID {project_id}' if project_id else f'name "{project_name}"'

        current_app.logger.warning(f"[GET_PROJECT_INFO_NOT_FOUND] {func_id} Project not found", extra={
            'func_id': func_id,
            'identifier': identifier,
            'user_projects_count': len(user_projects),
            'user_projects_query_duration_ms': round(user_projects_query_duration * 1000, 2),
            'available_projects': [{'id': p.id, 'name': p.name} for p in user_projects]
        })

        return {
            'error': f'Project with {identifier} not found',
            'available_projects': [{'id': p.id, 'name': p.name} for p in user_projects]
        }

    # 检查权限 - 只能访问自己创建的项目
    if project.owner_id != g.current_user.id:
        current_app.logger.warning(f"[GET_PROJECT_INFO_ACCESS_DENIED] {func_id} Access denied", extra={
            'func_id': func_id,
            'project_id': project.id,
            'project_name': project.name,
            'project_owner_id': project.owner_id,
            'current_user_id': g.current_user.id
        })
        return {'error': 'Access denied: You can only access your own projects'}

    try:
        # 获取项目统计信息
        stats_start_time = time.time()
        current_app.logger.debug(f"[GET_PROJECT_INFO_STATS] {func_id} Starting statistics queries")

        total_tasks = Task.query.filter_by(project_id=project.id).count()
        todo_tasks = Task.query.filter_by(project_id=project.id, status='todo').count()
        in_progress_tasks = Task.query.filter_by(project_id=project.id, status='in_progress').count()
        review_tasks = Task.query.filter_by(project_id=project.id, status='review').count()
        done_tasks = Task.query.filter_by(project_id=project.id, status='done').count()
        cancelled_tasks = Task.query.filter_by(project_id=project.id, status='cancelled').count()

        stats_duration = time.time() - stats_start_time
        current_app.logger.debug(f"[GET_PROJECT_INFO_STATS_RESULT] {func_id} Statistics queries completed", extra={
            'func_id': func_id,
            'stats_duration_ms': round(stats_duration * 1000, 2),
            'total_tasks': total_tasks,
            'todo_tasks': todo_tasks,
            'in_progress_tasks': in_progress_tasks,
            'review_tasks': review_tasks,
            'done_tasks': done_tasks,
            'cancelled_tasks': cancelled_tasks
        })

        # 获取最近的任务
        recent_tasks_start_time = time.time()
        current_app.logger.debug(f"[GET_PROJECT_INFO_RECENT] {func_id} Querying recent tasks")

        recent_tasks = Task.query.filter_by(project_id=project.id)\
                          .order_by(Task.updated_at.desc())\
                          .limit(5)\
                          .all()

        recent_tasks_duration = time.time() - recent_tasks_start_time
        current_app.logger.debug(f"[GET_PROJECT_INFO_RECENT_RESULT] {func_id} Recent tasks query completed", extra={
            'func_id': func_id,
            'recent_tasks_duration_ms': round(recent_tasks_duration * 1000, 2),
            'recent_tasks_count': len(recent_tasks)
        })

        recent_tasks_data = []
        for task in recent_tasks:
            recent_tasks_data.append({
                'id': task.id,
                'title': task.title,
                'status': task.status.value if hasattr(task.status, 'value') else task.status,
                'priority': task.priority.value if hasattr(task.priority, 'value') else task.priority,
                'updated_at': task.updated_at.isoformat()
            })

        completion_rate = round((done_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2)

        result = {
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'status': project.status.value if hasattr(project.status, 'value') else getattr(project, 'status', 'active'),
            'github_url': project.github_url,
            'project_context': project.project_context,
            'owner_id': project.owner_id,
            'created_at': project.created_at.isoformat(),
            'updated_at': project.updated_at.isoformat(),
            'total_tasks': total_tasks,
            'pending_tasks': todo_tasks + in_progress_tasks + review_tasks,
            'completed_tasks': done_tasks,
            'completion_rate': completion_rate,
            'statistics': {
                'total_tasks': total_tasks,
                'todo_tasks': todo_tasks,
                'in_progress_tasks': in_progress_tasks,
                'review_tasks': review_tasks,
                'done_tasks': done_tasks,
                'cancelled_tasks': cancelled_tasks,
                'completion_rate': completion_rate
            },
            'recent_tasks': recent_tasks_data
        }

        func_duration = time.time() - func_start_time
        current_app.logger.info(f"[GET_PROJECT_INFO_SUCCESS] {func_id} Function completed successfully", extra={
            'func_id': func_id,
            'project_id': project.id,
            'project_name': project.name,
            'func_duration_ms': round(func_duration * 1000, 2),
            'result_size': len(str(result)),
            'total_tasks': total_tasks,
            'completion_rate': completion_rate
        })

        return result

    except Exception as e:
        func_duration = time.time() - func_start_time
        current_app.logger.error(f"[GET_PROJECT_INFO_EXCEPTION] {func_id} Exception occurred", extra={
            'func_id': func_id,
            'project_id': project.id if 'project' in locals() and project else None,
            'func_duration_ms': round(func_duration * 1000, 2),
            'exception_type': type(e).__name__,
            'exception_message': str(e)
        }, exc_info=True)
        return {'error': f'Failed to get project info: {str(e)}'}
