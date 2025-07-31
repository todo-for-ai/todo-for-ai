"""
用户活跃度模型
"""

from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from datetime import datetime, date
from .base import BaseModel
from . import db


class UserActivity(BaseModel):
    """用户活跃度模型"""

    __tablename__ = 'user_activities'

    # 联合主键：用户ID + 日期
    user_id = Column(Integer, ForeignKey('users.id'), primary_key=True, comment='用户ID')
    activity_date = Column(Date, primary_key=True, comment='活跃日期 (YYYY-MM-DD)')
    
    # 活跃度统计
    task_created_count = Column(Integer, default=0, comment='当天创建任务数量')
    task_updated_count = Column(Integer, default=0, comment='当天更新任务数量')
    task_status_changed_count = Column(Integer, default=0, comment='当天修改任务状态数量')
    total_activity_count = Column(Integer, default=0, comment='当天总活跃次数')
    
    # 时间信息
    first_activity_at = Column(DateTime, comment='当天首次活跃时间')
    last_activity_at = Column(DateTime, comment='当天最后活跃时间')
    
    # 关系
    user = relationship('User', backref='activities')
    
    def __repr__(self):
        return f'<UserActivity {self.user_id}:{self.activity_date} ({self.total_activity_count})>'
    
    def to_dict(self):
        """转换为字典"""
        result = {
            'user_id': self.user_id,
            'activity_date': self.activity_date.isoformat() if self.activity_date else None,
            'task_created_count': self.task_created_count,
            'task_updated_count': self.task_updated_count,
            'task_status_changed_count': self.task_status_changed_count,
            'total_activity_count': self.total_activity_count,
            'first_activity_at': self.first_activity_at.isoformat() if self.first_activity_at else None,
            'last_activity_at': self.last_activity_at.isoformat() if self.last_activity_at else None,
        }
        return result
    
    @classmethod
    def record_activity(cls, user_id, activity_type='general'):
        """
        记录用户活跃度
        
        Args:
            user_id: 用户ID
            activity_type: 活跃类型 ('task_created', 'task_updated', 'task_status_changed', 'general')
        """
        today = date.today()
        now = datetime.utcnow()
        
        # 查找或创建今天的活跃记录
        activity = cls.query.filter_by(user_id=user_id, activity_date=today).first()
        
        if not activity:
            activity = cls(
                user_id=user_id,
                activity_date=today,
                first_activity_at=now,
                last_activity_at=now
            )
            db.session.add(activity)
        else:
            activity.last_activity_at = now
        
        # 更新对应的计数器
        if activity_type == 'task_created':
            activity.task_created_count += 1
        elif activity_type == 'task_updated':
            activity.task_updated_count += 1
        elif activity_type == 'task_status_changed':
            activity.task_status_changed_count += 1
        
        # 更新总活跃次数
        activity.total_activity_count = (
            activity.task_created_count + 
            activity.task_updated_count + 
            activity.task_status_changed_count
        )
        
        try:
            db.session.commit()
            return activity
        except Exception as e:
            db.session.rollback()
            raise e
    
    @classmethod
    def get_user_activity_heatmap(cls, user_id, days=365):
        """
        获取用户活跃度热力图数据
        
        Args:
            user_id: 用户ID
            days: 获取最近多少天的数据，默认365天
            
        Returns:
            list: 活跃度数据列表，每个元素包含日期和活跃次数
        """
        from datetime import timedelta
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days-1)
        
        activities = cls.query.filter(
            cls.user_id == user_id,
            cls.activity_date >= start_date,
            cls.activity_date <= end_date
        ).order_by(cls.activity_date.asc()).all()
        
        # 创建完整的日期范围数据
        result = []
        current_date = start_date
        activity_dict = {activity.activity_date: activity for activity in activities}
        
        while current_date <= end_date:
            activity = activity_dict.get(current_date)
            result.append({
                'date': current_date.isoformat(),
                'count': activity.total_activity_count if activity else 0,
                'level': cls._get_activity_level(activity.total_activity_count if activity else 0)
            })
            current_date += timedelta(days=1)
        
        return result
    
    @classmethod
    def _get_activity_level(cls, count):
        """
        根据活跃次数获取活跃等级（用于热力图颜色）
        
        Args:
            count: 活跃次数
            
        Returns:
            int: 活跃等级 (0-4)
        """
        if count == 0:
            return 0
        elif count <= 2:
            return 1
        elif count <= 5:
            return 2
        elif count <= 10:
            return 3
        else:
            return 4
    
    @classmethod
    def get_user_activity_stats(cls, user_id, days=30):
        """
        获取用户活跃度统计
        
        Args:
            user_id: 用户ID
            days: 统计最近多少天，默认30天
            
        Returns:
            dict: 统计数据
        """
        from datetime import timedelta
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days-1)
        
        # 查询统计数据
        stats = db.session.query(
            func.sum(cls.task_created_count).label('total_created'),
            func.sum(cls.task_updated_count).label('total_updated'),
            func.sum(cls.task_status_changed_count).label('total_status_changed'),
            func.sum(cls.total_activity_count).label('total_activities'),
            func.count(cls.activity_date).label('active_days')
        ).filter(
            cls.user_id == user_id,
            cls.activity_date >= start_date,
            cls.activity_date <= end_date
        ).first()
        
        return {
            'total_created': stats.total_created or 0,
            'total_updated': stats.total_updated or 0,
            'total_status_changed': stats.total_status_changed or 0,
            'total_activities': stats.total_activities or 0,
            'active_days': stats.active_days or 0,
            'period_days': days
        }
