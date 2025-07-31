"""
数据库迁移脚本：为上下文规则添加用户隔离和公开/私有字段
"""

import sys
import os

# 添加backend目录到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text
from app.config import config


def upgrade():
    """升级数据库"""
    print("开始升级数据库...")

    # 获取数据库配置
    config_obj = config['development']
    engine = create_engine(config_obj.SQLALCHEMY_DATABASE_URI)

    with engine.connect() as conn:
        # 1. 添加新字段
        print("1. 添加新字段...")

        # 检查字段是否已存在
        try:
            # 添加user_id字段（暂时允许NULL）
            conn.execute(text("""
                ALTER TABLE context_rules
                ADD COLUMN user_id INTEGER
            """))
            print("user_id字段添加成功")
        except Exception as e:
            print(f"user_id字段可能已存在: {e}")

        try:
            # 添加is_public字段
            conn.execute(text("""
                ALTER TABLE context_rules
                ADD COLUMN is_public BOOLEAN DEFAULT FALSE
            """))
            print("is_public字段添加成功")
        except Exception as e:
            print(f"is_public字段可能已存在: {e}")

        try:
            # 添加usage_count字段
            conn.execute(text("""
                ALTER TABLE context_rules
                ADD COLUMN usage_count INTEGER DEFAULT 0
            """))
            print("usage_count字段添加成功")
        except Exception as e:
            print(f"usage_count字段可能已存在: {e}")

        print("新字段添加完成")

        # 2. 数据迁移：将现有规则分配给CC11001100用户
        print("2. 开始数据迁移...")

        # 查找CC11001100用户
        result = conn.execute(text("SELECT id, username FROM users WHERE username = 'CC11001100' LIMIT 1"))
        cc_user = result.fetchone()

        if not cc_user:
            # 如果没有找到CC11001100用户，查找第一个用户
            result = conn.execute(text("SELECT id, username FROM users LIMIT 1"))
            cc_user = result.fetchone()

            if not cc_user:
                print("警告：没有找到任何用户，创建默认用户")
                # 创建默认用户
                conn.execute(text("""
                    INSERT INTO users (username, email, full_name, provider, created_by, created_at, updated_at)
                    VALUES ('CC11001100', 'cc11001100@example.com', 'CC11001100', 'system', 'migration', NOW(), NOW())
                """))
                result = conn.execute(text("SELECT id, username FROM users WHERE username = 'CC11001100' LIMIT 1"))
                cc_user = result.fetchone()

        print(f"找到用户：{cc_user[1]} (ID: {cc_user[0]})")

        # 更新所有现有规则的user_id
        conn.execute(text(f"""
            UPDATE context_rules
            SET user_id = {cc_user[0]}
            WHERE user_id IS NULL
        """))

        print("现有规则已分配给用户")

        # 3. 设置user_id为NOT NULL
        print("3. 设置user_id为必填字段...")

        try:
            # 添加外键约束
            conn.execute(text("""
                ALTER TABLE context_rules
                ADD CONSTRAINT fk_context_rules_user_id
                FOREIGN KEY (user_id) REFERENCES users(id)
            """))
            print("外键约束添加成功")
        except Exception as e:
            print(f"外键约束可能已存在: {e}")

        try:
            # 设置user_id为NOT NULL
            conn.execute(text("""
                ALTER TABLE context_rules
                ALTER COLUMN user_id SET NOT NULL
            """))
            print("user_id设置为NOT NULL成功")
        except Exception as e:
            print(f"user_id可能已经是NOT NULL: {e}")

        # 提交事务
        conn.commit()
        print("数据库升级完成！")


def downgrade():
    """降级数据库"""
    print("开始降级数据库...")

    # 获取数据库配置
    config_obj = config['development']
    engine = create_engine(config_obj.SQLALCHEMY_DATABASE_URI)

    with engine.connect() as conn:
        # 删除外键约束
        try:
            conn.execute(text("""
                ALTER TABLE context_rules
                DROP CONSTRAINT fk_context_rules_user_id
            """))
            print("外键约束删除成功")
        except Exception as e:
            print(f"外键约束删除失败或不存在: {e}")

        # 删除新添加的字段
        try:
            conn.execute(text("""
                ALTER TABLE context_rules
                DROP COLUMN user_id
            """))
            print("user_id字段删除成功")
        except Exception as e:
            print(f"user_id字段删除失败: {e}")

        try:
            conn.execute(text("""
                ALTER TABLE context_rules
                DROP COLUMN is_public
            """))
            print("is_public字段删除成功")
        except Exception as e:
            print(f"is_public字段删除失败: {e}")

        try:
            conn.execute(text("""
                ALTER TABLE context_rules
                DROP COLUMN usage_count
            """))
            print("usage_count字段删除成功")
        except Exception as e:
            print(f"usage_count字段删除失败: {e}")

        # 提交事务
        conn.commit()
        print("数据库降级完成！")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("用法: python add_context_rule_user_fields.py [upgrade|downgrade]")
        sys.exit(1)
    
    action = sys.argv[1]
    
    if action == 'upgrade':
        upgrade()
    elif action == 'downgrade':
        downgrade()
    else:
        print("无效的操作，请使用 'upgrade' 或 'downgrade'")
        sys.exit(1)
