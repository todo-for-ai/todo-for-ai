#!/usr/bin/env python3
"""
完整的热力图功能测试脚本

测试流程：
1. 创建测试用户
2. 创建测试项目
3. 通过API创建任务（模拟前端行为）
4. 检查活跃度记录是否正确
5. 通过API获取热力图数据
6. 验证前端显示的数据是否正确
"""

import sys
import os
import json
import requests
from datetime import datetime, date
sys.path.append('.')

from models import db, User, Project, Task, UserActivity
import importlib.util

def load_app():
    """加载Flask应用"""
    spec = importlib.util.spec_from_file_location('main_app', 'app.py')
    main_app = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(main_app)
    return main_app.app

def create_test_user():
    """创建测试用户"""
    print("👤 创建测试用户...")
    
    # 检查是否已存在测试用户
    test_user = User.query.filter_by(email='heatmap_test@example.com').first()
    if test_user:
        print(f"  ✅ 测试用户已存在: ID {test_user.id}")
        return test_user
    
    # 创建新的测试用户
    test_user = User(
        email='heatmap_test@example.com',
        name='Heatmap Test User',
        provider='test',
        status='active'
    )
    db.session.add(test_user)
    db.session.commit()
    
    print(f"  ✅ 创建测试用户成功: ID {test_user.id}")
    return test_user

def create_test_project(user):
    """创建测试项目"""
    print("📁 创建测试项目...")
    
    # 检查是否已存在测试项目
    test_project = Project.query.filter_by(name='热力图测试项目').first()
    if test_project:
        print(f"  ✅ 测试项目已存在: ID {test_project.id}")
        return test_project
    
    # 创建新的测试项目
    test_project = Project(
        name='热力图测试项目',
        description='用于测试热力图功能的项目',
        owner_id=user.id,
        status='active'
    )
    db.session.add(test_project)
    db.session.commit()
    
    print(f"  ✅ 创建测试项目成功: ID {test_project.id}")
    return test_project

