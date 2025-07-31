#!/usr/bin/env python3
"""
测试热力图数据更新bug修复效果
"""
import sys
import os
import requests
import json
from datetime import date

# 服务器配置
BASE_URL = 'http://127.0.0.1:50110'
PROJECT_ID = 10  # ToDo For AI项目ID

def test_heatmap_fix():
    """测试热力图数据更新修复效果"""
    print("🧪 开始测试热力图数据更新bug修复效果...")
    
    # 由于REST API现在需要认证，我们需要使用MCP接口或者直接操作数据库
    # 这里我们直接操作数据库来测试
    
    sys.path.append('.')
    from models import db, User, Project, Task, UserActivity, TaskStatus
    import importlib.util
    spec = importlib.util.spec_from_file_location("main_app", "app.py")
    main_app = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(main_app)
    
    application = main_app.app
    
    with application.app_context():
        # 获取第一个用户
        user = User.query.first()
        if not user:
            print("❌ 没有找到用户，无法测试")
            return False
        
        print(f"👤 使用用户: {user.email} (ID: {user.id})")
        
        # 获取项目
        project = Project.query.get(PROJECT_ID)
        if not project:
            print(f"❌ 没有找到项目ID {PROJECT_ID}")
            return False
        
        print(f"📁 使用项目: {project.name} (ID: {project.id})")
        
        # 检查今天的初始活跃度
        today = date.today()
        initial_activity = UserActivity.query.filter_by(
            user_id=user.id, 
            activity_date=today
        ).first()
        
        initial_created = initial_activity.task_created_count if initial_activity else 0
        initial_status_changed = initial_activity.task_status_changed_count if initial_activity else 0
        
        print(f"📊 初始活跃度 - 创建: {initial_created}, 状态变更: {initial_status_changed}")
        
        # 1. 创建测试任务
        print("\n🔨 创建测试任务...")
        test_task = Task(
            project_id=PROJECT_ID,
            title="热力图测试任务",
            content="这是一个用于测试热力图数据更新的任务",
            status=TaskStatus.TODO,
            creator_id=user.id,  # 设置创建者ID
            created_by=user.email
        )
        
        db.session.add(test_task)
        db.session.commit()
        
        # 记录任务创建活跃度
        try:
            UserActivity.record_activity(user.id, 'task_created')
            print("✅ 任务创建活跃度记录成功")
        except Exception as e:
            print(f"❌ 任务创建活跃度记录失败: {e}")
            return False
        
        # 2. 更新任务状态为完成
        print("\n📝 更新任务状态为完成...")
        test_task.status = TaskStatus.DONE
        test_task.completion_rate = 100
        from datetime import datetime
        test_task.completed_at = datetime.utcnow()
        
        db.session.commit()
        
        # 记录状态变更活跃度
        try:
            UserActivity.record_activity(user.id, 'task_status_changed')
            print("✅ 任务状态变更活跃度记录成功")
        except Exception as e:
            print(f"❌ 任务状态变更活跃度记录失败: {e}")
            return False
        
        # 3. 检查最终活跃度
        print("\n📈 检查最终活跃度...")
        final_activity = UserActivity.query.filter_by(
            user_id=user.id, 
            activity_date=today
        ).first()
        
        if final_activity:
            final_created = final_activity.task_created_count
            final_status_changed = final_activity.task_status_changed_count
            final_total = final_activity.total_activity_count
            
            print(f"📊 最终活跃度 - 创建: {final_created}, 状态变更: {final_status_changed}, 总计: {final_total}")
            
            # 验证数据是否正确更新
            expected_created = initial_created + 1
            expected_status_changed = initial_status_changed + 1
            
            if final_created == expected_created and final_status_changed == expected_status_changed:
                print("✅ 活跃度数据更新正确！")
                
                # 4. 测试热力图数据获取
                print("\n🔥 测试热力图数据获取...")
                heatmap_data = UserActivity.get_user_activity_heatmap(user.id, days=7)
                
                # 查找今天的数据
                today_str = today.isoformat()
                today_data = next((item for item in heatmap_data if item['date'] == today_str), None)
                
                if today_data and today_data['count'] > 0:
                    print(f"✅ 热力图数据包含今天的活跃度: {today_data}")
                    print("🎉 热力图数据更新bug修复成功！")
                    
                    # 清理测试任务
                    print("\n🧹 清理测试任务...")
                    db.session.delete(test_task)
                    db.session.commit()
                    print("✅ 测试任务已清理")
                    
                    return True
                else:
                    print("❌ 热力图数据中没有找到今天的活跃度")
                    return False
            else:
                print(f"❌ 活跃度数据更新不正确 - 期望创建: {expected_created}, 实际: {final_created}; 期望状态变更: {expected_status_changed}, 实际: {final_status_changed}")
                return False
        else:
            print("❌ 没有找到今天的活跃度记录")
            return False

if __name__ == '__main__':
    success = test_heatmap_fix()
    if success:
        print("\n🎉 测试通过！热力图数据更新bug已修复")
        exit(0)
    else:
        print("\n❌ 测试失败！需要进一步检查")
        exit(1)
