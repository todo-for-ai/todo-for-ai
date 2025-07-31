#!/usr/bin/env python3
"""
修复热力图数据关联问题的脚本

问题：
1. 有很多任务的creator_id为None，导致活跃度记录不到正确的用户
2. 需要将这些任务关联到正确的用户，并重新计算活跃度

解决方案：
1. 分析任务的项目所有者，将任务关联到项目所有者
2. 重新计算所有用户的活跃度记录
"""

import sys
import os
sys.path.append('.')

from datetime import datetime, date, timedelta
from models import db, User, Task, Project, UserActivity
import importlib.util

def load_app():
    """加载Flask应用"""
    spec = importlib.util.spec_from_file_location('main_app', 'app.py')
    main_app = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(main_app)
    return main_app.app

def fix_task_creators():
    """修复任务创建者关联"""
    print("🔧 开始修复任务创建者关联...")
    
    # 查找所有creator_id为None的任务
    orphan_tasks = Task.query.filter(Task.creator_id.is_(None)).all()
    print(f"📋 找到 {len(orphan_tasks)} 个没有创建者的任务")
    
    fixed_count = 0
    for task in orphan_tasks:
        # 获取任务所属的项目
        project = Project.query.get(task.project_id)
        if project and project.owner_id:
            # 将任务的创建者设置为项目所有者
            task.creator_id = project.owner_id
            
            # 如果没有created_by，也设置一下
            if not task.created_by:
                owner = User.query.get(project.owner_id)
                if owner:
                    task.created_by = owner.email
            
            fixed_count += 1
            print(f"  ✅ 任务 {task.id} ({task.title[:30]}...) 关联到用户 {project.owner_id}")
    
    if fixed_count > 0:
        db.session.commit()
        print(f"🎉 成功修复 {fixed_count} 个任务的创建者关联")
    else:
        print("ℹ️ 没有需要修复的任务")
    
    return fixed_count

def recalculate_user_activities():
    """重新计算所有用户的活跃度"""
    print("\n📊 开始重新计算用户活跃度...")
    
    # 清空现有的活跃度记录
    UserActivity.query.delete()
    db.session.commit()
    print("🗑️ 已清空现有活跃度记录")
    
    # 获取所有用户
    users = User.query.all()
    print(f"👥 找到 {len(users)} 个用户")
    
    # 计算过去一年的日期范围
    end_date = date.today()
    start_date = end_date - timedelta(days=365)
    
    total_activities = 0
    
    for user in users:
        print(f"\n👤 处理用户 {user.id} ({user.email})")
        
        # 获取用户创建的所有任务
        user_tasks = Task.query.filter_by(creator_id=user.id).all()
        print(f"  📋 用户创建了 {len(user_tasks)} 个任务")
        
        # 按日期分组统计活跃度
        daily_activities = {}
        
        for task in user_tasks:
            # 任务创建日期
            created_date = task.created_at.date()
            if start_date <= created_date <= end_date:
                if created_date not in daily_activities:
                    daily_activities[created_date] = {
                        'task_created_count': 0,
                        'task_updated_count': 0,
                        'task_status_changed_count': 0
                    }
                daily_activities[created_date]['task_created_count'] += 1
            
            # 任务更新日期（如果有的话）
            if task.updated_at and task.updated_at != task.created_at:
                updated_date = task.updated_at.date()
                if start_date <= updated_date <= end_date:
                    if updated_date not in daily_activities:
                        daily_activities[updated_date] = {
                            'task_created_count': 0,
                            'task_updated_count': 0,
                            'task_status_changed_count': 0
                        }
                    daily_activities[updated_date]['task_updated_count'] += 1
            
            # 任务完成日期（如果有的话）
            if task.completed_at:
                completed_date = task.completed_at.date()
                if start_date <= completed_date <= end_date:
                    if completed_date not in daily_activities:
                        daily_activities[completed_date] = {
                            'task_created_count': 0,
                            'task_updated_count': 0,
                            'task_status_changed_count': 0
                        }
                    daily_activities[completed_date]['task_status_changed_count'] += 1
        
        # 创建活跃度记录
        for activity_date, counts in daily_activities.items():
            total_count = (
                counts['task_created_count'] + 
                counts['task_updated_count'] + 
                counts['task_status_changed_count']
            )
            
            if total_count > 0:
                activity = UserActivity(
                    user_id=user.id,
                    activity_date=activity_date,
                    task_created_count=counts['task_created_count'],
                    task_updated_count=counts['task_updated_count'],
                    task_status_changed_count=counts['task_status_changed_count'],
                    total_activity_count=total_count,
                    first_activity_at=datetime.combine(activity_date, datetime.min.time()),
                    last_activity_at=datetime.combine(activity_date, datetime.max.time())
                )
                db.session.add(activity)
                total_activities += 1
                print(f"    📅 {activity_date}: 总活跃度 {total_count}")
    
    db.session.commit()
    print(f"\n🎉 重新计算完成，共创建 {total_activities} 条活跃度记录")

def verify_results():
    """验证修复结果"""
    print("\n🔍 验证修复结果...")
    
    # 检查还有多少任务没有创建者
    orphan_tasks = Task.query.filter(Task.creator_id.is_(None)).count()
    print(f"📋 剩余没有创建者的任务: {orphan_tasks}")
    
    # 检查每个用户的活跃度记录
    users = User.query.all()
    for user in users:
        activities = UserActivity.query.filter_by(user_id=user.id).count()
        if activities > 0:
            print(f"👤 用户 {user.id} ({user.email}): {activities} 条活跃度记录")
    
    # 检查今天的活跃度
    today = date.today()
    today_activities = UserActivity.query.filter_by(activity_date=today).all()
    print(f"\n📅 今天的活跃度记录:")
    for activity in today_activities:
        user = User.query.get(activity.user_id)
        print(f"  用户 {activity.user_id} ({user.email if user else 'Unknown'}): 总活跃度 {activity.total_activity_count}")

def main():
    """主函数"""
    print("🚀 开始修复热力图数据关联问题...")
    
    app = load_app()
    
    with app.app_context():
        try:
            # 1. 修复任务创建者关联
            fixed_count = fix_task_creators()
            
            # 2. 重新计算用户活跃度
            recalculate_user_activities()
            
            # 3. 验证结果
            verify_results()
            
            print("\n✅ 热力图数据修复完成！")
            
        except Exception as e:
            print(f"\n❌ 修复过程中出现错误: {e}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    main()
