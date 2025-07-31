"""
上下文规则 API 蓝图

提供上下文规则的 CRUD 操作接口
"""

from flask import Blueprint, request
from models import db, ContextRule, Project
from .base import api_response, api_error, paginate_query, validate_json_request, get_request_args
from app.github_config import require_auth, get_current_user

# 创建蓝图
context_rules_bp = Blueprint('context_rules', __name__)


@context_rules_bp.route('', methods=['GET'])
@require_auth
def list_context_rules():
    """获取上下文规则列表"""
    try:
        current_user = get_current_user()
        args = get_request_args()

        # 构建查询 - 只返回当前用户的规则
        query = ContextRule.query.filter_by(user_id=current_user.id)

        # 项目筛选
        if args['project_id']:
            project_id = args['project_id']
            # 验证用户是否有权限访问该项目
            project = Project.query.get(project_id)
            if project and not current_user.can_access_project(project):
                return api_error("Access denied to project", 403, "PROJECT_ACCESS_DENIED")
            query = query.filter_by(project_id=project_id)
        elif request.args.get('scope') == 'global':
            query = query.filter_by(project_id=None)
        

        
        # 激活状态筛选
        is_active = request.args.get('is_active')
        if is_active is not None:
            query = query.filter_by(is_active=is_active.lower() == 'true')
        
        # 应用范围筛选
        apply_to_tasks = request.args.get('apply_to_tasks')
        if apply_to_tasks is not None:
            query = query.filter_by(apply_to_tasks=apply_to_tasks.lower() == 'true')
        
        apply_to_projects = request.args.get('apply_to_projects')
        if apply_to_projects is not None:
            query = query.filter_by(apply_to_projects=apply_to_projects.lower() == 'true')
        
        # 搜索
        if args['search']:
            search_term = f"%{args['search']}%"
            query = query.filter(
                ContextRule.name.like(search_term) |
                ContextRule.description.like(search_term) |
                ContextRule.content.like(search_term)
            )
        
        # 排序
        if args['sort_by'] == 'name':
            order_column = ContextRule.name
        elif args['sort_by'] == 'priority':
            order_column = ContextRule.priority
        elif args['sort_by'] == 'rule_type':
            order_column = ContextRule.rule_type
        elif args['sort_by'] == 'updated_at':
            order_column = ContextRule.updated_at
        else:
            order_column = ContextRule.created_at
        
        if args['sort_order'] == 'desc':
            query = query.order_by(order_column.desc())
        else:
            query = query.order_by(order_column.asc())
        
        # 分页
        result = paginate_query(query, args['page'], args['per_page'])
        
        # 包含项目信息
        for item in result['items']:
            if item.get('project_id'):
                project = Project.query.get(item['project_id'])
                if project:
                    item['project'] = {
                        'id': project.id,
                        'name': project.name,
                        'color': project.color
                    }
        
        return api_response(result, "Context rules retrieved successfully")
        
    except Exception as e:
        return api_error(f"Failed to retrieve context rules: {str(e)}", 500)


@context_rules_bp.route('', methods=['POST'])
@require_auth
def create_context_rule():
    """创建新的上下文规则"""
    try:
        current_user = get_current_user()

        # 验证请求数据
        data = validate_json_request(
            required_fields=['name', 'content'],
            optional_fields=[
                'project_id', 'description', 'priority',
                'is_active', 'apply_to_tasks', 'apply_to_projects',
                'is_public'
            ]
        )

        if isinstance(data, tuple):  # 错误响应
            return data

        # 验证项目是否存在（如果指定了项目ID）
        if data.get('project_id'):
            project = Project.query.get(data['project_id'])
            if not project:
                return api_error("Project not found", 404, "PROJECT_NOT_FOUND")

            # 检查用户是否有权限访问该项目
            if not current_user.can_access_project(project):
                return api_error("Access denied to project", 403, "PROJECT_ACCESS_DENIED")

        # 创建上下文规则
        context_rule = ContextRule.create(
            user_id=current_user.id,
            project_id=data.get('project_id'),
            name=data['name'],
            description=data.get('description', ''),
            content=data['content'],
            priority=data.get('priority', 0),
            is_active=data.get('is_active', True),
            apply_to_tasks=data.get('apply_to_tasks', True),
            apply_to_projects=data.get('apply_to_projects', False),
            is_public=data.get('is_public', False),
            usage_count=0,
            created_by='api'
        )

        db.session.commit()

        return api_response(
            context_rule.to_dict(include_project=True),
            "Context rule created successfully",
            201
        )

    except Exception as e:
        db.session.rollback()
        return api_error(f"Failed to create context rule: {str(e)}", 500)


