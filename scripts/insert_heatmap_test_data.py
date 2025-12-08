#!/usr/bin/env python3
"""
插入一百万条guest用户的活跃度热力图数据
用于性能测试
"""

import sys
import os
from datetime import datetime, date, timedelta
import random
import time

# 添加项目根目录到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
api_server_dir = os.path.join(project_root, 'todo-for-ai-api-server')
sys.path.insert(0, api_server_dir)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import pymysql

# 数据库配置 - 优先使用环境变量，否则从.env文件加载
from dotenv import load_dotenv

# 加载环境变量
env_path = os.path.join(project_root, 'private-deploy', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f"📄 加载环境变量: {env_path}")

DATABASE_URL = os.environ.get('DATABASE_URL') or 'mysql+pymysql://root:password@localhost:3306/todo_for_ai'
print(f"📊 数据库URL: {DATABASE_URL}")

# Guest用户信息
GUEST_EMAIL = 'guest@todo4ai.org'

def get_guest_user_id(session):
    """获取guest用户的ID"""
    result = session.execute(text("SELECT id FROM users WHERE email = :email"), {"email": GUEST_EMAIL})
    row = result.fetchone()
    if row:
        return row[0]
    else:
        print("❌ Guest用户不存在，请先登录一次创建guest用户")
        print("   可以访问前端点击「游客体验」按钮创建guest用户")
        sys.exit(1)

