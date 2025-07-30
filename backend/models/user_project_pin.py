"""
用户项目Pin配置模型
"""

from sqlalchemy import Column, Integer, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import BaseModel


class UserProjectPin(BaseModel):
    """用户项目Pin配置模型"""
    
    __tablename__ = 'user_project_pins'

    # 用户和项目关联
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, comment='用户ID')
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=False, comment='项目ID')
    
    # Pin配置
    pin_order = Column(Integer, nullable=False, default=0, comment='Pin顺序，数字越小越靠前')
    is_active = Column(Boolean, default=True, nullable=False, comment='是否激活')

    # 关系
    user = relationship('User', backref='project_pins')
    project = relationship('Project', backref='user_pins')
    
    # 唯一约束：每个用户对每个项目只能有一个Pin配置
    __table_args__ = (
        UniqueConstraint('user_id', 'project_id', name='uq_user_project_pin'),
    )
    
    def __repr__(self):
        return f'<UserProjectPin user_id={self.user_id} project_id={self.project_id} order={self.pin_order}>'
    
    def to_dict(self):
        """转换为字典"""
        result = super().to_dict()
        # 包含项目信息
        if self.project:
            result['project'] = {
                'id': self.project.id,
                'name': self.project.name,
                'color': self.project.color,
                'status': self.project.status.value if self.project.status else None
            }
        return result
    
    @classmethod
    def get_user_pins(cls, user_id, active_only=True):
        """获取用户的Pin配置"""
        query = cls.query.filter_by(user_id=user_id)
        if active_only:
            query = query.filter_by(is_active=True)
        return query.order_by(cls.pin_order.asc(), cls.created_at.asc()).all()
    
    @classmethod
    def get_user_pin_count(cls, user_id):
        """获取用户的Pin数量"""
        return cls.query.filter_by(user_id=user_id, is_active=True).count()
    
    @classmethod
    def is_project_pinned(cls, user_id, project_id):
        """检查项目是否被Pin"""
        return cls.query.filter_by(
            user_id=user_id, 
            project_id=project_id, 
            is_active=True
        ).first() is not None
    
    @classmethod
    def pin_project(cls, user_id, project_id, pin_order=None):
        """Pin项目"""
        # 检查是否已经Pin
        existing_pin = cls.query.filter_by(user_id=user_id, project_id=project_id).first()
        
        if existing_pin:
            # 如果已存在，激活并更新顺序
            existing_pin.is_active = True
            if pin_order is not None:
                existing_pin.pin_order = pin_order
            return existing_pin
        else:
            # 如果不存在，创建新的Pin
            if pin_order is None:
                # 自动分配顺序：当前最大顺序 + 1
                max_order = cls.query.filter_by(user_id=user_id, is_active=True).count()
                pin_order = max_order
            
            new_pin = cls(
                user_id=user_id,
                project_id=project_id,
                pin_order=pin_order,
                is_active=True
            )
            return new_pin
    
    @classmethod
    def unpin_project(cls, user_id, project_id):
        """取消Pin项目"""
        pin = cls.query.filter_by(user_id=user_id, project_id=project_id).first()
        if pin:
            pin.is_active = False
            return pin
        return None
    
    @classmethod
    def reorder_pins(cls, user_id, pin_orders):
        """重新排序Pin
        
        Args:
            user_id: 用户ID
            pin_orders: 列表，包含 {'project_id': int, 'pin_order': int} 的字典
        """
        for item in pin_orders:
            pin = cls.query.filter_by(
                user_id=user_id, 
                project_id=item['project_id'],
                is_active=True
            ).first()
            if pin:
                pin.pin_order = item['pin_order']
