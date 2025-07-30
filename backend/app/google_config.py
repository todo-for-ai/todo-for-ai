"""
Google OAuth 配置和服务
"""

import os
import requests
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, g, current_app
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from authlib.integrations.flask_client import OAuth
from models import User


class GoogleConfig:
    def __init__(self):
        self.client_id = os.environ.get('GOOGLE_CLIENT_ID')
        self.client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
        
        if not self.client_id or not self.client_secret:
            raise ValueError("Google OAuth 配置缺失")


class GoogleService:
    def __init__(self, app=None):
        self.app = app
        self.config = None
        self.oauth = None
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        self.app = app
        self.config = GoogleConfig()
        
        # 初始化 OAuth
        self.oauth = OAuth(app)
        self.oauth.register(
            'google',
            client_id=self.config.client_id,
            client_secret=self.config.client_secret,
            server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
            client_kwargs={
                'scope': 'openid email profile'
            }
        )
    
    def get_user_info(self, access_token):
        """获取Google用户信息"""
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json'
            }
            
            user_response = requests.get(
                'https://www.googleapis.com/oauth2/v2/userinfo', 
                headers=headers, 
                timeout=10
            )
            user_response.raise_for_status()
            user_data = user_response.json()
            
            return user_data
        except Exception as e:
            current_app.logger.error(f"获取Google用户信息失败: {str(e)}")
            return None
    
    def create_or_update_user(self, google_user_info):
        """创建或更新Google用户"""
        try:
            google_id = str(google_user_info['id'])
            email = google_user_info.get('email')
            
            if not email:
                current_app.logger.error("Google用户信息中缺少邮箱")
                return None
            
            # 首先尝试通过google_id查找用户
            user = User.query.filter_by(google_id=google_id).first()
            
            # 如果没有找到，尝试通过邮箱查找（可能是已存在的用户）
            if not user:
                user = User.query.filter_by(email=email).first()
                if user:
                    # 如果找到了相同邮箱的用户，更新其Google ID
                    user.google_id = google_id
                    user.provider = 'google'
                    user.provider_user_id = google_id
            
            if user:
                # 更新现有用户信息
                user.update_from_google(google_user_info)
            else:
                # 创建新用户
                user = User.create_from_google(google_user_info)
                from models import db
                db.session.add(user)

            from models import db
            db.session.commit()
            return user
        except Exception as e:
            current_app.logger.error(f"创建或更新Google用户失败: {str(e)}")
            from models import db
            db.session.rollback()
            return None
    
    def generate_tokens(self, user):
        """为用户生成JWT令牌"""
        try:
            access_token = create_access_token(
                identity=user.id,
                additional_claims={
                    'username': user.username,
                    'email': user.email,
                    'google_id': user.google_id,
                    'provider': 'google'
                }
            )
            return access_token
        except Exception as e:
            current_app.logger.error(f"生成Google用户令牌失败: {str(e)}")
            return None


# 创建全局Google服务实例
google_service = GoogleService()
