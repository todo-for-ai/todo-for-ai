"""
GitHub OAuth 配置和服务
"""

import os
import requests
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, g, current_app
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from authlib.integrations.flask_client import OAuth
from models import User


class GitHubConfig:
    def __init__(self):
        self.client_id = os.environ.get('GITHUB_CLIENT_ID')
        self.client_secret = os.environ.get('GITHUB_CLIENT_SECRET')
        
        if not self.client_id or not self.client_secret:
            raise ValueError("GitHub OAuth 配置缺失")


class GitHubService:
    def __init__(self, app=None):
        self.app = app
        self.config = None
        self.oauth = None
        self.jwt_manager = None
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        self.app = app
        self.config = GitHubConfig()
        
        # 初始化 OAuth
        self.oauth = OAuth(app)
        self.oauth.register(
            'github',
            client_id=self.config.client_id,
            client_secret=self.config.client_secret,
            authorize_url='https://github.com/login/oauth/authorize',
            access_token_url='https://github.com/login/oauth/access_token',
            userinfo_endpoint='https://api.github.com/user',
            client_kwargs={'scope': 'user:email'}
        )
        
        # 初始化 JWT
        self.jwt_manager = JWTManager(app)
        app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')
        app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
        
        self._register_jwt_handlers()
    
    def _register_jwt_handlers(self):
        @self.jwt_manager.expired_token_loader
        def expired_token_callback(jwt_header, jwt_payload):
            return jsonify({'error': 'token_expired'}), 401
        
        @self.jwt_manager.invalid_token_loader
        def invalid_token_callback(error):
            return jsonify({'error': 'invalid_token'}), 401
        
        @self.jwt_manager.unauthorized_loader
        def missing_token_callback(error):
            return jsonify({'error': 'authorization_required'}), 401
    
    def get_user_info(self, access_token):
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/vnd.github.v3+json'
            }
            
            user_response = requests.get('https://api.github.com/user', headers=headers, timeout=10)
            user_response.raise_for_status()
            user_data = user_response.json()
            
            if not user_data.get('email'):
                email_response = requests.get('https://api.github.com/user/emails', headers=headers, timeout=10)
                if email_response.status_code == 200:
                    emails = email_response.json()
                    primary_email = next((email['email'] for email in emails if email['primary']), None)
                    if primary_email:
                        user_data['email'] = primary_email
            
            return user_data
        except Exception as e:
            current_app.logger.error(f"获取GitHub用户信息失败: {str(e)}")
            return None
    
    def create_or_update_user(self, github_user_info):
        try:
            github_id = str(github_user_info['id'])
            username = github_user_info['login']
            email = github_user_info.get('email', f"{username}@github.local")
            avatar_url = github_user_info.get('avatar_url')
            name = github_user_info.get('name', username)
            
            user = User.query.filter_by(github_id=github_id).first()
            
            if user:
                user.username = username
                user.email = email
                user.avatar_url = avatar_url
                user.name = name
                user.last_login = datetime.utcnow()
            else:
                user = User(
                    github_id=github_id,
                    username=username,
                    email=email,
                    avatar_url=avatar_url,
                    name=name,
                    last_login=datetime.utcnow()
                )
                from models import db
                db.session.add(user)

            from models import db
            db.session.commit()
            return user
        except Exception as e:
            current_app.logger.error(f"创建或更新用户失败: {str(e)}")
            from models import db
            db.session.rollback()
            return None
    
    def generate_tokens(self, user):
        try:
            access_token = create_access_token(
                identity=user.id,
                additional_claims={
                    'username': user.username,
                    'email': user.email,
                    'github_id': user.github_id
                }
            )
            return access_token
        except Exception as e:
            current_app.logger.error(f"生成令牌失败: {str(e)}")
            return None


github_service = GitHubService()


def require_auth(f):
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        try:
            current_user_id = get_jwt_identity()
            current_user = User.query.get(current_user_id)
            
            if not current_user:
                return jsonify({'error': 'user_not_found'}), 401
            
            g.current_user = current_user
            return f(*args, **kwargs)
        except Exception as e:
            current_app.logger.error(f"认证失败: {str(e)}")
            return jsonify({'error': 'authentication_failed'}), 401
    
    return decorated_function


def get_current_user():
    return getattr(g, 'current_user', None)
