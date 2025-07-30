"""
项目模型
"""

import enum
from sqlalchemy import Column, String, Text, Enum, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel


class ProjectStatus(enum.Enum):
    """项目状态枚举"""
    ACTIVE = 'active'
    ARCHIVED = 'archived'
    DELETED = 'deleted'


class Project(BaseModel):
    """项目模型"""
    
    __tablename__ = 'projects'

    # 用户关联
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False, comment='项目所有者ID')

    # 基本信息
    name = Column(String(255), nullable=False, comment='项目名称')
    description = Column(Text, comment='项目描述')
    color = Column(String(7), default='#1890ff', comment='项目颜色 (HEX)')
    status = Column(
        Enum(ProjectStatus),
        default=ProjectStatus.ACTIVE,
        nullable=False,
        comment='项目状态'
    )

    # 扩展信息
    github_url = Column(String(500), comment='GitHub仓库链接')
    local_url = Column(String(500), comment='本地开发链接')
    production_url = Column(String(500), comment='生产环境链接')
    project_context = Column(Text, comment='项目级别的上下文信息')
    last_activity_at = Column(DateTime, comment='最后活动时间')
    
    # 关系
    owner = relationship('User', back_populates='projects')
    tasks = relationship(
        'Task',
        back_populates='project',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )
    context_rules = relationship(
        'ContextRule',
        back_populates='project',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )
    
    def __repr__(self):
        return f'<Project {self.id}: {self.name}>'
    
    def to_dict(self, include_stats=False):
        """转换为字典，可选包含统计信息"""
        result = super().to_dict()
        result['status'] = self.status.value if self.status else None
        
        if include_stats:
            # 添加任务统计
            from .task import TaskStatus
            result['stats'] = {
                'total_tasks': self.tasks.count(),
                'todo_tasks': self.tasks.filter_by(status=TaskStatus.TODO).count(),
                'in_progress_tasks': self.tasks.filter_by(status=TaskStatus.IN_PROGRESS).count(),
                'done_tasks': self.tasks.filter_by(status=TaskStatus.DONE).count(),
                'context_rules_count': self.context_rules.filter_by(is_active=True).count(),
            }
        
        return result
    
    @classmethod
    def get_active_projects(cls):
        """获取所有活跃项目"""
        return cls.query.filter_by(status=ProjectStatus.ACTIVE).all()
    
    @classmethod
    def search_projects(cls, keyword, status=None):
        """搜索项目"""
        query = cls.query
        
        if status:
            query = query.filter_by(status=status)
        
        if keyword:
            query = query.filter(
                cls.name.contains(keyword) | 
                cls.description.contains(keyword)
            )
        
        return query.all()
    
    def get_active_context_rules(self):
        """获取项目的活跃上下文规则"""
        return self.context_rules.filter_by(is_active=True).order_by('priority DESC').all()
    
    def archive(self):
        """归档项目"""
        self.status = ProjectStatus.ARCHIVED
        self.save()
    
    def restore(self):
        """恢复项目"""
        self.status = ProjectStatus.ACTIVE
        self.save()
    
    def soft_delete(self):
        """软删除项目"""
        self.status = ProjectStatus.DELETED
        self.save()

    @property
    def is_active(self):
        """检查项目是否活跃"""
        return self.status == ProjectStatus.ACTIVE
