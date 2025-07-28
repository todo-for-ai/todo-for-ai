"""
上下文规则 API 蓝图

提供上下文规则的 CRUD 操作接口
"""

from flask import Blueprint, request
from models import db, ContextRule, RuleType, Project
from .base import api_response, api_error, paginate_query, validate_json_request, get_request_args

# 创建蓝图
context_rules_bp = Blueprint('context_rules', __name__)


@context_rules_bp.route('', methods=['GET'])
def list_context_rules():
    """获取上下文规则列表"""
    try:
        args = get_request_args()
        
        # 构建查询
        query = ContextRule.query
        
        # 项目筛选
        if args['project_id']:
            query = query.filter_by(project_id=args['project_id'])
        elif request.args.get('scope') == 'global':
            query = query.filter_by(project_id=None)
        
        # 规则类型筛选
        rule_type = request.args.get('rule_type')
        if rule_type:
            try:
                rule_type_enum = RuleType(rule_type)
                query = query.filter_by(rule_type=rule_type_enum)
            except ValueError:
                return api_error(f"Invalid rule_type: {rule_type}", 400)
        
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
def create_context_rule():
    """创建新的上下文规则"""
    try:
        # 验证请求数据
        data = validate_json_request(
            required_fields=['name', 'content'],
            optional_fields=[
                'project_id', 'description', 'rule_type', 'priority',
                'is_active', 'apply_to_tasks', 'apply_to_projects'
            ]
        )
        
        if isinstance(data, tuple):  # 错误响应
            return data
        
        # 验证项目是否存在（如果指定了项目ID）
        if data.get('project_id'):
            project = Project.query.get(data['project_id'])
            if not project:
                return api_error("Project not found", 404, "PROJECT_NOT_FOUND")
        
        # 处理规则类型
        rule_type = RuleType.INSTRUCTION
        if 'rule_type' in data:
            try:
                rule_type = RuleType(data['rule_type'])
            except ValueError:
                return api_error(f"Invalid rule_type: {data['rule_type']}", 400)
        
        # 创建上下文规则
        context_rule = ContextRule.create(
            project_id=data.get('project_id'),
            name=data['name'],
            description=data.get('description', ''),
            rule_type=rule_type,
            content=data['content'],
            priority=data.get('priority', 0),
            is_active=data.get('is_active', True),
            apply_to_tasks=data.get('apply_to_tasks', True),
            apply_to_projects=data.get('apply_to_projects', False),
            created_by='api'  # TODO: 从认证信息获取
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
def get_context_rule(rule_id):
    """获取单个上下文规则详情"""
    try:
        context_rule = ContextRule.query.get(rule_id)
        if not context_rule:
            return api_error("Context rule not found", 404, "CONTEXT_RULE_NOT_FOUND")
        
        return api_response(
            context_rule.to_dict(include_project=True),
            "Context rule retrieved successfully"
        )
        
    except Exception as e:
        return api_error(f"Failed to retrieve context rule: {str(e)}", 500)


@context_rules_bp.route('/<int:rule_id>', methods=['PUT'])
def update_context_rule(rule_id):
    """更新上下文规则"""
    try:
        context_rule = ContextRule.query.get(rule_id)
        if not context_rule:
            return api_error("Context rule not found", 404, "CONTEXT_RULE_NOT_FOUND")
        
        # 验证请求数据
        data = validate_json_request(
            optional_fields=[
                'name', 'description', 'rule_type', 'content', 'priority',
                'is_active', 'apply_to_tasks', 'apply_to_projects'
            ]
        )
        
        if isinstance(data, tuple):  # 错误响应
            return data
        
        # 处理规则类型
        if 'rule_type' in data:
            try:
                context_rule.rule_type = RuleType(data['rule_type'])
            except ValueError:
                return api_error(f"Invalid rule_type: {data['rule_type']}", 400)
        
        # 更新其他字段
        simple_fields = ['name', 'description', 'content', 'priority', 'is_active', 'apply_to_tasks', 'apply_to_projects']
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
def delete_context_rule(rule_id):
    """删除上下文规则"""
    try:
        context_rule = ContextRule.query.get(rule_id)
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
def build_context():
    """构建上下文字符串"""
    try:
        # 验证请求数据
        data = validate_json_request(
            optional_fields=['project_id', 'for_tasks', 'for_projects']
        )
        
        if isinstance(data, tuple):  # 错误响应
            return data
        
        project_id = data.get('project_id')
        for_tasks = data.get('for_tasks', True)
        for_projects = data.get('for_projects', False)
        
        # 构建上下文字符串
        context_string = ContextRule.build_context_string(
            project_id=project_id,
            for_tasks=for_tasks,
            for_projects=for_projects
        )
        
        # 获取应用的规则列表
        applicable_rules = ContextRule.get_applicable_rules(
            project_id=project_id,
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
