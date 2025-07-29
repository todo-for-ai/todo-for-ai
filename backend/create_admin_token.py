#!/usr/bin/env python3
"""
创建管理员Token的脚本
"""

import sys
import os

# 添加当前目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import importlib.util
spec = importlib.util.spec_from_file_location("app_module", "app.py")
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)

from models import db, ApiToken

def create_admin_token():
    """创建管理员Token"""
    app = app_module.create_app()
    
    with app.app_context():
        try:
            # 检查是否已有管理员token
            existing_token = ApiToken.query.filter_by(name='Admin Token').first()
            if existing_token:
                print(f"管理员Token已存在: {existing_token.name}")
                print(f"Token ID: {existing_token.id}")
                print(f"前缀: {existing_token.prefix}")
                return
            
            # 创建管理员token
            api_token, token = ApiToken.generate_token(
                name='Admin Token',
                description='Initial admin token for API access',
                expires_days=365  # 1年有效期
            )
            
            db.session.add(api_token)
            db.session.commit()
            
            print("✅ 管理员Token创建成功！")
            print("=" * 50)
            print(f"Token名称: {api_token.name}")
            print(f"Token ID: {api_token.id}")
            print(f"完整Token: {token}")
            print(f"前缀: {api_token.prefix}")
            print(f"过期时间: {api_token.expires_at}")
            print("=" * 50)
            print("⚠️  请妥善保存完整Token，它只会显示这一次！")
            print("使用方法:")
            print(f"  Authorization: Bearer {token}")
            print("或者:")
            print(f"  ?token={token}")
            
        except Exception as e:
            print(f"❌ 创建管理员Token失败: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    create_admin_token()
