"""
任务 API 蓝图

提供任务的 CRUD 操作接口
"""

from datetime import datetime
from flask import Blueprint, request
from models import db, Task, TaskStatus, TaskPriority, Project, TaskHistory, ActionType, UserActivity
from .base import api_response, api_error, paginate_query, validate_json_request, get_request_args
from app.auth import optional_token_auth
from app.github_config import require_auth, get_current_user

# 创建蓝图
tasks_bp = Blueprint('tasks', __name__)


@tasks_bp.route('', methods=['GET'])
@require_auth
def list_tasks():
    """获取任务列表"""
    try:
        args = get_request_args()
        current_user = get_current_user()

        # 构建查询
        query = Task.query

        # 用户权限控制
        if current_user:
            if not current_user.is_admin():
                # 普通用户只能看到自己相关的任务
                query = query.join(Project).filter(Project.owner_id == current_user.id)
        else:
            # 未登录用户不能访问任务列表
            return api_error("Authentication required", 401)
        
        # 项目筛选
        if args['project_id']:
            query = query.filter(Task.project_id == args['project_id'])
        
        # 状态筛选
        if args['status']:
            try:
                # 支持多状态筛选，用逗号分隔
                if ',' in args['status']:
                    status_list = [s.strip() for s in args['status'].split(',')]
                    status_enums = []
                    for status_str in status_list:
                        status_enums.append(TaskStatus(status_str))
                    query = query.filter(Task.status.in_(status_enums))
                else:
                    status = TaskStatus(args['status'])
                    query = query.filter_by(status=status)
            except ValueError:
                return api_error(f"Invalid status: {args['status']}", 400)
        
        # 优先级筛选
        if args['priority']:
            try:
                priority = TaskPriority(args['priority'])
                query = query.filter_by(priority=priority)
            except ValueError:
                return api_error(f"Invalid priority: {args['priority']}", 400)
        

        
        # 搜索
        if args['search']:
            search_term = f"%{args['search']}%"
            query = query.filter(
                Task.title.like(search_term) |
                Task.content.like(search_term)
            )
        
        # 排序
        if args['sort_by'] == 'title':
            order_column = Task.title
        elif args['sort_by'] == 'priority':
            order_column = Task.priority
        elif args['sort_by'] == 'status':
            order_column = Task.status
        elif args['sort_by'] == 'due_date':
            order_column = Task.due_date
        elif args['sort_by'] == 'updated_at':
            order_column = Task.updated_at
        else:
            order_column = Task.created_at
        
        if args['sort_order'] == 'desc':
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
        
        # 分页
        result = paginate_query(query, args['page'], args['per_page'])
        
        # 包含项目信息
        for item in result['items']:
            if 'project_id' in item:
                project = Project.query.get(item['project_id'])
                if project:
                    item['project'] = {
                        'id': project.id,
                        'name': project.name,
                        'color': project.color
                    }
        
        return api_response(result, "Tasks retrieved successfully")
        
    except Exception as e:
        return api_error(f"Failed to retrieve tasks: {str(e)}", 500)


@tasks_bp.route('', methods=['POST'])
@require_auth
def create_task():
    """创建新任务"""
    try:
        current_user = get_current_user()

        # 验证请求数据
        data = validate_json_request(
            required_fields=['project_id'],
            optional_fields=[
                'title', 'content', 'status', 'priority',
                'due_date', 'tags', 'is_ai_task'
            ]
        )

        if isinstance(data, tuple):  # 错误响应
            return data

        # 验证项目是否存在
        project = Project.query.get(data['project_id'])
        if not project:
            return api_error("Project not found", 404, "PROJECT_NOT_FOUND")

        # 验证用户是否有权限在该项目中创建任务
        if not current_user.is_admin() and project.owner_id != current_user.id:
            return api_error("Permission denied", 403, "PERMISSION_DENIED")
        
        # 处理日期字段
        due_date = None
        if 'due_date' in data and data['due_date']:
            try:
                due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
            except ValueError:
                return api_error("Invalid due_date format. Use ISO format.", 400)
        
        # 处理状态和优先级
        status = TaskStatus.TODO
        if 'status' in data:
            try:
                status = TaskStatus(data['status'])
            except ValueError:
                return api_error(f"Invalid status: {data['status']}", 400)
        
        priority = TaskPriority.MEDIUM
        if 'priority' in data:
            try:
                priority = TaskPriority(data['priority'])
            except ValueError:
                return api_error(f"Invalid priority: {data['priority']}", 400)
        
        # 处理标题：如果没有提供标题，从内容中生成
        title = data.get('title', '').strip()
        if not title:
            content = data.get('content', '').strip()

            if content:
                # 从内容中提取第一行或前50个字符作为标题
                first_line = content.split('\n')[0].strip()
                if first_line.startswith('#'):
                    # 如果是Markdown标题，去掉#号
                    title = first_line.lstrip('#').strip()
                else:
                    title = first_line[:50] + ('...' if len(first_line) > 50 else '')
            else:
                # 如果都没有，生成默认标题
                title = f"新任务 - {datetime.now().strftime('%Y-%m-%d %H:%M')}"

        # 创建任务
        task = Task.create(
            project_id=data['project_id'],
            title=title,
            content=data.get('content', ''),
            status=status,
            priority=priority,
            due_date=due_date,
            tags=data.get('tags', []),
            is_ai_task=data.get('is_ai_task', False),
            creator_id=current_user.id,  # 设置创建者ID
            created_by=current_user.email  # 设置创建者邮箱
        )
        
        db.session.commit()

        # 记录历史
        TaskHistory.log_action(
            task_id=task.id,
            action=ActionType.CREATED,
            changed_by='api',
            comment='Task created via API'
        )

        # 记录用户活跃度
        if current_user:
            try:
                UserActivity.record_activity(current_user.id, 'task_created')
            except Exception as e:
                # 记录活跃度失败不应该影响任务创建
                print(f"Warning: Failed to record user activity: {str(e)}")

        return api_response(
            task.to_dict(include_project=True, include_stats=True),
            "Task created successfully",
            201
        )
        
    except Exception as e:
        db.session.rollback()
        return api_error(f"Failed to create task: {str(e)}", 500)


