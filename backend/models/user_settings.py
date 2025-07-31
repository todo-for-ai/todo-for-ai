#!/usr/bin/env python3
"""
用户设置模型

用于存储用户的个人设置和偏好
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from models.base import BaseModel


class UserSettings(BaseModel):
    """用户设置模型"""
    
    __tablename__ = 'user_settings'
    
    # 关联用户
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True, comment='用户ID')
    
    # 语言设置
    language = Column(String(10), default='en', comment='界面语言 (zh-CN, en)')
    
    # 其他设置（预留扩展）
    settings_data = Column(JSON, comment='其他设置数据 (JSON格式)')
    
    # 关系
    user = relationship('User', back_populates='settings')
    
    def __repr__(self):
        return f'<UserSettings {self.id}: user_id={self.user_id}, language={self.language}>'
    
    def to_dict(self):
        """转换为字典"""
        result = super().to_dict()
        return result
    
    @classmethod
    def get_or_create_for_user(cls, user_id, default_language='en'):
        """获取或创建用户设置"""
        settings = cls.query.filter_by(user_id=user_id).first()
        if not settings:
            settings = cls(
                user_id=user_id,
                language=default_language,
                settings_data={}
            )
            settings.save()
        return settings
    
    def update_language(self, language):
        """更新语言设置"""
        if language in ['zh-CN', 'en']:
            self.language = language
            self.save()
            return True
        return False
