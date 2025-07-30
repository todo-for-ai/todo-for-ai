"""
任务历史模型
"""

import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, Integer, BigInteger, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import db


class ActionType(enum.Enum):
    """操作类型枚举"""
    CREATED = 'created'
    UPDATED = 'updated'
    STATUS_CHANGED = 'status_changed'
    ASSIGNED = 'assigned'
    COMPLETED = 'completed'
    DELETED = 'deleted'


class TaskHistory(db.Model):
    """任务历史模型"""
    
    __tablename__ = 'task_history'
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment='主键ID')
    task_id = Column(BigInteger, ForeignKey('tasks.id'), nullable=False, comment='任务ID')
    action = Column(Enum(ActionType), nullable=False, comment='操作类型')
    field_name = Column(String(100), comment='变更字段名')
    old_value = Column(Text, comment='旧值')
    new_value = Column(Text, comment='新值')
    changed_by = Column(String(100), comment='操作者')
    changed_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment='操作时间')
    comment = Column(Text, comment='变更说明')
    
    # 关系
    task = relationship('Task', back_populates='history')
    
    def __repr__(self):
        return f'<TaskHistory {self.id}: {self.action.value} on Task {self.task_id}>'
    
    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'action': self.action.value if self.action else None,
            'field_name': self.field_name,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'changed_by': self.changed_by,
            'changed_at': self.changed_at.isoformat() if self.changed_at else None,
            'comment': self.comment,
        }
    
    @classmethod
    def log_action(cls, task_id, action, changed_by=None, field_name=None, 
                   old_value=None, new_value=None, comment=None):
        """记录操作历史"""
        history = cls(
            task_id=task_id,
            action=action,
            field_name=field_name,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None,
            changed_by=changed_by,
            comment=comment
        )
        db.session.add(history)
        db.session.commit()
        return history
    
    @classmethod
    def get_task_history(cls, task_id, limit=None):
        """获取任务历史"""
        query = cls.query.filter_by(task_id=task_id).order_by(cls.changed_at.desc())
        if limit:
            query = query.limit(limit)
        return query.all()
    
    @classmethod
    def get_recent_activities(cls, limit=50):
        """获取最近活动"""
        return cls.query.order_by(cls.changed_at.desc()).limit(limit).all()
