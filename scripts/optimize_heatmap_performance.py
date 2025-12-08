#!/usr/bin/env python3
"""
热力图性能优化脚本
- 添加activity_level字段
- 预计算历史数据的level
"""

import sys
import os
from datetime import datetime, date

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
api_server_dir = os.path.join(project_root, 'todo-for-ai-api-server')
sys.path.insert(0, api_server_dir)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 加载环境变量
env_path = os.path.join(project_root, 'private-deploy', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

DATABASE_URL = os.environ.get('DATABASE_URL') or 'mysql+pymysql://root:password@localhost:3306/todo_for_ai'

def get_activity_level(count):
    """
    根据活跃次数获取活跃等级（用于热力图颜色）
    """
    if count == 0:
        return 0
    elif count <= 2:
        return 1
    elif count <= 5:
        return 2
    elif count <= 10:
        return 3
    else:
        return 4

def main():
    print("=" * 70)
    print("🚀 热力图性能优化工具")
    print("=" * 70)
    print()
    
    engine = create_engine(DATABASE_URL, echo=False)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # 1. 检查字段是否存在
        print("📊 检查activity_level字段...")
        result = session.execute(text("""
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'user_activities'
            AND COLUMN_NAME = 'activity_level'
        """))
        field_exists = result.fetchone()[0] > 0
        
        if not field_exists:
            print("➕ 添加activity_level字段...")
            session.execute(text("""
                ALTER TABLE user_activities 
                ADD COLUMN activity_level TINYINT DEFAULT 0 
                COMMENT '活跃等级(0-4，用于热力图颜色)' 
                AFTER total_activity_count
            """))
            session.commit()
            print("✅ 字段添加成功")
        else:
            print("✅ activity_level字段已存在")
        
        # 2. 计算需要更新的记录数
        print("\n📊 统计需要更新的记录...")
        result = session.execute(text("""
            SELECT COUNT(*) FROM user_activities 
            WHERE activity_level = 0 AND total_activity_count > 0
        """))
        need_update = result.fetchone()[0]
        
        if need_update == 0:
            print("✅ 所有记录的activity_level都已计算")
            return
        
        print(f"📝 需要更新 {need_update:,} 条记录")
        
        # 3. 批量更新activity_level
        print("\n🔄 开始批量更新activity_level...")
        
        # 使用CASE WHEN批量更新，性能更好
        update_sql = text("""
            UPDATE user_activities 
            SET activity_level = CASE
                WHEN total_activity_count = 0 THEN 0
                WHEN total_activity_count <= 2 THEN 1
                WHEN total_activity_count <= 5 THEN 2
                WHEN total_activity_count <= 10 THEN 3
                ELSE 4
            END
            WHERE activity_level = 0 OR activity_level IS NULL
        """)
        
        result = session.execute(update_sql)
        session.commit()
        
        affected_rows = result.rowcount
        print(f"✅ 更新完成！共更新 {affected_rows:,} 条记录")
        
        # 4. 验证更新结果
        print("\n🔍 验证更新结果...")
        result = session.execute(text("""
            SELECT activity_level, COUNT(*) as count 
            FROM user_activities 
            GROUP BY activity_level 
            ORDER BY activity_level
        """))
        
        print("活跃等级分布：")
        for row in result:
            level, count = row
            print(f"  Level {level}: {count:,} 条记录")
        
        print("\n" + "=" * 70)
        print("✅ 优化完成！")
        print("\n下一步：")
        print("1. 修改UserActivity.get_user_activity_heatmap()直接读取activity_level")
        print("2. 修改UserActivity.record_activity()在记录时自动计算level")
        print("=" * 70)
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == '__main__':
    main()
