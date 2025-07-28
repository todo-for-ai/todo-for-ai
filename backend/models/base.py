"""
数据库基础配置和通用模型
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, Integer, DateTime, String

# 创建数据库实例
db = SQLAlchemy()


class BaseModel(db.Model):
    """基础模型类，包含通用字段"""
    
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment='主键ID')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment='创建时间')
    updated_at = Column(
        DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow, 
        nullable=False, 
        comment='更新时间'
    )
    created_by = Column(String(100), comment='创建者')
    
    def to_dict(self, exclude=None):
        """转换为字典格式"""
        exclude = exclude or []
        result = {}
        
        for column in self.__table__.columns:
            if column.name not in exclude:
                value = getattr(self, column.name)
                if isinstance(value, datetime):
                    value = value.isoformat()
                result[column.name] = value
                
        return result
    
    def update_from_dict(self, data, exclude=None):
        """从字典更新模型属性"""
        exclude = exclude or ['id', 'created_at', 'updated_at']
        
        for key, value in data.items():
            if key not in exclude and hasattr(self, key):
                setattr(self, key, value)
    
    @classmethod
    def create(cls, **kwargs):
        """创建新实例"""
        instance = cls(**kwargs)
        db.session.add(instance)
        return instance
    
    def save(self):
        """保存到数据库"""
        db.session.add(self)
        db.session.commit()
        return self
    
    def delete(self):
        """从数据库删除"""
        db.session.delete(self)
        db.session.commit()
    
    def __repr__(self):
        return f'<{self.__class__.__name__} {self.id}>'
