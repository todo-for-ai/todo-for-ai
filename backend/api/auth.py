"""
认证 API 蓝图

提供用户认证相关的接口
"""

import os
import secrets
from flask import Blueprint, request, jsonify, redirect, url_for, session
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User
from .base import api_response, api_error, handle_api_error
from app.github_config import github_service, require_auth, get_current_user
from app.google_config import google_service

# 创建蓝图
auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['GET'])
def login():
    """启动GitHub登录流程（保持向后兼容）"""
    return github_login()


@auth_bp.route('/login/github', methods=['GET'])
def github_login():
    """启动GitHub登录流程"""
    try:
        # 获取重定向URL
        redirect_uri = request.args.get('redirect_uri',
                                       'http://localhost:50110/todo-for-ai/api/v1/auth/callback')

        # 存储原始重定向URL，确保重定向到前端dashboard
        return_to = request.args.get('return_to', '/todo-for-ai/pages/dashboard')

        # 如果是相对路径，转换为前端完整URL
        if return_to.startswith('/'):
            return_to = f'http://localhost:50111{return_to}'
        # 如果是后端URL，替换为前端URL
        elif return_to.startswith('http://localhost:50110'):
            return_to = return_to.replace('http://localhost:50110', 'http://localhost:50111')
        # 如果没有指定，默认到dashboard
        elif not return_to.startswith('http://localhost:50111'):
            return_to = 'http://localhost:50111/todo-for-ai/pages/dashboard'

        session['redirect_after_login'] = return_to
        session['auth_provider'] = 'github'

        # 重定向到GitHub登录页面
        return github_service.oauth.github.authorize_redirect(redirect_uri)

    except Exception as e:
        return handle_api_error(e)


@auth_bp.route('/login/google', methods=['GET'])
def google_login():
    """启动Google登录流程"""
    try:
        # 获取重定向URL
        redirect_uri = request.args.get('redirect_uri',
                                       'http://localhost:50110/todo-for-ai/api/v1/auth/google/callback')

        # 存储原始重定向URL，确保重定向到前端dashboard
        return_to = request.args.get('return_to', '/todo-for-ai/pages/dashboard')

        # 如果是相对路径，转换为前端完整URL
        if return_to.startswith('/'):
            return_to = f'http://localhost:50111{return_to}'
        # 如果是后端URL，替换为前端URL
        elif return_to.startswith('http://localhost:50110'):
            return_to = return_to.replace('http://localhost:50110', 'http://localhost:50111')
        # 如果没有指定，默认到dashboard
        elif not return_to.startswith('http://localhost:50111'):
            return_to = 'http://localhost:50111/todo-for-ai/pages/dashboard'

        session['redirect_after_login'] = return_to
        session['auth_provider'] = 'google'

        # 重定向到Google登录页面
        return google_service.oauth.google.authorize_redirect(redirect_uri)

    except Exception as e:
        return handle_api_error(e)


@auth_bp.route('/callback', methods=['GET'])
def callback():
    """GitHub OAuth回调处理（保持向后兼容）"""
    return github_callback()


@auth_bp.route('/callback/github', methods=['GET'])
def github_callback():
    """GitHub OAuth回调处理"""
    try:
        # 获取授权码并交换令牌
        token = github_service.oauth.github.authorize_access_token()

        if not token:
            return api_error("Failed to get access token from GitHub", 400)

        # 获取用户信息
        user_info = github_service.get_user_info(token['access_token'])
        if not user_info:
            return api_error("Failed to get user information", 400)

        # 创建或更新用户
        user = github_service.create_or_update_user(user_info)
        if not user:
            return api_error("Failed to create or update user", 500)

        # 生成JWT令牌
        access_token = github_service.generate_tokens(user)

        # 获取重定向URL，默认到dashboard
        redirect_url = session.pop('redirect_after_login', 'http://localhost:50111/todo-for-ai/pages/dashboard')

        # 重定向到前端，并在URL中包含令牌
        return redirect(f"{redirect_url}?token={access_token}")

    except Exception as e:
        return handle_api_error(e)


@auth_bp.route('/google/callback', methods=['GET'])
def google_callback():
    """Google OAuth回调处理"""
    try:
        # 获取授权码并交换令牌
        token = google_service.oauth.google.authorize_access_token()

        if not token:
            return api_error("Failed to get access token from Google", 400)

        # 获取用户信息
        user_info = google_service.get_user_info(token['access_token'])
        if not user_info:
            return api_error("Failed to get user information from Google", 400)

        # 创建或更新用户
        user = google_service.create_or_update_user(user_info)
        if not user:
            return api_error("Failed to create or update user", 500)

        # 生成JWT令牌
        access_token = google_service.generate_tokens(user)

        # 获取重定向URL，默认到dashboard
        redirect_url = session.pop('redirect_after_login', 'http://localhost:50111/todo-for-ai/pages/dashboard')

        # 重定向到前端，并在URL中包含令牌
        return redirect(f"{redirect_url}?token={access_token}")

    except Exception as e:
        return handle_api_error(e)