def generate_activity_data(user_id, total_records=1000000):
    """
    生成活跃度数据
    
    参数：
    - total_records: 目标总活跃次数（不是记录数）
    
    策略：
    user_activities表是每天每用户一条汇总记录
    生成最近730天（2年）的数据，每天一条，但活跃度数值很高
    实际生成730条记录，模拟100万次活跃
    """
    print(f"📊 开始生成活跃度热力图测试数据...")
    
    # 生成最近730天（2年）的数据，确保包含过去365天
    days_needed = 730
    total_activity_per_day = total_records // days_needed  # 平均每天的总活跃次数
    
    end_date = date.today()
    start_date = end_date - timedelta(days=days_needed - 1)
    
    print(f"  日期范围: {start_date} ~ {end_date} ({days_needed}天)")
    print(f"  每天总活跃次数: {total_activity_per_day:,}")
    print(f"  总记录数: {days_needed:,} 条（每天1条）")
    
    batch_data = []
    
    # 遍历每一天，生成一条汇总记录
    for day_offset in range(days_needed):
        current_date = start_date + timedelta(days=day_offset)
        
        # 将总活跃次数按比例分配到各个活动类型
        # 保持合理的比例：创建 < 完成 < 状态变更 < 更新
        task_created = random.randint(total_activity_per_day // 10, total_activity_per_day // 8)
        task_completed = random.randint(total_activity_per_day // 8, total_activity_per_day // 6)
        task_status_changed = random.randint(total_activity_per_day // 6, total_activity_per_day // 4)
        task_updated = total_activity_per_day - task_created - task_completed - task_status_changed
        
        # 确保更新数是正数
        if task_updated < 0:
            task_updated = total_activity_per_day // 4
        
        total_activity = task_created + task_updated + task_status_changed + task_completed
        
        # 生成时间戳
        first_activity = datetime.combine(current_date, datetime.min.time()) + timedelta(hours=random.randint(8, 12))
        last_activity = first_activity + timedelta(hours=random.randint(1, 10))
        
        batch_data.append({
            'user_id': user_id,
            'activity_date': current_date,
            'task_created_count': task_created,
            'task_updated_count': task_updated,
            'task_status_changed_count': task_status_changed,
            'task_completed_count': task_completed,
            'total_activity_count': total_activity,
            'first_activity_at': first_activity,
            'last_activity_at': last_activity,
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        })
        
        # 进度显示
        if (day_offset + 1) % 100 == 0:
            print(f"  生成进度: {day_offset + 1} / {days_needed} 天 ({(day_offset + 1)*100/days_needed:.1f}%)")
    
    print(f"✅ 数据生成完成，共 {len(batch_data):,} 条记录")
    print(f"   模拟总活跃次数: {sum(d['total_activity_count'] for d in batch_data):,}")
    return batch_data

def batch_insert_data(session, data, batch_size=10000):
    """
    批量插入数据
    """
    print(f"\n📥 开始批量插入数据（批次大小: {batch_size:,}）...")
    
    total = len(data)
    inserted = 0
    start_time = time.time()
    
    # 准备批量插入的SQL语句
    insert_sql = text("""
        INSERT INTO user_activities (
            user_id, activity_date, task_created_count, task_updated_count,
            task_status_changed_count, task_completed_count, total_activity_count,
            first_activity_at, last_activity_at, created_at, updated_at
        ) VALUES (
            :user_id, :activity_date, :task_created_count, :task_updated_count,
            :task_status_changed_count, :task_completed_count, :total_activity_count,
            :first_activity_at, :last_activity_at, :created_at, :updated_at
        ) ON DUPLICATE KEY UPDATE
            task_created_count = VALUES(task_created_count),
            task_updated_count = VALUES(task_updated_count),
            task_status_changed_count = VALUES(task_status_changed_count),
            task_completed_count = VALUES(task_completed_count),
            total_activity_count = VALUES(total_activity_count),
            first_activity_at = VALUES(first_activity_at),
            last_activity_at = VALUES(last_activity_at),
            updated_at = VALUES(updated_at)
    """)
    
    try:
        for i in range(0, total, batch_size):
            batch = data[i:i + batch_size]
            
            # 批量插入
            session.execute(insert_sql, batch)
            session.commit()
            
            inserted += len(batch)
            elapsed = time.time() - start_time
            speed = inserted / elapsed if elapsed > 0 else 0
            remaining = (total - inserted) / speed if speed > 0 else 0
            
            print(f"  插入进度: {inserted:,} / {total:,} ({inserted*100/total:.1f}%) "
                  f"- 速度: {speed:.0f} 条/秒 - 剩余时间: {remaining:.0f}秒")
        
        elapsed = time.time() - start_time
        print(f"\n✅ 数据插入完成！")
        print(f"   总记录数: {total:,} 条")
        print(f"   总耗时: {elapsed:.2f} 秒")
        print(f"   平均速度: {total/elapsed:.0f} 条/秒")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ 插入失败: {str(e)}")
        raise

def verify_data(session, user_id):
    """验证数据插入情况"""
    print("\n🔍 验证数据插入情况...")
    
    # 查询总记录数
    result = session.execute(
        text("SELECT COUNT(*) FROM user_activities WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    total = result.fetchone()[0]
    print(f"  Guest用户总活跃记录: {total:,} 条")
    
    # 查询日期范围
    result = session.execute(
        text("SELECT MIN(activity_date), MAX(activity_date) FROM user_activities WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    min_date, max_date = result.fetchone()
    print(f"  日期范围: {min_date} ~ {max_date}")
    
    # 查询总活跃度
    result = session.execute(
        text("SELECT SUM(total_activity_count) FROM user_activities WHERE user_id = :user_id"),
        {"user_id": user_id}
    )
    total_activities = result.fetchone()[0]
    print(f"  总活跃次数: {total_activities:,} 次")

def main():
    """主函数"""
    # 检查命令行参数
    auto_confirm = '--yes' in sys.argv or '-y' in sys.argv
    
    print("=" * 70)
    print("🚀 Guest用户活跃度热力图测试数据生成工具")
    print("=" * 70)
    print()
    
    # 创建数据库连接
    print("📡 连接数据库...")
    engine = create_engine(DATABASE_URL, echo=False)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # 获取guest用户ID
        user_id = get_guest_user_id(session)
        print(f"✅ 找到Guest用户 (ID: {user_id})")
        
        # 检查现有数据
        result = session.execute(
            text("SELECT COUNT(*) FROM user_activities WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        existing_count = result.fetchone()[0]
        
        if existing_count > 0:
            print(f"\n⚠️  警告：Guest用户已有 {existing_count:,} 条活跃记录")
            if auto_confirm:
                print("自动确认：将覆盖现有数据")
            else:
                response = input("是否继续？这将覆盖现有数据 (y/N): ")
                if response.lower() != 'y':
                    print("已取消")
                    return
            
            # 删除现有数据
            print("🗑️  删除现有数据...")
            session.execute(
                text("DELETE FROM user_activities WHERE user_id = :user_id"),
                {"user_id": user_id}
            )
            session.commit()
            print("✅ 已删除现有数据")
        
        # 生成数据（参数是目标总活跃次数，实际生成730条记录）
        data = generate_activity_data(user_id, total_records=1000000)
        
        # 批量插入
        batch_insert_data(session, data, batch_size=10000)
        
        # 验证数据
        verify_data(session, user_id)
        
        print("\n" + "=" * 70)
        print("✅ 完成！现在可以使用Playwright测试热力图性能了")
        print("   API端点: http://localhost:50110/api/v1/dashboard/activity-heatmap")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == '__main__':
    main()
