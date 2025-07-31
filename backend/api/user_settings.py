#!/usr/bin/env python3
"""
用户设置 API

提供用户设置的增删改查功能
"""

from flask import Blueprint, request, jsonify
from app.github_config import require_auth, get_current_user
from api.base import api_response, api_error, handle_api_error
from models.user_settings import UserSettings
from models.user import User


user_settings_bp = Blueprint('user_settings', __name__)


@user_settings_bp.route('', methods=['GET'])
@require_auth
def get_user_settings():
    """获取当前用户的设置"""
    try:
        current_user = get_current_user()
        
        # 获取或创建用户设置
        settings = UserSettings.get_or_create_for_user(
            current_user.id,
            default_language=detect_user_language(request)
        )
        
        return api_response(settings.to_dict(), "User settings retrieved successfully")
        
    except Exception as e:
        return handle_api_error(e)


@user_settings_bp.route('', methods=['PUT'])
@require_auth
def update_user_settings():
    """更新当前用户的设置"""
    try:
        current_user = get_current_user()
        
        if not request.is_json:
            return api_error("Content-Type must be application/json", 400)
        
        data = request.get_json()
        
        # 获取或创建用户设置
        settings = UserSettings.get_or_create_for_user(current_user.id)
        
        # 更新语言设置
        if 'language' in data:
            language = data['language']
            if language not in ['zh-CN', 'en']:
                return api_error("Invalid language. Must be 'zh-CN' or 'en'", 400)
            settings.language = language
        
        # 更新其他设置数据
        if 'settings_data' in data:
            if not settings.settings_data:
                settings.settings_data = {}
            settings.settings_data.update(data['settings_data'])
        
        settings.save()
        
        return api_response(settings.to_dict(), "User settings updated successfully")
        
    except Exception as e:
        return handle_api_error(e)


@user_settings_bp.route('/language', methods=['PUT'])
@require_auth
def update_language():
    """更新用户语言设置"""
    try:
        current_user = get_current_user()
        
        if not request.is_json:
            return api_error("Content-Type must be application/json", 400)
        
        data = request.get_json()
        language = data.get('language')
        
        if not language:
            return api_error("Language is required", 400)
        
        if language not in ['zh-CN', 'en']:
            return api_error("Invalid language. Must be 'zh-CN' or 'en'", 400)
        
        # 获取或创建用户设置
        settings = UserSettings.get_or_create_for_user(current_user.id)
        settings.language = language
        settings.save()
        
        return api_response({
            'language': settings.language
        }, "Language updated successfully")
        
    except Exception as e:
        return handle_api_error(e)


def detect_user_language(request):
    """根据请求头检测用户语言偏好"""
    accept_language = request.headers.get('Accept-Language', '')
    
    # 检查是否包含中文
    if 'zh' in accept_language.lower():
        return 'zh-CN'
    
    # 默认返回英语
    return 'en'