@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """用户登出"""
    try:
        current_user = get_current_user()
        
        # 记录登出时间
        current_user.last_active_at = None
        current_user.save()

        # 简单的登出响应（不再使用Auth0）
        return_to = request.json.get('return_to', 'http://localhost:50111/todo-for-ai/pages')

        return api_response({
            'message': 'Logout successful',
            'redirect_url': return_to
        })
        
    except Exception as e:
        return handle_api_error(e)


@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_current_user_info():
    """获取当前用户信息"""
    try:
        current_user = get_current_user()
        return api_response(current_user.to_dict())
        
    except Exception as e:
        return handle_api_error(e)


@auth_bp.route('/me', methods=['PUT'])
@require_auth
def update_current_user():
    """更新当前用户信息"""
    try:
        current_user = get_current_user()
        
        if not request.is_json:
            return api_error("Content-Type must be application/json", 400)
        
        data = request.get_json()
        
        # 允许更新的字段
        allowed_fields = ['nickname', 'full_name', 'bio', 'timezone', 'locale']
        
        for field in allowed_fields:
            if field in data:
                setattr(current_user, field, data[field])
        
        # 处理偏好设置
        if 'preferences' in data:
            if not current_user.preferences:
                current_user.preferences = {}
            current_user.preferences.update(data['preferences'])
        
        current_user.save()
        
        return api_response(current_user.to_dict(), "User information updated successfully")
        
    except Exception as e:
        return handle_api_error(e)


@auth_bp.route('/verify', methods=['POST'])
def verify_token():
    """验证JWT令牌"""
    try:
        data = request.get_json()
        if not data or 'token' not in data:
            return api_error("Token is required", 400)
        
        # 这里可以添加令牌验证逻辑
        # 目前使用Flask-JWT-Extended的内置验证
        
        return api_response({
            'valid': True,
            'message': 'Token is valid'
        })
        
    except Exception as e:
        return api_response({
            'valid': False,
            'message': 'Token is invalid'
        })


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """刷新访问令牌"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.is_active():
            return api_error("User not found or inactive", 404)
        
        # 生成新的访问令牌
        new_token = github_service.generate_tokens(user)
        
        return api_response({
            'access_token': new_token,
            'token_type': 'Bearer'
        })
        
    except Exception as e:
        return handle_api_error(e)


@auth_bp.route('/users', methods=['GET'])
@require_auth
def list_users():
    """获取用户列表（需要管理员权限）"""
    try:
        current_user = get_current_user()
        
        if not current_user.is_admin():
            return api_error("Admin access required", 403)
        
        # 获取查询参数
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)
        search = request.args.get('search', '').strip()
        status = request.args.get('status')
        role = request.args.get('role')
        
        # 构建查询
        query = User.query
        
        if search:
            query = query.filter(
                User.email.contains(search) |
                User.username.contains(search) |
                User.full_name.contains(search)
            )
        
        if status:
            query = query.filter_by(status=status)
        
        if role:
            query = query.filter_by(role=role)
        
        # 分页
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return api_response({
            'users': [user.to_dict() for user in pagination.items],
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_prev': pagination.has_prev,
                'has_next': pagination.has_next
            }
        })
        
    except Exception as e:
        return handle_api_error(e)


@auth_bp.route('/users/<int:user_id>', methods=['GET'])
@require_auth
def get_user(user_id):
    """获取指定用户信息"""
    try:
        current_user = get_current_user()
        
        # 只有管理员或用户本人可以查看详细信息
        if not current_user.is_admin() and current_user.id != user_id:
            return api_error("Access denied", 403)
        
        user = User.query.get(user_id)
        if not user:
            return api_error("User not found", 404)
        
        return api_response(user.to_dict())
        
    except Exception as e:
        return handle_api_error(e)


@auth_bp.route('/users/<int:user_id>/status', methods=['PUT'])
@require_auth
def update_user_status(user_id):
    """更新用户状态（管理员功能）"""
    try:
        current_user = get_current_user()
        
        if not current_user.is_admin():
            return api_error("Admin access required", 403)
        
        user = User.query.get(user_id)
        if not user:
            return api_error("User not found", 404)
        
        data = request.get_json()
        if not data or 'status' not in data:
            return api_error("Status is required", 400)
        
        # 验证状态值
        from models.user import UserStatus
        try:
            new_status = UserStatus(data['status'])
            user.status = new_status
            user.save()
            
            return api_response(user.to_dict(), "User status updated successfully")
            
        except ValueError:
            return api_error("Invalid status value", 400)
        
    except Exception as e:
        return handle_api_error(e)
