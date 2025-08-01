#!/usr/bin/env python3
"""
为管理员用户创建新的API Token
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import importlib.util
spec = importlib.util.spec_from_file_location("app_module", "app.py")
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)
create_app = app_module.create_app

from models import db, User, ApiToken
from models.user import UserRole

def create_admin_token():
    """为管理员用户创建API Token"""
    app = create_app()
    
    with app.app_context():
        try:
            # 查找管理员用户
            admin_user = User.query.filter_by(email="cc11001100@qq.com").first()
            
            if not admin_user:
                print("❌ 管理员用户不存在")
                return None
            
            if admin_user.role != UserRole.ADMIN:
                print("❌ 用户不是管理员")
                return None
            
            print(f"📋 为管理员用户创建API Token:")
            print(f"   邮箱: {admin_user.email}")
            print(f"   用户名: {admin_user.username}")
            print(f"   角色: {admin_user.role.value}")
            
            # 创建新的API Token
            api_token, token = ApiToken.generate_token(
                name="MCP Admin Token",
                description="管理员MCP工具专用Token"
            )
            
            # 关联到管理员用户
            api_token.user_id = admin_user.id
            api_token.save()
            
            print(f"✅ API Token创建成功!")
            print(f"Token ID: {api_token.id}")
            print(f"Token前缀: {api_token.prefix}")
            print(f"完整Token: {token}")
            print(f"创建时间: {api_token.created_at}")
            
            return token
                
        except Exception as e:
            print(f"❌ 创建API Token时出错: {str(e)}")
            db.session.rollback()
            return None

def main():
    """主函数"""
    print("🔑 创建管理员API Token")
    print("=" * 50)
    
    token = create_admin_token()
    
    print("=" * 50)
    if token:
        print("🎉 API Token创建成功!")
        print(f"请保存此Token: {token}")
    else:
        print("❌ API Token创建失败!")
    
    return token

if __name__ == "__main__":
    main()
