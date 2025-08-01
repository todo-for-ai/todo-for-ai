#!/usr/bin/env python3
"""
设置用户为管理员角色
执行任务286：把邮箱为 cc11001100@qq.com 的这个用户的角色设置为admin
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
from models import db, User
from models.user import UserRole

def set_user_admin(email):
    """设置指定邮箱的用户为管理员"""
    app = create_app()
    
    with app.app_context():
        try:
            # 查找用户
            user = User.query.filter_by(email=email).first()
            
            if not user:
                print(f"❌ 用户不存在: {email}")
                return False
            
            # 检查当前角色
            current_role = user.role.value if user.role else 'unknown'
            print(f"📋 用户信息:")
            print(f"   邮箱: {user.email}")
            print(f"   用户名: {user.username}")
            print(f"   全名: {user.full_name}")
            print(f"   当前角色: {current_role}")
            print(f"   状态: {user.status.value if user.status else 'unknown'}")
            
            if user.role == UserRole.ADMIN:
                print(f"✅ 用户 {email} 已经是管理员")
                return True
            
            # 设置为管理员
            user.role = UserRole.ADMIN
            user.save()
            
            print(f"✅ 成功将用户 {email} 设置为管理员")
            
            # 验证更改
            updated_user = User.query.filter_by(email=email).first()
            if updated_user and updated_user.role == UserRole.ADMIN:
                print(f"✅ 验证成功: 用户角色已更新为 {updated_user.role.value}")
                return True
            else:
                print(f"❌ 验证失败: 角色更新可能未生效")
                return False
                
        except Exception as e:
            print(f"❌ 设置管理员角色时出错: {str(e)}")
            db.session.rollback()
            return False

def main():
    """主函数"""
    target_email = "cc11001100@qq.com"
    
    print("🎯 执行任务286: 设置用户为管理员")
    print(f"目标邮箱: {target_email}")
    print("=" * 50)
    
    success = set_user_admin(target_email)
    
    print("=" * 50)
    if success:
        print("🎉 任务286执行成功!")
    else:
        print("❌ 任务286执行失败!")
    
    return success

if __name__ == "__main__":
    main()
