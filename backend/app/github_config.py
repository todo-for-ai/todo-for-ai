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
            is_new_user = user is None

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

            # 为新用户自动创建API Token、用户设置和默认全局规则
            if is_new_user:
                self._create_default_api_token(user)
                # 从Flask的request上下文获取请求对象
                from flask import request as flask_request
                self._create_default_user_settings(user, flask_request)
                self._create_default_global_rule(user)

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

    def _create_default_api_token(self, user):
        """为新用户创建默认的API Token"""
        try:
            from models import ApiToken, db

            # 检查用户是否已有API Token
            existing_token = ApiToken.query.filter_by(user_id=user.id).first()
            if existing_token:
                return  # 已有Token，不需要创建

            # 生成永不过期的默认Token
            api_token, token = ApiToken.generate_token(
                name="默认Token",
                description="系统自动生成的默认API Token，用于MCP客户端认证",
                expires_days=None  # 永不过期
            )

            # 设置用户ID
            api_token.user_id = user.id

            db.session.add(api_token)
            db.session.commit()

            current_app.logger.info(f"为用户 {user.email} 创建了默认API Token")

        except Exception as e:
            current_app.logger.error(f"创建默认API Token失败: {str(e)}")
            from models import db
            db.session.rollback()

    def _create_default_user_settings(self, user, request=None):
        """为新用户创建默认的用户设置"""
        try:
            from models import UserSettings, db

            # 检查用户是否已有设置
            existing_settings = UserSettings.query.filter_by(user_id=user.id).first()
            if existing_settings:
                return  # 已有设置，不需要创建

            # 检测用户语言偏好
            default_language = self._detect_user_language(user, request)

            # 创建默认设置
            settings = UserSettings(
                user_id=user.id,
                language=default_language,
                settings_data={}
            )

            db.session.add(settings)
            db.session.commit()

            current_app.logger.info(f"为用户 {user.email} 创建了默认用户设置，语言: {default_language}")

        except Exception as e:
            current_app.logger.error(f"创建默认用户设置失败: {str(e)}")
            from models import db
            db.session.rollback()

    def _detect_user_language(self, user, request=None):
        """检测用户的语言偏好"""
        # 1. 优先使用用户的locale字段
        if user.locale and user.locale.startswith('zh'):
            return 'zh-CN'

        # 2. 如果有请求对象，检查Accept-Language头
        if request:
            accept_language = request.headers.get('Accept-Language', '')
            if 'zh' in accept_language.lower():
                return 'zh-CN'

        # 3. 默认返回英语
        return 'en'

    def _create_default_global_rule(self, user):
        """为新用户创建默认的全局规则"""
        try:
            from models import ContextRule, db

            # 检查用户是否已有全局规则
            existing_rule = ContextRule.query.filter_by(
                user_id=user.id,
                project_id=None  # 全局规则
            ).first()
            if existing_rule:
                return  # 已有全局规则，不需要创建

            # 创建默认全局规则
            rule_content = """用户界面交互UI设计的四个基本原则：亲密性、对齐、重复和对比。

1. **亲密性**
   相关元素放得近，无关元素分开排。
   这样分组更清晰，用户一看就明白。

2. **对齐**
   所有元素要对齐，左中右都要整齐。
   随便乱摆会显乱，对齐才能更专业。

3. **重复**
   同样样式重复用，颜色字体要统一。
   保持风格一致性，用户习惯更容易。

4. **对比**
   重要内容要突出，大小颜色差别大。
   对比越强越显眼，用户一眼就看到。"""

            default_rule = ContextRule(
                user_id=user.id,
                project_id=None,  # 全局规则
                name="用户界面交互UI设计的基本原则",
                description="系统自动创建的默认全局规则，包含UI设计的四个基本原则",
                content=rule_content,
                priority=0,
                is_active=True,
                apply_to_tasks=True,
                apply_to_projects=False,
                is_public=False,
                usage_count=0,
                created_by='system'
            )

            db.session.add(default_rule)
            db.session.commit()

            current_app.logger.info(f"为用户 {user.email} 创建了默认全局规则")

        except Exception as e:
            current_app.logger.error(f"创建默认全局规则失败: {str(e)}")
            from models import db
            db.session.rollback()


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

            # 检查用户状态，只有active状态的用户才能访问
            if not current_user.is_active():
                return jsonify({
                    'error': 'user_suspended',
                    'message': 'Your account has been suspended. Please contact administrator.'
                }), 403

            g.current_user = current_user
            return f(*args, **kwargs)
        except Exception as e:
            current_app.logger.error(f"认证失败: {str(e)}")
            return jsonify({'error': 'authentication_failed'}), 401

    return decorated_function


def get_current_user():
    return getattr(g, 'current_user', None)
