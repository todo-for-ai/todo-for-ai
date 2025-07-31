#!/usr/bin/env python3
"""
数据库迁移：为用户活跃度表添加完成任务计数字段
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 直接导入app.py中的create_app函数
import importlib.util
spec = importlib.util.spec_from_file_location("app", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app.py"))
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)
create_app = app_module.create_app

from models import db, UserActivity
from sqlalchemy import text

def add_task_completed_count_column():
    """添加 task_completed_count 字段"""
    app = create_app()

    with app.app_context():
        try:
            # 检查字段是否已存在
            result = db.session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'user_activities' 
                AND column_name = 'task_completed_count'
            """))
            
            if result.fetchone():
                print("✅ task_completed_count 字段已存在，跳过迁移")
                return True
            
            print("🔄 开始添加 task_completed_count 字段...")
            
            # 添加新字段
            db.session.execute(text("""
                ALTER TABLE user_activities 
                ADD COLUMN task_completed_count INTEGER DEFAULT 0 
                COMMENT '当天完成任务数量'
            """))
            
            # 更新现有记录的默认值
            db.session.execute(text("""
                UPDATE user_activities 
                SET task_completed_count = 0 
                WHERE task_completed_count IS NULL
            """))
            
            db.session.commit()
            print("✅ 成功添加 task_completed_count 字段")
            
            # 验证字段添加成功
            result = db.session.execute(text("""
                SELECT column_name, data_type, column_default, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'user_activities' 
                AND column_name = 'task_completed_count'
            """))
            
            column_info = result.fetchone()
            if column_info:
                print(f"📊 字段信息: {column_info}")
                return True
            else:
                print("❌ 字段添加验证失败")
                return False
                
        except Exception as e:
            print(f"❌ 迁移失败: {str(e)}")
            db.session.rollback()
            return False

def update_total_activity_count():
    """更新总活跃度计算，包含完成任务计数"""
    app = create_app()

    with app.app_context():
        try:
            print("🔄 更新总活跃度计算...")
            
            # 重新计算所有记录的总活跃度
            db.session.execute(text("""
                UPDATE user_activities 
                SET total_activity_count = (
                    COALESCE(task_created_count, 0) + 
                    COALESCE(task_updated_count, 0) + 
                    COALESCE(task_status_changed_count, 0) + 
                    COALESCE(task_completed_count, 0)
                )
            """))
            
            db.session.commit()
            
            # 验证更新结果
            result = db.session.execute(text("""
                SELECT COUNT(*) as total_records,
                       SUM(task_created_count) as total_created,
                       SUM(task_updated_count) as total_updated,
                       SUM(task_status_changed_count) as total_status_changed,
                       SUM(task_completed_count) as total_completed,
                       SUM(total_activity_count) as total_activities
                FROM user_activities
            """))
            
            stats = result.fetchone()
            if stats:
                print(f"📊 更新统计:")
                print(f"  总记录数: {stats[0]}")
                print(f"  创建任务: {stats[1]}")
                print(f"  更新任务: {stats[2]}")
                print(f"  状态变更: {stats[3]}")
                print(f"  完成任务: {stats[4]}")
                print(f"  总活跃度: {stats[5]}")
            
            print("✅ 总活跃度计算更新完成")
            return True
            
        except Exception as e:
            print(f"❌ 更新总活跃度失败: {str(e)}")
            db.session.rollback()
            return False

def main():
    """执行迁移"""
    print("🚀 开始数据库迁移：添加完成任务计数字段")
    
    # 1. 添加字段
    if not add_task_completed_count_column():
        print("❌ 迁移失败：无法添加字段")
        return False
    
    # 2. 更新总活跃度计算
    if not update_total_activity_count():
        print("❌ 迁移失败：无法更新总活跃度")
        return False
    
    print("🎉 数据库迁移完成！")
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
