"""
API 基础工具函数

包含通用的响应格式、错误处理等工具函数
"""

from datetime import datetime
from flask import jsonify, request


def api_response(data=None, message="Success", status_code=200, **kwargs):
    """
    标准 API 响应格式
    
    Args:
        data: 响应数据
        message: 响应消息
        status_code: HTTP 状态码
        **kwargs: 其他响应字段
    
    Returns:
        Flask Response 对象
    """
    response_data = {
        'success': 200 <= status_code < 300,
        'message': message,
        'timestamp': datetime.utcnow().isoformat(),
        'path': request.path,
        **kwargs
    }
    
    if data is not None:
        response_data['data'] = data
    
    return jsonify(response_data), status_code


def api_error(message="An error occurred", status_code=400, error_code=None, details=None):
    """
    标准 API 错误响应格式
    
    Args:
        message: 错误消息
        status_code: HTTP 状态码
        error_code: 业务错误码
        details: 错误详情
    
    Returns:
        Flask Response 对象
    """
    error_data = {
        'success': False,
        'error': {
            'message': message,
            'status_code': status_code,
            'timestamp': datetime.utcnow().isoformat(),
            'path': request.path
        }
    }
    
    if error_code:
        error_data['error']['code'] = error_code
    
    if details:
        error_data['error']['details'] = details
    
    return jsonify(error_data), status_code


def paginate_query(query, page=1, per_page=20, max_per_page=100):
    """
    分页查询工具函数
    
    Args:
        query: SQLAlchemy 查询对象
        page: 页码
        per_page: 每页数量
        max_per_page: 最大每页数量
    
    Returns:
        分页结果字典
    """
    # 限制每页数量
    per_page = min(per_page, max_per_page)
    
    # 执行分页查询
    pagination = query.paginate(
        page=page,
        per_page=per_page,
        error_out=False
    )
    
    return {
        'items': [item.to_dict() for item in pagination.items],
        'pagination': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages,
            'has_prev': pagination.has_prev,
            'has_next': pagination.has_next,
            'prev_num': pagination.prev_num,
            'next_num': pagination.next_num
        }
    }


def validate_json_request(required_fields=None, optional_fields=None):
    """
    验证 JSON 请求数据
    
    Args:
        required_fields: 必需字段列表
        optional_fields: 可选字段列表
    
    Returns:
        验证后的数据字典或错误响应
    """
    if not request.is_json:
        return api_error("Content-Type must be application/json", 400)
    
    data = request.get_json()
    if not data:
        return api_error("Request body must contain valid JSON", 400)
    
    # 检查必需字段
    if required_fields:
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return api_error(
                f"Missing required fields: {', '.join(missing_fields)}",
                400,
                error_code="MISSING_FIELDS",
                details={"missing_fields": missing_fields}
            )
    
    # 过滤允许的字段
    allowed_fields = set()
    if required_fields:
        allowed_fields.update(required_fields)
    if optional_fields:
        allowed_fields.update(optional_fields)
    
    if allowed_fields:
        filtered_data = {k: v for k, v in data.items() if k in allowed_fields}
        return filtered_data
    
    return data


def get_request_args():
    """
    获取请求参数
    
    Returns:
        包含分页和筛选参数的字典
    """
    return {
        'page': request.args.get('page', 1, type=int),
        'per_page': request.args.get('per_page', 20, type=int),
        'search': request.args.get('search', '').strip(),
        'sort_by': request.args.get('sort_by', 'created_at'),
        'sort_order': request.args.get('sort_order', 'desc'),
        'status': request.args.get('status'),
        'priority': request.args.get('priority'),
        'assignee': request.args.get('assignee'),
        'project_id': request.args.get('project_id', type=int),
    }


class APIException(Exception):
    """自定义 API 异常类"""
    
    def __init__(self, message, status_code=400, error_code=None, details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details
    
    def to_response(self):
        """转换为 API 错误响应"""
        return api_error(
            message=self.message,
            status_code=self.status_code,
            error_code=self.error_code,
            details=self.details
        )


def handle_api_error(error, status_code=500):
    """
    处理API错误的通用函数

    Args:
        error: 错误对象或错误消息
        status_code: HTTP状态码

    Returns:
        Flask Response 对象
    """
    if isinstance(error, Exception):
        message = str(error)
    else:
        message = error

    return api_error(message, status_code)
