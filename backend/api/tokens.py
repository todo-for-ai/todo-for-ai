"""
API Token管理接口
"""

from flask import Blueprint, request, jsonify, g
from models import db, ApiToken, User
from app.auth import token_required, get_current_token
from app.github_config import require_auth, get_current_user
from api.base import handle_api_error

tokens_bp = Blueprint('tokens', __name__)


@tokens_bp.route('', methods=['GET'])
@require_auth
def list_tokens():
    """获取当前用户的Token列表"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)

        # 查询当前用户的tokens
        user_id = g.current_user.id
        query = ApiToken.query.filter_by(user_id=user_id, is_active=True)
        
        # 分页
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        tokens = [token.to_dict() for token in pagination.items]
        
        return jsonify({
            'tokens': tokens,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        })
    
    except Exception as e:
        return handle_api_error(e)


@tokens_bp.route('', methods=['POST'])
@require_auth
def create_token():
    """创建新的API Token"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        name = data.get('name')
        if not name:
            return jsonify({'error': 'Token name is required'}), 400

        description = data.get('description')
        expires_days = data.get('expires_days')

        # 生成token
        api_token, token = ApiToken.generate_token(
            name=name,
            description=description,
            expires_days=expires_days
        )

        # 设置用户ID
        api_token.user_id = g.current_user.id

        db.session.add(api_token)
        db.session.commit()
        
        # 返回token信息（包含完整token，仅此一次）
        result = api_token.to_dict()
        result['token'] = token  # 完整token仅在创建时返回
        
        return jsonify(result), 201
    
    except Exception as e:
        db.session.rollback()
        return handle_api_error(e)


@tokens_bp.route('/<int:token_id>', methods=['GET'])
@token_required
def get_token(token_id):
    """获取Token详情"""
    try:
        api_token = ApiToken.query.get_or_404(token_id)
        return jsonify(api_token.to_dict())
    
    except Exception as e:
        return handle_api_error(e)


@tokens_bp.route('/<int:token_id>', methods=['PUT'])
@token_required
def update_token(token_id):
    """更新Token"""
    try:
        api_token = ApiToken.query.get_or_404(token_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 更新字段
        if 'name' in data:
            api_token.name = data['name']
        if 'description' in data:
            api_token.description = data['description']
        if 'is_active' in data:
            api_token.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify(api_token.to_dict())
    
    except Exception as e:
        db.session.rollback()
        return handle_api_error(e)


@tokens_bp.route('/<int:token_id>/renew', methods=['POST'])
@token_required
def renew_token(token_id):
    """续期Token"""
    try:
        api_token = ApiToken.query.get_or_404(token_id)
        data = request.get_json() or {}
        
        expires_days = data.get('expires_days')
        api_token.renew(expires_days)
        
        return jsonify({
            'message': 'Token renewed successfully',
            'token': api_token.to_dict()
        })
    
    except Exception as e:
        db.session.rollback()
        return handle_api_error(e)


@tokens_bp.route('/<int:token_id>/reveal', methods=['GET'])
@require_auth
def reveal_token(token_id):
    """获取解密的完整token"""
    try:
        user_id = g.current_user.id

        # 查找token，确保只能查看自己的token
        api_token = ApiToken.query.filter_by(
            id=token_id,
            user_id=user_id,
            is_active=True
        ).first()

        if not api_token:
            return jsonify({
                'success': False,
                'error': 'Token not found'
            }), 404

        # 尝试获取解密的token
        decrypted_token = None

        # 检查是否有加密的token数据
        if hasattr(api_token, 'token_encrypted') and api_token.token_encrypted:
            decrypted_token = api_token.get_decrypted_token()

        # 如果没有加密数据或解密失败，提供友好的错误信息
        if not decrypted_token:
            return jsonify({
                'success': False,
                'error': 'This token was created before the encryption feature was enabled. For security reasons, the full token cannot be displayed. Please create a new token if you need to view the complete token value.',
                'suggestion': 'Create a new token to enable the view feature'
            }), 400

        return jsonify({
            'success': True,
            'data': {
                'token': decrypted_token,
                'name': api_token.name,
                'prefix': api_token.prefix,
                'created_at': api_token.created_at.isoformat() if api_token.created_at else None
            }
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'An error occurred while revealing the token: {str(e)}'
        }), 500


@tokens_bp.route('/<int:token_id>', methods=['DELETE'])
@require_auth
def delete_token(token_id):
    """删除（停用）Token"""
    try:
        user_id = g.current_user.id

        # 查找token，确保只能删除自己的token
        api_token = ApiToken.query.filter_by(
            id=token_id,
            user_id=user_id
        ).first()

        if not api_token:
            return jsonify({
                'error': 'Token not found'
            }), 404

        # 软删除（设置为非活跃状态）
        api_token.deactivate()

        return jsonify({
            'message': 'Token deactivated successfully'
        })

    except Exception as e:
        db.session.rollback()
        return handle_api_error(e)


@tokens_bp.route('/verify', methods=['POST'])
def verify_token():
    """验证Token（公开接口）"""
    try:
        data = request.get_json()
        if not data or 'token' not in data:
            return jsonify({'error': 'Token is required'}), 400
        
        token = data['token']
        api_token = ApiToken.verify_token(token)
        
        if api_token:
            return jsonify({
                'valid': True,
                'token_info': api_token.to_dict()
            })
        else:
            return jsonify({
                'valid': False,
                'message': 'Invalid or expired token'
            })
    
    except Exception as e:
        return handle_api_error(e)


@tokens_bp.route('/cleanup', methods=['POST'])
@token_required
def cleanup_expired_tokens():
    """清理过期的Token"""
    try:
        count = ApiToken.cleanup_expired()
        
        return jsonify({
            'message': f'Cleaned up {count} expired tokens',
            'count': count
        })
    
    except Exception as e:
        db.session.rollback()
        return handle_api_error(e)
