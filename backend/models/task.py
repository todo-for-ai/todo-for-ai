"""
任务模型
"""

import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, Integer, BigInteger, ForeignKey, DateTime, DECIMAL, JSON, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel


class TaskStatus(enum.Enum):
    """任务状态枚举"""
    TODO = 'todo'
    IN_PROGRESS = 'in_progress'
    REVIEW = 'review'
    DONE = 'done'
    CANCELLED = 'cancelled'


class TaskPriority(enum.Enum):
    """任务优先级枚举"""
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    URGENT = 'urgent'


class Task(BaseModel):
    """任务模型"""

    __tablename__ = 'tasks'

    # 重写id字段为BigInteger以支持大量任务
    id = Column(BigInteger, primary_key=True, autoincrement=True, comment='主键ID')

    # 基本信息
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False, comment='所属项目ID')
    assignee_id = Column(Integer, ForeignKey('users.id'), nullable=True, comment='任务分配者ID')
    creator_id = Column(Integer, ForeignKey('users.id'), nullable=True, comment='任务创建者ID')
    title = Column(String(500), nullable=False, comment='任务标题')
    content = Column(Text, comment='任务详细内容 (Markdown)')
    
    # 状态和优先级
    status = Column(
        Enum(TaskStatus), 
        default=TaskStatus.TODO, 
        nullable=False,
        comment='任务状态'
    )
    priority = Column(
        Enum(TaskPriority), 
        default=TaskPriority.MEDIUM, 
        nullable=False,
        comment='任务优先级'
    )
    
    # 时间信息
    due_date = Column(DateTime, comment='截止时间')
    completion_rate = Column(Integer, default=0, comment='完成百分比 (0-100)')
    completed_at = Column(DateTime, comment='完成时间')
    
    # 扩展信息
    tags = Column(JSON, comment='任务标签 (JSON数组)')
    related_files = Column(JSON, comment='任务相关的文件列表 (JSON数组)')
    is_ai_task = Column(Boolean, default=True, comment='是否是分配给AI的任务')
    creator_type = Column(String(20), default='human', comment='创建者类型: human, ai')
    creator_identifier = Column(String(100), comment='创建者标识符 (AI的标识或用户ID)')
    feedback_content = Column(Text, comment='任务反馈内容')
    feedback_at = Column(DateTime, comment='反馈时间')
    
    # 关系
    project = relationship('Project', back_populates='tasks')
    assignee = relationship('User', back_populates='tasks', foreign_keys=[assignee_id])
    creator = relationship('User', back_populates='created_tasks', foreign_keys=[creator_id])
    history = relationship(
        'TaskHistory',
        back_populates='task',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )
    attachments = relationship(
        'Attachment',
        back_populates='task',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )
    
    def __repr__(self):
        return f'<Task {self.id}: {self.title[:50]}>'
    
    def to_dict(self, include_project=False, include_stats=False):
        """转换为字典"""
        result = super().to_dict()
        result['status'] = self.status.value if self.status else None
        result['priority'] = self.priority.value if self.priority else None
        result['tags'] = self.tags or []
        
        # 格式化时间字段
        if self.due_date:
            result['due_date'] = self.due_date.isoformat()
        if self.completed_at:
            result['completed_at'] = self.completed_at.isoformat()
        
        # 包含项目信息
        if include_project and self.project:
            result['project'] = {
                'id': self.project.id,
                'name': self.project.name,
                'color': self.project.color
            }
        
        # 包含统计信息
        if include_stats:
            result['stats'] = {
                'attachments_count': self.attachments.count(),
                'history_count': self.history.count(),
                'is_overdue': self.is_overdue,
                'days_until_due': self.days_until_due,
            }
        
        return result
    
    @property
    def is_completed(self):
        """检查任务是否已完成"""
        return self.status == TaskStatus.DONE
    
    @property
    def is_overdue(self):
        """检查任务是否过期"""
        if not self.due_date or self.is_completed:
            return False
        return datetime.utcnow() > self.due_date
    
    @property
    def days_until_due(self):
        """距离截止日期的天数"""
        if not self.due_date:
            return None
        delta = self.due_date - datetime.utcnow()
        return delta.days
    
    @classmethod
    def get_by_project(cls, project_id, status=None):
        """根据项目获取任务"""
        query = cls.query.filter_by(project_id=project_id)
        if status:
            query = query.filter_by(status=status)
        return query.all()
    

    
    @classmethod
    def search_tasks(cls, keyword, project_id=None, status=None, priority=None):
        """搜索任务"""
        query = cls.query
        
        if project_id:
            query = query.filter_by(project_id=project_id)
        if status:
            query = query.filter_by(status=status)
        if priority:
            query = query.filter_by(priority=priority)
        
        if keyword:
            query = query.filter(
                cls.title.contains(keyword) |
                cls.content.contains(keyword)
            )
        
        return query.all()
    
    def complete(self):
        """完成任务"""
        self.status = TaskStatus.DONE
        self.completion_rate = 100
        self.completed_at = datetime.utcnow()
        self.save()
    
    def start(self):
        """开始任务"""
        self.status = TaskStatus.IN_PROGRESS
        self.save()
    
    def cancel(self):
        """取消任务"""
        self.status = TaskStatus.CANCELLED
        self.save()
    
    def add_tag(self, tag):
        """添加标签"""
        if not self.tags:
            self.tags = []
        if tag not in self.tags:
            self.tags.append(tag)
            self.save()
    
    def remove_tag(self, tag):
        """移除标签"""
        if self.tags and tag in self.tags:
            self.tags.remove(tag)
            self.save()
    
    def update_progress(self, completion_rate):
        """更新进度"""
        self.completion_rate = max(0, min(100, completion_rate))
        if self.completion_rate == 100 and self.status != TaskStatus.DONE:
            self.complete()
        self.save()