def test_api_task_creation(user, project):
    """测试通过API创建任务"""
    print("\n🔨 测试API任务创建...")
    
    # 模拟JWT token（简化测试）
    from flask_jwt_extended import create_access_token
    
    app = load_app()
    with app.app_context():
        # 创建访问令牌
        access_token = create_access_token(identity=user.id)
        
        # 准备API请求数据
        task_data = {
            'project_id': project.id,
            'title': '热力图API测试任务',
            'content': '这是通过API创建的测试任务，用于验证热力图功能',
            'status': 'todo',
            'priority': 'medium'
        }
        
        # 发送API请求
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(
                'http://localhost:50110/todo-for-ai/api/v1/tasks',
                json=task_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 201:
                result = response.json()
                task_id = result['data']['id']
                print(f"  ✅ API创建任务成功: ID {task_id}")
                return task_id
            else:
                print(f"  ❌ API创建任务失败: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"  ❌ API请求失败: {e}")
            return None

def test_direct_task_creation(user, project):
    """测试直接创建任务并记录活跃度"""
    print("\n🔨 测试直接任务创建...")
    
    # 直接创建任务
    task = Task(
        project_id=project.id,
        title='热力图直接测试任务',
        content='这是直接创建的测试任务，用于验证热力图功能',
        status='todo',
        priority='medium',
        creator_id=user.id,
        created_by=user.email
    )
    
    db.session.add(task)
    db.session.commit()
    
    print(f"  ✅ 直接创建任务成功: ID {task.id}")
    
    # 手动记录活跃度
    try:
        UserActivity.record_activity(user.id, 'task_created')
        print(f"  ✅ 活跃度记录成功")
    except Exception as e:
        print(f"  ❌ 活跃度记录失败: {e}")
    
    return task.id

def check_user_activity(user):
    """检查用户活跃度记录"""
    print(f"\n📊 检查用户 {user.id} 的活跃度记录...")
    
    today = date.today()
    activity = UserActivity.query.filter_by(
        user_id=user.id,
        activity_date=today
    ).first()
    
    if activity:
        print(f"  ✅ 找到今天的活跃度记录:")
        print(f"    创建任务: {activity.task_created_count}")
        print(f"    更新任务: {activity.task_updated_count}")
        print(f"    状态变更: {activity.task_status_changed_count}")
        print(f"    总活跃度: {activity.total_activity_count}")
        print(f"    等级: {UserActivity._get_activity_level(activity.total_activity_count)}")
        return activity
    else:
        print(f"  ❌ 没有找到今天的活跃度记录")
        return None

def test_heatmap_api(user):
    """测试热力图API"""
    print(f"\n🔥 测试热力图API...")
    
    from flask_jwt_extended import create_access_token
    
    app = load_app()
    with app.app_context():
        # 创建访问令牌
        access_token = create_access_token(identity=user.id)
        
        # 准备API请求
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.get(
                'http://localhost:50110/todo-for-ai/api/v1/dashboard/activity-heatmap',
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                heatmap_data = result['data']['heatmap_data']
                
                print(f"  ✅ 热力图API调用成功")
                print(f"  📊 热力图数据长度: {len(heatmap_data)}")
                
                # 查找今天的数据
                today_str = date.today().isoformat()
                today_data = next((item for item in heatmap_data if item['date'] == today_str), None)
                
                if today_data:
                    print(f"  📅 今天的数据: {today_data}")
                else:
                    print(f"  ❌ 没有找到今天的数据")
                
                # 统计有活跃度的天数
                active_days = [item for item in heatmap_data if item['count'] > 0]
                print(f"  🔥 有活跃度的天数: {len(active_days)}")
                
                if active_days:
                    print(f"  📈 活跃度样本:")
                    for day in active_days[:5]:  # 显示前5天
                        print(f"    {day['date']}: count={day['count']}, level={day['level']}")
                
                return heatmap_data
            else:
                print(f"  ❌ 热力图API调用失败: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"  ❌ API请求失败: {e}")
            return None

def test_activity_recording_logic():
    """测试活跃度记录逻辑"""
    print(f"\n🧪 测试活跃度记录逻辑...")
    
    # 创建临时测试用户
    temp_user = User(
        email='temp_test@example.com',
        name='Temp Test User',
        provider='test',
        status='active'
    )
    db.session.add(temp_user)
    db.session.commit()
    
    print(f"  👤 创建临时用户: ID {temp_user.id}")
    
    # 测试记录不同类型的活跃度
    try:
        UserActivity.record_activity(temp_user.id, 'task_created')
        print(f"  ✅ 记录任务创建活跃度成功")
        
        UserActivity.record_activity(temp_user.id, 'task_updated')
        print(f"  ✅ 记录任务更新活跃度成功")
        
        UserActivity.record_activity(temp_user.id, 'task_status_changed')
        print(f"  ✅ 记录状态变更活跃度成功")
        
        # 检查记录结果
        today = date.today()
        activity = UserActivity.query.filter_by(
            user_id=temp_user.id,
            activity_date=today
        ).first()
        
        if activity:
            print(f"  📊 活跃度统计:")
            print(f"    创建: {activity.task_created_count}")
            print(f"    更新: {activity.task_updated_count}")
            print(f"    状态变更: {activity.task_status_changed_count}")
            print(f"    总计: {activity.total_activity_count}")
        
    except Exception as e:
        print(f"  ❌ 活跃度记录测试失败: {e}")
    
    # 清理临时用户
    db.session.delete(temp_user)
    db.session.commit()
    print(f"  🗑️ 清理临时用户")

def main():
    """主测试函数"""
    print("🚀 开始热力图功能完整测试...")
    
    app = load_app()
    
    with app.app_context():
        try:
            # 1. 创建测试用户和项目
            user = create_test_user()
            project = create_test_project(user)
            
            # 2. 测试活跃度记录逻辑
            test_activity_recording_logic()
            
            # 3. 测试直接任务创建
            direct_task_id = test_direct_task_creation(user, project)
            
            # 4. 测试API任务创建
            api_task_id = test_api_task_creation(user, project)
            
            # 5. 检查用户活跃度
            activity = check_user_activity(user)
            
            # 6. 测试热力图API
            heatmap_data = test_heatmap_api(user)
            
            # 7. 总结测试结果
            print(f"\n📋 测试总结:")
            print(f"  用户ID: {user.id}")
            print(f"  项目ID: {project.id}")
            print(f"  直接创建任务ID: {direct_task_id}")
            print(f"  API创建任务ID: {api_task_id}")
            print(f"  今天有活跃度记录: {'是' if activity else '否'}")
            print(f"  热力图API正常: {'是' if heatmap_data else '否'}")
            
            if activity and heatmap_data:
                today_str = date.today().isoformat()
                today_data = next((item for item in heatmap_data if item['date'] == today_str), None)
                if today_data and today_data['count'] > 0:
                    print(f"  ✅ 热力图功能正常工作！")
                else:
                    print(f"  ❌ 热力图数据不匹配！")
            else:
                print(f"  ❌ 热力图功能存在问题！")
            
        except Exception as e:
            print(f"\n❌ 测试过程中出现错误: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    main()
