#!/usr/bin/env python3
"""
数据库初始化脚本

使用 SQLAlchemy 创建所有表结构
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from flask import Flask
from models import db, Project, Task, ContextRule, TaskHistory, Attachment
from app.config import config


def create_app():
    """创建 Flask 应用"""
    app = Flask(__name__)
    app.config.from_object(config['development'])
    
    # 初始化数据库
    db.init_app(app)
    
    return app


def init_database():
    """初始化数据库"""
    app = create_app()
    
    with app.app_context():
        try:
            print("🗄️ 开始初始化数据库...")
            
            # 创建所有表
            print("创建数据库表...")
            db.create_all()
            
            print("✅ 数据库表创建成功！")
            
            # 显示创建的表
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"📋 创建的表: {', '.join(tables)}")
            
            return True
            
        except Exception as e:
            print(f"❌ 数据库初始化失败: {e}")
            return False


def drop_all_tables():
    """删除所有表（谨慎使用）"""
    app = create_app()
    
    with app.app_context():
        try:
            print("⚠️ 删除所有数据库表...")
            db.drop_all()
            print("✅ 所有表已删除")
            return True
        except Exception as e:
            print(f"❌ 删除表失败: {e}")
            return False


def reset_database():
    """重置数据库（删除并重新创建）"""
    print("🔄 重置数据库...")
    if drop_all_tables():
        return init_database()
    return False


def check_database_connection():
    """检查数据库连接"""
    app = create_app()
    
    with app.app_context():
        try:
            # 尝试执行简单查询
            with db.engine.connect() as connection:
                connection.execute(db.text("SELECT 1"))
            print("✅ 数据库连接正常")
            return True
        except Exception as e:
            print(f"❌ 数据库连接失败: {e}")
            print("请检查:")
            print("1. MySQL 服务是否运行")
            print("2. 数据库配置是否正确")
            print("3. 数据库用户权限是否足够")
            return False


def show_database_info():
    """显示数据库信息"""
    app = create_app()
    
    with app.app_context():
        try:
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            print("📊 数据库信息:")
            print(f"数据库引擎: {db.engine.name}")
            print(f"数据库URL: {app.config['SQLALCHEMY_DATABASE_URI']}")
            print(f"表数量: {len(tables)}")
            
            if tables:
                print("📋 数据库表:")
                for table in tables:
                    columns = inspector.get_columns(table)
                    print(f"  - {table} ({len(columns)} 列)")
            else:
                print("📋 数据库中没有表")
                
        except Exception as e:
            print(f"❌ 获取数据库信息失败: {e}")


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法:")
        print("  python init_db.py init     - 初始化数据库")
        print("  python init_db.py reset    - 重置数据库")
        print("  python init_db.py check    - 检查数据库连接")
        print("  python init_db.py info     - 显示数据库信息")
        print("  python init_db.py drop     - 删除所有表")
        return
    
    command = sys.argv[1].lower()
    
    if command == 'init':
        if check_database_connection():
            init_database()
    elif command == 'reset':
        if check_database_connection():
            confirm = input("⚠️ 这将删除所有数据！确认重置数据库？(y/N): ")
            if confirm.lower() == 'y':
                reset_database()
            else:
                print("操作已取消")
    elif command == 'check':
        check_database_connection()
    elif command == 'info':
        show_database_info()
    elif command == 'drop':
        confirm = input("⚠️ 这将删除所有表和数据！确认删除？(y/N): ")
        if confirm.lower() == 'y':
            drop_all_tables()
        else:
            print("操作已取消")
    else:
        print(f"未知命令: {command}")


if __name__ == '__main__':
    main()
