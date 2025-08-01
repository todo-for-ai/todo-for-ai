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

        # 获取请求详细信息
        request_info = {
            'request_id': g.request_id,
            'method': request.method,
            'url': str(request.url),
            'path': request.path,
            'remote_addr': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', 'Unknown'),
            'content_type': request.headers.get('Content-Type', 'None'),
            'content_length': request.headers.get('Content-Length', '0'),
            'authorization': 'Bearer ***' if request.headers.get('Authorization') else 'None',
            'timestamp': datetime.utcnow().isoformat(),
            'query_args': dict(request.args) if request.args else {},
            'form_keys': list(request.form.keys()) if request.form else [],
            'files': list(request.files.keys()) if request.files else [],
            'is_json': request.is_json,
            'is_secure': request.is_secure
        }

        # 记录请求开始
        app.logger.info(f"[REQUEST_START] {g.request_id} {request.method} {request.path}", extra=request_info)

        # 如果是 JSON 请求，记录请求体（但不记录敏感信息）
        if request.is_json and request.method in ['POST', 'PUT', 'PATCH']:
            try:
                json_data = request.get_json()
                if json_data:
                    # 过滤敏感字段
                    filtered_data = {}
                    for key, value in json_data.items():
                        if any(sensitive in key.lower() for sensitive in ['password', 'token', 'secret', 'key']):
                            filtered_data[key] = '***'
                        elif isinstance(value, str) and len(value) > 100:
                            filtered_data[key] = value[:100] + '...'
                        else:
                            filtered_data[key] = value

                    app.logger.debug(f"[REQUEST_BODY] {g.request_id}", extra={
                        'request_id': g.request_id,
                        'json_data': filtered_data,
                        'data_size': len(str(json_data))
                    })
            except Exception as e:
                app.logger.warning(f"[REQUEST_BODY_ERROR] {g.request_id} Failed to parse JSON: {e}")

    @app.after_request
    def after_request(response):
        """请求结束后的处理"""
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time

            # 获取响应详细信息
            response_info = {
                'request_id': g.request_id,
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'duration_ms': round(duration * 1000, 2),
                'duration_s': round(duration, 3),
                'content_type': response.headers.get('Content-Type', 'Unknown'),
                'content_length': response.headers.get('Content-Length', 'Unknown'),
                'timestamp': datetime.utcnow().isoformat(),
                'cache_control': response.headers.get('Cache-Control', 'None'),
                'location': response.headers.get('Location', 'None')
            }

            # 根据状态码选择日志级别
            if response.status_code >= 500:
                log_level = 'error'
            elif response.status_code >= 400:
                log_level = 'warning'
            elif response.status_code >= 300:
                log_level = 'info'
            else:
                log_level = 'info'

            getattr(app.logger, log_level)(
                f"[REQUEST_END] {g.request_id} {request.method} {request.path} - "
                f"Status: {response.status_code}, Duration: {duration:.3f}s",
                extra=response_info
            )

            # 记录慢请求
            if duration > 1.0:  # 超过1秒的请求
                app.logger.warning(f"[SLOW_REQUEST] {g.request_id} {request.method} {request.path} - Duration: {duration:.3f}s", extra=response_info)

        # 添加响应头
        response.headers['X-Request-ID'] = getattr(g, 'request_id', 'unknown')
        if hasattr(g, 'start_time'):
            duration = time.time() - g.start_time
            response.headers['X-Response-Time'] = f"{duration:.3f}s"

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

        # HSTS - 强制HTTPS（生产环境）
        if not app.debug:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'

        # 内容安全策略 - 更严格的配置
        if app.debug:
            # 开发环境：允许本地资源和必要的内联样式
            response.headers['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: blob:; "
                "font-src 'self'; "
                "connect-src 'self' ws: wss:; "
                "frame-ancestors 'none'"
            )
        else:
            # 生产环境：严格的CSP
            response.headers['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )

        # 隐藏服务器信息
        response.headers.pop('Server', None)

        # 权限策略
        response.headers['Permissions-Policy'] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "speaker=()"
        )

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