@context_rules_bp.route('/<int:rule_id>', methods=['GET'])
@require_auth
def get_context_rule(rule_id):
    """获取单个上下文规则详情"""
    try:
        current_user = get_current_user()
        context_rule = ContextRule.query.filter_by(id=rule_id, user_id=current_user.id).first()
        if not context_rule:
            return api_error("Context rule not found", 404, "CONTEXT_RULE_NOT_FOUND")

        return api_response(
            context_rule.to_dict(include_project=True),
            "Context rule retrieved successfully"
        )

    except Exception as e:
        return api_error(f"Failed to retrieve context rule: {str(e)}", 500)


@context_rules_bp.route('/<int:rule_id>', methods=['PUT'])
@require_auth
def update_context_rule(rule_id):
    """更新上下文规则"""
    try:
        current_user = get_current_user()
        context_rule = ContextRule.query.filter_by(id=rule_id, user_id=current_user.id).first()
        if not context_rule:
            return api_error("Context rule not found", 404, "CONTEXT_RULE_NOT_FOUND")

        # 验证请求数据
        data = validate_json_request(
            optional_fields=[
                'name', 'description', 'content', 'priority',
                'is_active', 'apply_to_tasks', 'apply_to_projects', 'is_public'
            ]
        )

        if isinstance(data, tuple):  # 错误响应
            return data

        # 更新其他字段
        simple_fields = ['name', 'description', 'content', 'priority', 'is_active', 'apply_to_tasks', 'apply_to_projects', 'is_public']
        for field in simple_fields:
            if field in data:
                setattr(context_rule, field, data[field])

        db.session.commit()

        return api_response(
            context_rule.to_dict(include_project=True),
            "Context rule updated successfully"
        )

    except Exception as e:
        db.session.rollback()
        return api_error(f"Failed to update context rule: {str(e)}", 500)


@context_rules_bp.route('/<int:rule_id>', methods=['DELETE'])
@require_auth
def delete_context_rule(rule_id):
    """删除上下文规则"""
    try:
        current_user = get_current_user()
        context_rule = ContextRule.query.filter_by(id=rule_id, user_id=current_user.id).first()
        if not context_rule:
            return api_error("Context rule not found", 404, "CONTEXT_RULE_NOT_FOUND")

        # 删除规则
        context_rule.delete()

        return api_response(
            None,
            "Context rule deleted successfully",
            204
        )

    except Exception as e:
        db.session.rollback()
        return api_error(f"Failed to delete context rule: {str(e)}", 500)


