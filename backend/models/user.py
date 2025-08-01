"""
用户模型
"""

import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, Enum, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from .base import BaseModel


class UserRole(enum.Enum):
    """用户角色枚举"""
    ADMIN = 'admin'
    USER = 'user'
    VIEWER = 'viewer'


class UserStatus(enum.Enum):
    """用户状态枚举"""
    ACTIVE = 'active'
    INACTIVE = 'inactive'
    SUSPENDED = 'suspended'


class User(BaseModel):
    """用户模型"""
    
    __tablename__ = 'users'
    
    # OAuth 相关字段
    github_id = Column(String(255), unique=True, nullable=True, comment='GitHub用户ID')
    google_id = Column(String(255), unique=True, nullable=True, comment='Google用户ID')
    email = Column(String(255), unique=True, nullable=False, comment='用户邮箱')
    email_verified = Column(Boolean, default=False, comment='邮箱是否已验证')

    # 兼容字段（保留以防需要）
    auth0_user_id = Column(String(255), unique=True, nullable=True, comment='Auth0用户ID（已弃用）')
    
    # 基本信息
    username = Column(String(100), comment='用户名')
    name = Column(String(200), comment='显示名称')
    nickname = Column(String(100), comment='昵称')
    full_name = Column(String(200), comment='全名')
    avatar_url = Column(String(500), comment='头像URL')
    bio = Column(Text, comment='个人简介')
    
    # 认证信息
    provider = Column(String(50), comment='认证提供商 (github, google-oauth2等)')
    provider_user_id = Column(String(255), comment='提供商用户ID')
    
    # 权限和状态
    role = Column(
        Enum(UserRole),
        default=UserRole.USER,
        nullable=False,
        comment='用户角色'
    )
    status = Column(
        Enum(UserStatus),
        default=UserStatus.ACTIVE,
        nullable=False,
        comment='用户状态'
    )
    
    # 时间信息
    last_login = Column(DateTime, comment='最后登录时间')
    last_login_at = Column(DateTime, comment='最后登录时间（兼容字段）')
    last_active_at = Column(DateTime, comment='最后活动时间')
    
    # 设置和偏好
    preferences = Column(JSON, comment='用户偏好设置 (JSON)')
    timezone = Column(String(50), default='UTC', comment='时区')
    locale = Column(String(10), default='zh-CN', comment='语言区域')
    
    # 关系
    projects = relationship(
        'Project',
        back_populates='owner',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )
    tasks = relationship(
        'Task',
        back_populates='assignee',
        foreign_keys='Task.assignee_id',
        lazy='dynamic'
    )
    created_tasks = relationship(
        'Task',
        back_populates='creator',
        foreign_keys='Task.creator_id',
        lazy='dynamic'
    )
    api_tokens = relationship(
        'ApiToken',
        back_populates='user',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )
    settings = relationship(
        'UserSettings',
        back_populates='user',
        cascade='all, delete-orphan',
        uselist=False
    )
    
    def __repr__(self):
        return f'<User {self.id}: {self.email}>'
    
    def to_dict(self, include_sensitive=False):
        """转换为字典"""
        result = super().to_dict()
        result['role'] = self.role.value if self.role else None
        result['status'] = self.status.value if self.status else None
        
        # 移除敏感信息
        if not include_sensitive:
            result.pop('auth0_user_id', None)
            result.pop('provider_user_id', None)
        
        return result
    
    def to_public_dict(self):
        """转换为公开信息字典"""
        return {
            'id': self.id,
            'username': self.username,
            'nickname': self.nickname,
            'full_name': self.full_name,
            'avatar_url': self.avatar_url,
            'bio': self.bio,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
    
    @classmethod
    def create_from_auth0(cls, auth0_user_data):
        """从Auth0用户数据创建用户"""
        user = cls(
            auth0_user_id=auth0_user_data['user_id'],
            email=auth0_user_data['email'],
            email_verified=auth0_user_data.get('email_verified', False),
            nickname=auth0_user_data.get('nickname'),
            full_name=auth0_user_data.get('name'),
            avatar_url=auth0_user_data.get('picture'),
            provider=auth0_user_data.get('identities', [{}])[0].get('provider'),
            provider_user_id=auth0_user_data.get('identities', [{}])[0].get('user_id'),
            last_login_at=datetime.utcnow(),
            last_active_at=datetime.utcnow(),
        )
        
        # 设置用户名
        if not user.username:
            # 从邮箱生成用户名（不需要保证唯一性）
            user.username = user.email.split('@')[0]
        
        return user
    

    
    def update_from_auth0(self, auth0_user_data):
        """从Auth0用户数据更新用户信息"""
        self.email = auth0_user_data['email']
        self.email_verified = auth0_user_data.get('email_verified', False)
        self.nickname = auth0_user_data.get('nickname')
        self.full_name = auth0_user_data.get('name')
        self.avatar_url = auth0_user_data.get('picture')
        self.last_login_at = datetime.utcnow()
        self.last_active_at = datetime.utcnow()

    @classmethod
    def create_from_google(cls, google_user_data):
        """从Google用户数据创建用户"""
        user = cls(
            google_id=google_user_data['id'],
            email=google_user_data['email'],
            email_verified=google_user_data.get('verified_email', False),
            full_name=google_user_data.get('name'),
            avatar_url=google_user_data.get('picture'),
            provider='google',
            provider_user_id=google_user_data['id'],
            last_login_at=datetime.utcnow(),
            last_active_at=datetime.utcnow(),
        )

        # 设置用户名
        if not user.username:
            # 从邮箱生成用户名（不需要保证唯一性）
            user.username = user.email.split('@')[0]

        return user

    def update_from_google(self, google_user_data):
        """从Google用户数据更新用户信息"""
        self.email = google_user_data['email']
        self.email_verified = google_user_data.get('verified_email', False)
        self.full_name = google_user_data.get('name')
        self.avatar_url = google_user_data.get('picture')
        self.last_login_at = datetime.utcnow()
        self.last_active_at = datetime.utcnow()
    
    def is_admin(self):
        """检查是否为管理员"""
        return self.role == UserRole.ADMIN
    
    def is_active(self):
        """检查用户是否活跃"""
        return self.status == UserStatus.ACTIVE
    
    def can_access_project(self, project):
        """检查是否可以访问项目"""
        if self.is_admin():
            return True
        return project.owner_id == self.id
    
    def can_access_task(self, task):
        """检查是否可以访问任务"""
        if self.is_admin():
            return True
        return (task.assignee_id == self.id or 
                task.creator_id == self.id or 
                self.can_access_project(task.project))
    
    def update_last_active(self):
        """更新最后活动时间"""
        self.last_active_at = datetime.utcnow()
        self.save()
    
    def get_preferences(self, key=None, default=None):
        """获取用户偏好设置"""
        if not self.preferences:
            return default if key else {}
        
        if key:
            return self.preferences.get(key, default)
        return self.preferences
    
    def set_preference(self, key, value):
        """设置用户偏好"""
        if not self.preferences:
            self.preferences = {}
        
        self.preferences[key] = value
        self.save()
    

    
    @classmethod
    def find_by_email(cls, email):
        """根据邮箱查找用户"""
        return cls.query.filter_by(email=email).first()
    
    @classmethod
    def get_active_users(cls):
        """获取所有活跃用户"""
        return cls.query.filter_by(status=UserStatus.ACTIVE).all()
    
    @classmethod
    def get_admin_users(cls):
        """获取所有管理员用户"""
        return cls.query.filter_by(role=UserRole.ADMIN, status=UserStatus.ACTIVE).all()
