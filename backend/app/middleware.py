"""
Flask 中间件配置

包含请求日志、错误处理、性能监控等中间件
"""

import time
import logging
from datetime import datetime
from flask import request, g, jsonify
from functools import wraps


def setup_logging(app):
    """配置日志系统"""
    if not app.debug:
        # 生产环境日志配置
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        )
    else:
        # 开发环境日志配置
        logging.basicConfig(
            level=logging.DEBUG,
            format='%(asctime)s %(levelname)s: %(message)s'
        )


def setup_request_logging(app):
    """配置请求日志中间件"""
    
    @app.before_request
    def before_request():
        """请求开始前的处理"""
        g.start_time = time.time()
        g.request_id = f"{int(time.time() * 1000)}-{id(request)}"
        
        # 记录请求开始
        app.logger.info(f"[{g.request_id}] {request.method} {request.url} - Start")
    
    @app.after_request
    def after_request(response):
        """请求结束后的处理"""
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            app.logger.info(
                f"[{g.request_id}] {request.method} {request.url} - "
                f"Status: {response.status_code}, Duration: {duration:.3f}s"
            )
        
        # 添加响应头
        response.headers['X-Request-ID'] = getattr(g, 'request_id', 'unknown')
        response.headers['X-Response-Time'] = f"{duration:.3f}s" if hasattr(g, 'start_time') else 'unknown'
        
        return response


def setup_error_handlers(app):
    """配置错误处理器"""
    
    @app.errorhandler(400)
    def bad_request(error):
        """400 错误处理"""
        app.logger.warning(f"Bad Request: {request.url} - {error}")
        return jsonify({
            'error': 'Bad Request',
            'message': 'The request could not be understood by the server',
            'status_code': 400,
            'timestamp': datetime.utcnow().isoformat(),
            'path': request.path
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        """401 错误处理"""
        app.logger.warning(f"Unauthorized: {request.url} - {error}")
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication is required',
            'status_code': 401,
            'timestamp': datetime.utcnow().isoformat(),
            'path': request.path
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """403 错误处理"""
        app.logger.warning(f"Forbidden: {request.url} - {error}")
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have permission to access this resource',
            'status_code': 403,
            'timestamp': datetime.utcnow().isoformat(),
            'path': request.path
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        """404 错误处理"""
        app.logger.info(f"Not Found: {request.url}")
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found',
            'status_code': 404,
            'timestamp': datetime.utcnow().isoformat(),
            'path': request.path
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """405 错误处理"""
        app.logger.warning(f"Method Not Allowed: {request.method} {request.url}")
        return jsonify({
            'error': 'Method Not Allowed',
            'message': f'The {request.method} method is not allowed for this endpoint',
            'status_code': 405,
            'timestamp': datetime.utcnow().isoformat(),
            'path': request.path
        }), 405
    
    @app.errorhandler(422)
    def unprocessable_entity(error):
        """422 错误处理"""
        app.logger.warning(f"Unprocessable Entity: {request.url} - {error}")
        return jsonify({
            'error': 'Unprocessable Entity',
            'message': 'The request was well-formed but contains semantic errors',
            'status_code': 422,
            'timestamp': datetime.utcnow().isoformat(),
            'path': request.path
        }), 422
    
    @app.errorhandler(500)
    def internal_error(error):
        """500 错误处理"""
        from models import db
        db.session.rollback()
        app.logger.error(f"Internal Server Error: {request.url} - {error}")
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'status_code': 500,
            'timestamp': datetime.utcnow().isoformat(),
            'path': request.path
        }), 500


def setup_security_headers(app):
    """配置安全响应头"""
    
    @app.after_request
    def add_security_headers(response):
        """添加安全响应头"""
        # 防止点击劫持
        response.headers['X-Frame-Options'] = 'DENY'
        
        # 防止 MIME 类型嗅探
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # XSS 保护
        response.headers['X-XSS-Protection'] = '1; mode=block'
        
        # 引用策略
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # 内容安全策略（开发环境相对宽松）
        if app.debug:
            response.headers['Content-Security-Policy'] = "default-src 'self' 'unsafe-inline' 'unsafe-eval'"
        else:
            response.headers['Content-Security-Policy'] = "default-src 'self'"
        
        return response


def rate_limit_decorator(max_requests=100, window=3600):
    """简单的速率限制装饰器"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 这里可以实现基于 Redis 的速率限制
            # 目前只是一个占位符
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_json(f):
    """要求请求内容为 JSON 的装饰器"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method in ['POST', 'PUT', 'PATCH']:
            if not request.is_json:
                return jsonify({
                    'error': 'Bad Request',
                    'message': 'Content-Type must be application/json'
                }), 400
        return f(*args, **kwargs)
    return decorated_function


def validate_request_size(max_size=16 * 1024 * 1024):  # 16MB
    """验证请求大小的装饰器"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.content_length and request.content_length > max_size:
                return jsonify({
                    'error': 'Request Entity Too Large',
                    'message': f'Request size exceeds maximum allowed size of {max_size} bytes'
                }), 413
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def setup_all_middleware(app):
    """设置所有中间件"""
    setup_logging(app)
    setup_request_logging(app)
    setup_error_handlers(app)
    setup_security_headers(app)
    
    app.logger.info("All middleware configured successfully")
