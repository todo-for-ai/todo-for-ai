"""
API Token模型
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
import base64
import os
from sqlalchemy import Column, String, DateTime, Boolean, Text, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel


class ApiToken(BaseModel):
    """API Token模型"""
    
    __tablename__ = 'api_tokens'

    # 用户关联
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True, comment='Token所有者ID')

    # Token信息
    name = Column(String(255), nullable=False, comment='Token名称')
    token_hash = Column(String(64), nullable=False, unique=True, comment='Token哈希值')
    token_encrypted = Column(Text, nullable=False, comment='加密的Token值')
    prefix = Column(String(10), nullable=False, comment='Token前缀（用于识别）')
    description = Column(Text, comment='Token描述')
    
    # 权限和状态
    is_active = Column(Boolean, default=True, nullable=False, comment='是否激活')
    expires_at = Column(DateTime, comment='过期时间')
    last_used_at = Column(DateTime, comment='最后使用时间')
    
    # 使用统计
    usage_count = Column(Integer, default=0, comment='使用次数')

    # 关系
    user = relationship('User', back_populates='api_tokens')

    def __repr__(self):
        return f'<ApiToken {self.id}: {self.name}>'

    @staticmethod
    def _get_encryption_key():
        """获取加密密钥"""
        # 从环境变量获取密钥，如果没有则生成一个
        key = os.environ.get('TOKEN_ENCRYPTION_KEY')
        if not key:
            # 生成一个新密钥（在生产环境中应该设置环境变量）
            key = Fernet.generate_key().decode()
            os.environ['TOKEN_ENCRYPTION_KEY'] = key

        # 确保密钥是bytes格式
        if isinstance(key, str):
            key = key.encode()

        return key

    @classmethod
    def _encrypt_token(cls, token):
        """加密token"""
        key = cls._get_encryption_key()
        f = Fernet(key)
        encrypted_token = f.encrypt(token.encode())
        return base64.b64encode(encrypted_token).decode()

    @classmethod
    def _decrypt_token(cls, encrypted_token):
        """解密token"""
        try:
            key = cls._get_encryption_key()
            f = Fernet(key)
            encrypted_bytes = base64.b64decode(encrypted_token.encode())
            decrypted_token = f.decrypt(encrypted_bytes)
            return decrypted_token.decode()
        except Exception:
            return None
    
    @classmethod
    def generate_token(cls, name, description=None, expires_days=None):
        """生成新的API Token"""
        # 生成随机token
        token = secrets.token_urlsafe(32)
        prefix = token[:8]

        # 计算哈希值
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        # 加密token
        token_encrypted = cls._encrypt_token(token)

        # 计算过期时间
        expires_at = None
        if expires_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_days)

        # 创建token记录
        api_token = cls(
            name=name,
            token_hash=token_hash,
            token_encrypted=token_encrypted,
            prefix=prefix,
            description=description,
            expires_at=expires_at
        )

        return api_token, token
    
    @classmethod
    def verify_token(cls, token):
        """验证Token"""
        if not token:
            return None
        
        # 计算token哈希值
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # 查找token
        api_token = cls.query.filter_by(
            token_hash=token_hash,
            is_active=True
        ).first()
        
        if not api_token:
            return None
        
        # 检查是否过期
        if api_token.expires_at and api_token.expires_at < datetime.utcnow():
            return None
        
        # 更新使用统计
        api_token.last_used_at = datetime.utcnow()
        api_token.usage_count += 1
        api_token.save()
        
        return api_token
    
    def to_dict(self, include_sensitive=False):
        """转换为字典"""
        result = super().to_dict()
        
        # 移除敏感信息
        if not include_sensitive:
            result.pop('token_hash', None)
        
        return result
    
    def is_expired(self):
        """检查是否过期"""
        if not self.expires_at:
            return False
        return self.expires_at < datetime.utcnow()

    def get_decrypted_token(self):
        """获取解密的token"""
        if not self.token_encrypted:
            return None
        return self._decrypt_token(self.token_encrypted)
    
    def deactivate(self):
        """停用Token"""
        self.is_active = False
        self.save()
    
    def renew(self, expires_days=None):
        """续期Token"""
        if expires_days:
            self.expires_at = datetime.utcnow() + timedelta(days=expires_days)
        else:
            self.expires_at = None
        self.save()
    
    @classmethod
    def cleanup_expired(cls):
        """清理过期的Token"""
        expired_tokens = cls.query.filter(
            cls.expires_at < datetime.utcnow(),
            cls.is_active == True
        ).all()
        
        for token in expired_tokens:
            token.deactivate()
        
        return len(expired_tokens)