@context_rules_bp.route('/<int:rule_id>/activate', methods=['POST'])
def activate_context_rule(rule_id):
    """激活上下文规则"""
    try:
        context_rule = ContextRule.query.get(rule_id)
        if not context_rule:
            return api_error("Context rule not found", 404, "CONTEXT_RULE_NOT_FOUND")
        
        context_rule.activate()
        
        return api_response(
            context_rule.to_dict(),
            "Context rule activated successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        return api_error(f"Failed to activate context rule: {str(e)}", 500)


@context_rules_bp.route('/<int:rule_id>/deactivate', methods=['POST'])
def deactivate_context_rule(rule_id):
    """停用上下文规则"""
    try:
        context_rule = ContextRule.query.get(rule_id)
        if not context_rule:
            return api_error("Context rule not found", 404, "CONTEXT_RULE_NOT_FOUND")
        
        context_rule.deactivate()
        
        return api_response(
            context_rule.to_dict(),
            "Context rule deactivated successfully"
        )
        
    except Exception as e:
        db.session.rollback()
        return api_error(f"Failed to deactivate context rule: {str(e)}", 500)


@context_rules_bp.route('/build-context', methods=['POST'])
@require_auth
def build_context():
    """构建上下文字符串"""
    try:
        current_user = get_current_user()

        # 验证请求数据
        data = validate_json_request(
            optional_fields=['project_id', 'for_tasks', 'for_projects']
        )

        if isinstance(data, tuple):  # 错误响应
            return data

        project_id = data.get('project_id')
        for_tasks = data.get('for_tasks', True)
        for_projects = data.get('for_projects', False)

        # 构建上下文字符串（只包含当前用户的规则）
        context_string = ContextRule.build_context_string(
            project_id=project_id,
            user_id=current_user.id,
            for_tasks=for_tasks,
            for_projects=for_projects
        )

        # 获取应用的规则列表
        applicable_rules = ContextRule.get_applicable_rules(
            project_id=project_id,
            user_id=current_user.id,
            for_tasks=for_tasks,
            for_projects=for_projects
        )
        
        return api_response(
            {
                'context_string': context_string,
                'rules_applied': len(applicable_rules),
                'rules': [rule.to_dict() for rule in applicable_rules]
            },
            "Context built successfully"
        )
        
    except Exception as e:
        return api_error(f"Failed to build context: {str(e)}", 500)


# 规则广场相关API
@context_rules_bp.route('/marketplace', methods=['GET'])
@require_auth
def get_public_rules():
    """获取规则广场的公开规则"""
    try:
        args = get_request_args()

        # 获取公开规则
        pagination = ContextRule.get_public_rules(
            search=args.get('search'),
            sort_by=args.get('sort_by', 'usage_count'),
            sort_order=args.get('sort_order', 'desc'),
            page=args.get('page', 1),
            per_page=min(args.get('per_page', 20), 100)
        )

        # 转换为字典，包含用户信息
        rules = [rule.to_dict(include_project=True, include_user=True) for rule in pagination.items]

        return api_response({
            'rules': rules,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next
            }
        })

    except Exception as e:
        return api_error(f"Failed to retrieve public rules: {str(e)}", 500)


@context_rules_bp.route('/<int:rule_id>/copy', methods=['POST'])
@require_auth
def copy_rule_from_marketplace(rule_id):
    """从规则广场复制规则"""
    try:
        current_user = get_current_user()

        # 获取要复制的规则（必须是公开的）
        source_rule = ContextRule.query.filter_by(id=rule_id, is_public=True, is_active=True).first()
        if not source_rule:
            return api_error("Public rule not found", 404, "RULE_NOT_FOUND")

        # 验证请求数据
        data = validate_json_request(
            optional_fields=['name', 'target_project_id', 'copy_as_global']
        )

        if isinstance(data, tuple):  # 错误响应
            return data

        # 确定复制的名称
        new_name = data.get('name', f"{source_rule.name} - 副本")

        # 确定目标项目ID
        target_project_id = None
        copy_as_global = data.get('copy_as_global', True)

        if not copy_as_global and data.get('target_project_id'):
            target_project_id = data['target_project_id']
            # 验证用户是否有权限访问目标项目
            project = Project.query.get(target_project_id)
            if not project or not current_user.can_access_project(project):
                return api_error("Access denied to target project", 403, "PROJECT_ACCESS_DENIED")

        # 复制规则
        new_rule = source_rule.copy_to_user(
            target_user_id=current_user.id,
            new_name=new_name,
            target_project_id=target_project_id
        )

        return api_response(
            new_rule.to_dict(include_project=True),
            "Rule copied successfully",
            201
        )

    except Exception as e:
        db.session.rollback()
        return api_error(f"Failed to copy rule: {str(e)}", 500)