@tasks_bp.route('/<int:task_id>', methods=['GET'])
def get_task(task_id):
    """获取单个任务详情"""
    try:
        task = Task.query.get(task_id)
        if not task:
            return api_error("Task not found", 404, "TASK_NOT_FOUND")
        
        return api_response(
            task.to_dict(include_project=True, include_stats=True),
            "Task retrieved successfully"
        )
        
    except Exception as e:
        return api_error(f"Failed to retrieve task: {str(e)}", 500)


@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@require_auth
def update_task(task_id):
    """更新任务"""
    try:
        current_user = get_current_user()

        task = Task.query.get(task_id)
        if not task:
            return api_error("Task not found", 404, "TASK_NOT_FOUND")

        # 验证用户是否有权限更新该任务
        if not current_user.is_admin() and task.project.owner_id != current_user.id:
            return api_error("Permission denied", 403, "PERMISSION_DENIED")
        
        # 验证请求数据
        data = validate_json_request(
            optional_fields=[
                'title', 'content', 'status', 'priority',
                'due_date', 'completion_rate', 'tags'
            ]
        )
        
        if isinstance(data, tuple):  # 错误响应
            return data
        
        # 记录变更
        changes = []
        
        # 处理日期字段
        if 'due_date' in data and data['due_date']:
            try:
                old_due_date = task.due_date
                new_due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
                if old_due_date != new_due_date:
                    changes.append(('due_date', old_due_date, new_due_date))
                    task.due_date = new_due_date
            except ValueError:
                return api_error("Invalid due_date format. Use ISO format.", 400)
        
        # 处理状态变更
        if 'status' in data:
            try:
                old_status = task.status
                new_status = TaskStatus(data['status'])
                if old_status != new_status:
                    changes.append(('status', old_status.value, new_status.value))
                    task.status = new_status
                    
                    # 如果状态变为完成，设置完成时间
                    if new_status == TaskStatus.DONE and old_status != TaskStatus.DONE:
                        task.completed_at = datetime.utcnow()
                        task.completion_rate = 100
            except ValueError:
                return api_error(f"Invalid status: {data['status']}", 400)
        
        # 处理优先级变更
        if 'priority' in data:
            try:
                old_priority = task.priority
                new_priority = TaskPriority(data['priority'])
                if old_priority != new_priority:
                    changes.append(('priority', old_priority.value, new_priority.value))
                    task.priority = new_priority
            except ValueError:
                return api_error(f"Invalid priority: {data['priority']}", 400)
        
        # 处理其他字段
        simple_fields = ['title', 'content', 'completion_rate', 'tags']
        for field in simple_fields:
            if field in data:
                old_value = getattr(task, field)
                new_value = data[field]
                if old_value != new_value:
                    changes.append((field, old_value, new_value))
                    setattr(task, field, new_value)
        
        db.session.commit()

        # 记录变更历史
        status_changed = False
        for field_name, old_value, new_value in changes:
            TaskHistory.log_action(
                task_id=task.id,
                action=ActionType.UPDATED,
                changed_by='api',
                field_name=field_name,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(new_value) if new_value is not None else None,
                comment=f'Field {field_name} updated via API'
            )
            if field_name == 'status':
                status_changed = True

        # 记录用户活跃度
        if current_user:
            try:
                if status_changed:
                    UserActivity.record_activity(current_user.id, 'task_status_changed')
                    # 如果任务状态变为完成，额外记录完成任务活跃度
                    if 'status' in data and data['status'] == 'done':
                        UserActivity.record_activity(current_user.id, 'task_completed')
                else:
                    UserActivity.record_activity(current_user.id, 'task_updated')
            except Exception as e:
                # 记录活跃度失败不应该影响任务更新
                print(f"Warning: Failed to record user activity: {str(e)}")

        return api_response(
            task.to_dict(include_project=True, include_stats=True),
            "Task updated successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        return api_error(f"Failed to update task: {str(e)}", 500)


@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """删除任务"""
    try:
        task = Task.query.get(task_id)
        if not task:
            return api_error("Task not found", 404, "TASK_NOT_FOUND")
        
        # 记录删除历史
        TaskHistory.log_action(
            task_id=task.id,
            action=ActionType.DELETED,
            changed_by='api',
            comment='Task deleted via API'
        )
        
        # 删除任务
        task.delete()
        
        return api_response(
            None,
            "Task deleted successfully",
            204
        )
        
    except Exception as e:
        db.session.rollback()
        return api_error(f"Failed to delete task: {str(e)}", 500)
