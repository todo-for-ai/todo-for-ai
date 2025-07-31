"""
上下文规则模型
"""

from sqlalchemy import Column, String, Text, Integer, ForeignKey, Boolean, or_
from sqlalchemy.orm import relationship
from .base import BaseModel
from . import db


class ContextRule(BaseModel):
    """上下文规则模型"""

    __tablename__ = 'context_rules'

    # 基本信息
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=True, comment='项目ID (NULL表示全局规则)')
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, comment='用户ID (规则所有者)')
    name = Column(String(255), nullable=False, comment='规则名称')
    description = Column(Text, comment='规则描述')
    content = Column(Text, nullable=False, comment='规则内容')

    # 配置选项
    priority = Column(Integer, default=0, comment='优先级 (数字越大优先级越高)')
    is_active = Column(Boolean, default=True, comment='是否启用')
    apply_to_tasks = Column(Boolean, default=True, comment='是否应用到任务查询')
    apply_to_projects = Column(Boolean, default=False, comment='是否应用到项目查询')

    # 公开/私有设置
    is_public = Column(Boolean, default=False, comment='是否公开 (公开的规则会显示在规则广场)')
    usage_count = Column(Integer, default=0, comment='被使用次数 (被复制的次数)')

    # 关系
    project = relationship('Project', back_populates='context_rules')
    user = relationship('User', backref='context_rules')
    
    def __repr__(self):
        scope = 'Global' if self.project_id is None else f'Project {self.project_id}'
        return f'<ContextRule {self.id}: {self.name} ({scope})>'
    
    def to_dict(self, include_project=False, include_user=False):
        """转换为字典"""
        result = super().to_dict()
        result['is_global'] = self.project_id is None

        if include_project and self.project:
            result['project'] = {
                'id': self.project.id,
                'name': self.project.name,
                'color': self.project.color
            }

        if include_user and self.user:
            result['user'] = {
                'id': self.user.id,
                'username': self.user.username,
                'full_name': self.user.full_name,
                'avatar_url': self.user.avatar_url,
                'github_id': self.user.github_id,
                'provider': self.user.provider
            }

        return result
    
    @classmethod
    def get_global_rules(cls, user_id=None, active_only=True):
        """获取全局规则"""
        query = cls.query.filter_by(project_id=None)

        # 如果指定了用户ID，只获取该用户的规则
        if user_id is not None:
            query = query.filter_by(user_id=user_id)

        if active_only:
            query = query.filter_by(is_active=True)

        return query.order_by(cls.priority.desc(), cls.created_at.asc()).all()
    
    @classmethod
    def get_project_rules(cls, project_id, user_id=None, active_only=True):
        """获取项目规则"""
        query = cls.query.filter_by(project_id=project_id)

        # 如果指定了用户ID，只获取该用户的规则
        if user_id is not None:
            query = query.filter_by(user_id=user_id)

        if active_only:
            query = query.filter_by(is_active=True)

        return query.order_by(cls.priority.desc(), cls.created_at.asc()).all()
    
    @classmethod
    def get_applicable_rules(cls, project_id=None, user_id=None, for_tasks=True, for_projects=False):
        """获取适用的规则（全局 + 项目级别）"""
        rules = []

        # 获取全局规则
        global_query = cls.query.filter_by(project_id=None, is_active=True)
        if user_id is not None:
            global_query = global_query.filter_by(user_id=user_id)
        if for_tasks:
            global_query = global_query.filter_by(apply_to_tasks=True)
        if for_projects:
            global_query = global_query.filter_by(apply_to_projects=True)

        rules.extend(global_query.all())

        # 获取项目规则
        if project_id:
            project_query = cls.query.filter_by(project_id=project_id, is_active=True)
            if user_id is not None:
                project_query = project_query.filter_by(user_id=user_id)
            if for_tasks:
                project_query = project_query.filter_by(apply_to_tasks=True)
            if for_projects:
                project_query = project_query.filter_by(apply_to_projects=True)

            rules.extend(project_query.all())

        # 按优先级排序
        return sorted(rules, key=lambda r: (r.priority, r.created_at), reverse=True)
    
    @classmethod
    def build_context_string(cls, project_id=None, user_id=None, for_tasks=True, for_projects=False):
        """构建上下文字符串"""
        rules = cls.get_applicable_rules(project_id, user_id, for_tasks, for_projects)

        if not rules:
            return ""

        context_parts = []

        # 直接按优先级顺序构建上下文字符串
        for rule in rules:
            context_parts.append(f"### {rule.name}")
            context_parts.append(rule.content)
            context_parts.append("")

        return "\n".join(context_parts).strip()
    
    def activate(self):
        """激活规则"""
        self.is_active = True
        self.save()
    
    def deactivate(self):
        """停用规则"""
        self.is_active = False
        self.save()
    
    @property
    def is_global(self):
        """检查是否为全局规则"""
        return self.project_id is None

    def increment_usage_count(self):
        """增加使用次数"""
        self.usage_count += 1
        self.save()

    @classmethod
    def get_public_rules(cls, search=None, sort_by='usage_count', sort_order='desc', page=1, per_page=20):
        """获取公开的规则（规则广场）"""
        query = cls.query.filter_by(is_public=True, is_active=True)

        # 搜索功能
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    cls.name.ilike(search_term),
                    cls.description.ilike(search_term),
                    cls.content.ilike(search_term)
                )
            )

        # 排序
        if sort_by == 'usage_count':
            if sort_order == 'desc':
                query = query.order_by(cls.usage_count.desc())
            else:
                query = query.order_by(cls.usage_count.asc())
        elif sort_by == 'created_at':
            if sort_order == 'desc':
                query = query.order_by(cls.created_at.desc())
            else:
                query = query.order_by(cls.created_at.asc())
        elif sort_by == 'updated_at':
            if sort_order == 'desc':
                query = query.order_by(cls.updated_at.desc())
            else:
                query = query.order_by(cls.updated_at.asc())

        # 分页
        return query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

    def copy_to_user(self, target_user_id, new_name=None, target_project_id=None):
        """复制规则给指定用户"""
        from models import db

        # 增加原规则的使用次数
        self.increment_usage_count()

        # 创建新规则
        new_rule = ContextRule(
            user_id=target_user_id,
            project_id=target_project_id,
            name=new_name or f"{self.name} - 副本",
            description=self.description,
            content=self.content,
            priority=self.priority,
            is_active=True,
            apply_to_tasks=self.apply_to_tasks,
            apply_to_projects=self.apply_to_projects,
            is_public=False,  # 复制的规则默认为私有
            usage_count=0,
            created_by='copied'
        )

        db.session.add(new_rule)
        db.session.commit()

        return new_rule
    
    @property
    def scope_name(self):
        """获取规则作用域名称"""
        if self.is_global:
            return "全局"
        elif self.project:
            return f"项目: {self.project.name}"
        else:
            return f"项目 ID: {self.project_id}"
