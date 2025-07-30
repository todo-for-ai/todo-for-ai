"""
用户项目Pin API接口
"""

from flask import Blueprint, request, jsonify, g
from models import db, UserProjectPin, Project
from app.github_config import require_auth, get_current_user
from .base import api_response, api_error, handle_api_error

pins_bp = Blueprint('pins', __name__, url_prefix='/api/pins')


@pins_bp.route('', methods=['GET'])
@require_auth
def get_user_pins():
    """获取当前用户的Pin配置"""
    try:
        user_id = get_current_user().id
        # 使用join来确保加载项目数据
        pins = UserProjectPin.query.filter_by(user_id=user_id, is_active=True)\
            .join(Project)\
            .order_by(UserProjectPin.pin_order.asc(), UserProjectPin.created_at.asc())\
            .all()

        # 转换为字典并包含项目信息
        result = []
        for pin in pins:
            pin_dict = pin.to_dict()
            result.append(pin_dict)

        return api_response({
            'pins': result,
            'total': len(result)
        })

    except Exception as e:
        return handle_api_error(e)


@pins_bp.route('', methods=['POST'])
@require_auth
def pin_project():
    """Pin一个项目"""
    try:
        user_id = get_current_user().id
        data = request.get_json()
        
        project_id = data.get('project_id')
        pin_order = data.get('pin_order')
        
        if not project_id:
            return jsonify({'error': 'project_id is required'}), 400
        
        # 检查项目是否存在且用户有权限访问
        project = Project.query.filter_by(id=project_id, owner_id=user_id).first()
        if not project:
            return jsonify({'error': 'Project not found or access denied'}), 404
        
        # 检查Pin数量限制（最多10个）
        current_pin_count = UserProjectPin.get_user_pin_count(user_id)
        if current_pin_count >= 10:
            # 检查是否已经Pin了这个项目
            if not UserProjectPin.is_project_pinned(user_id, project_id):
                return jsonify({'error': 'Maximum 10 projects can be pinned'}), 400
        
        # Pin项目
        pin = UserProjectPin.pin_project(user_id, project_id, pin_order)
        db.session.add(pin)
        db.session.commit()
        
        return jsonify({
            'message': 'Project pinned successfully',
            'pin': pin.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        return handle_api_error(e)


@pins_bp.route('/<int:project_id>', methods=['DELETE'])
@require_auth
def unpin_project(project_id):
    """取消Pin一个项目"""
    try:
        user_id = get_current_user().id
        
        # 取消Pin
        pin = UserProjectPin.unpin_project(user_id, project_id)
        if not pin:
            return jsonify({'error': 'Pin not found'}), 404
        
        db.session.add(pin)
        db.session.commit()
        
        return jsonify({
            'message': 'Project unpinned successfully'
        })
    
    except Exception as e:
        db.session.rollback()
        return handle_api_error(e)


@pins_bp.route('/reorder', methods=['PUT'])
@require_auth
def reorder_pins():
    """重新排序Pin"""
    try:
        user_id = get_current_user().id
        data = request.get_json()
        
        pin_orders = data.get('pin_orders', [])
        if not pin_orders:
            return jsonify({'error': 'pin_orders is required'}), 400
        
        # 验证数据格式
        for item in pin_orders:
            if not isinstance(item, dict) or 'project_id' not in item or 'pin_order' not in item:
                return jsonify({'error': 'Invalid pin_orders format'}), 400
        
        # 重新排序
        UserProjectPin.reorder_pins(user_id, pin_orders)
        db.session.commit()
        
        return jsonify({
            'message': 'Pins reordered successfully'
        })
    
    except Exception as e:
        db.session.rollback()
        return handle_api_error(e)


@pins_bp.route('/check/<int:project_id>', methods=['GET'])
@require_auth
def check_pin_status(project_id):
    """检查项目的Pin状态"""
    try:
        user_id = get_current_user().id
        is_pinned = UserProjectPin.is_project_pinned(user_id, project_id)
        
        return jsonify({
            'project_id': project_id,
            'is_pinned': is_pinned
        })
    
    except Exception as e:
        return handle_api_error(e)


@pins_bp.route('/stats', methods=['GET'])
@require_auth
def get_pin_stats():
    """获取Pin统计信息"""
    try:
        user_id = get_current_user().id
        pin_count = UserProjectPin.get_user_pin_count(user_id)
        
        return jsonify({
            'pin_count': pin_count,
            'max_pins': 10,
            'remaining': max(0, 10 - pin_count)
        })
    
    except Exception as e:
        return handle_api_error(e)
