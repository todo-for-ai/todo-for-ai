"""
认证相关功能
"""

from functools import wraps
from flask import request, jsonify, g
from models import ApiToken


def token_required(f):
    """Token认证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # 从Authorization header获取token
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        # 从query参数获取token（备用方式）
        if not token:
            token = request.args.get('token')
        
        if not token:
            return jsonify({
                'error': 'Token is missing',
                'message': 'Please provide a valid API token'
            }), 401
        
        # 验证token
        api_token = ApiToken.verify_token(token)
        if not api_token:
            return jsonify({
                'error': 'Invalid token',
                'message': 'The provided token is invalid or expired'
            }), 401
        
        # 将token信息存储到g对象中
        g.current_token = api_token
        
        return f(*args, **kwargs)
    
    return decorated_function


def optional_token_auth(f):
    """可选的Token认证装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # 从Authorization header获取token
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        # 从query参数获取token（备用方式）
        if not token:
            token = request.args.get('token')
        
        # 如果有token，验证它
        if token:
            api_token = ApiToken.verify_token(token)
            if api_token:
                g.current_token = api_token
            else:
                g.current_token = None
        else:
            g.current_token = None
        
        return f(*args, **kwargs)
    
    return decorated_function


def get_current_token():
    """获取当前请求的token"""
    return getattr(g, 'current_token', None)


def is_authenticated():
    """检查当前请求是否已认证"""
    return get_current_token() is not None
