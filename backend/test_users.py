#!/usr/bin/env python3
import sys
import os
sys.path.append('.')

# 导入模型和配置
from models import db, User, Project, Task, UserActivity

# 直接导入app.py模块
import importlib.util
spec = importlib.util.spec_from_file_location("main_app", "app.py")
main_app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(main_app)

# 使用应用实例
application = main_app.app

def test_users():
    with application.app_context():
        users = User.query.all()
        print('Users in database:')
        for user in users:
            print(f'ID: {user.id}, Email: {user.email}, Username: {user.username}')
        
        if not users:
            print('No users found in database')
            return
        
        # 测试用户活跃度
        user = users[0]
        print(f'\nTesting with user: {user.email}')
        
        # 查看今天的活跃度
        from datetime import date
        today = date.today()
        activity = UserActivity.query.filter_by(user_id=user.id, activity_date=today).first()
        if activity:
            print(f'Today activity: created={activity.task_created_count}, updated={activity.task_updated_count}, status_changed={activity.task_status_changed_count}')
        else:
            print('No activity today')

if __name__ == '__main__':
    test_users()
