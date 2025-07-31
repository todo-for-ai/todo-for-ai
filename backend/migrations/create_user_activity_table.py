"""
数据库迁移脚本：创建用户活跃度表
"""

import sys
import os

# 添加backend目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text
from app.config import config


def upgrade():
    """升级数据库"""
    print("开始创建用户活跃度表...")

    # 获取数据库配置
    config_obj = config['development']
    engine = create_engine(config_obj.SQLALCHEMY_DATABASE_URI)

    with engine.connect() as conn:
        # 创建用户活跃度表
        print("1. 创建用户活跃度表...")
        
        try:
            conn.execute(text("""
                CREATE TABLE user_activities (
                    user_id INTEGER NOT NULL,
                    activity_date DATE NOT NULL,
                    task_created_count INTEGER DEFAULT 0 COMMENT '当天创建任务数量',
                    task_updated_count INTEGER DEFAULT 0 COMMENT '当天更新任务数量',
                    task_status_changed_count INTEGER DEFAULT 0 COMMENT '当天修改任务状态数量',
                    total_activity_count INTEGER DEFAULT 0 COMMENT '当天总活跃次数',
                    first_activity_at DATETIME COMMENT '当天首次活跃时间',
                    last_activity_at DATETIME COMMENT '当天最后活跃时间',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '记录更新时间',
                    PRIMARY KEY (user_id, activity_date),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_user_activities_user_id (user_id),
                    INDEX idx_user_activities_date (activity_date),
                    INDEX idx_user_activities_total_count (total_activity_count)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户活跃度表'
            """))
            print("用户活跃度表创建成功")
        except Exception as e:
            print(f"用户活跃度表可能已存在: {e}")

        # 提交事务
        conn.commit()
        print("数据库升级完成！")


def downgrade():
    """降级数据库"""
    print("开始删除用户活跃度表...")

    # 获取数据库配置
    config_obj = config['development']
    engine = create_engine(config_obj.SQLALCHEMY_DATABASE_URI)

    with engine.connect() as conn:
        # 删除用户活跃度表
        try:
            conn.execute(text("DROP TABLE IF EXISTS user_activities"))
            print("用户活跃度表删除成功")
        except Exception as e:
            print(f"用户活跃度表删除失败: {e}")

        # 提交事务
        conn.commit()
        print("数据库降级完成！")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'downgrade':
        downgrade()
    else:
        upgrade()
