#!/usr/bin/env python3
"""
创建用户设置表

用于存储用户的个人设置和偏好
"""

import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app
from models import db
from models.user_settings import UserSettings
from models.user import User


def detect_browser_language():
    """检测浏览器语言的辅助函数（用于设置默认语言）"""
    # 这个函数在实际使用中会在前端调用
    # 这里只是作为参考实现
    return 'en'  # 默认英语


def create_user_settings_table():
    """创建用户设置表"""
    with app.app.app_context():
        try:
            # 创建表
            db.create_all()
            print("✅ 用户设置表创建成功")
            
            # 为现有用户创建默认设置
            users_without_settings = User.query.outerjoin(UserSettings).filter(
                UserSettings.user_id.is_(None)
            ).all()
            
            created_count = 0
            for user in users_without_settings:
                # 根据用户的locale字段设置默认语言
                default_language = 'zh-CN' if user.locale and user.locale.startswith('zh') else 'en'
                
                settings = UserSettings(
                    user_id=user.id,
                    language=default_language,
                    settings_data={}
                )
                settings.save()
                created_count += 1
            
            print(f"✅ 为 {created_count} 个现有用户创建了默认设置")
            
        except Exception as e:
            print(f"❌ 创建用户设置表失败: {str(e)}")
            raise


if __name__ == '__main__':
    create_user_settings_table()
