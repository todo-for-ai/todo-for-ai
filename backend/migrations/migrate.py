#!/usr/bin/env python3
"""
数据库迁移管理脚本

支持版本化的数据库迁移，包括：
- 创建迁移文件
- 执行迁移
- 回滚迁移
- 查看迁移状态
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from flask import Flask
from models import db
from app.config import config


class MigrationManager:
    """迁移管理器"""
    
    def __init__(self, app):
        self.app = app
        self.migrations_dir = Path(__file__).parent / 'versions'
        self.migrations_dir.mkdir(exist_ok=True)
        self.migration_table = 'schema_migrations'
        
    def init_migration_table(self):
        """初始化迁移记录表"""
        with self.app.app_context():
            try:
                with db.engine.connect() as connection:
                    connection.execute(db.text(f"""
                        CREATE TABLE IF NOT EXISTS {self.migration_table} (
                            version VARCHAR(255) PRIMARY KEY,
                            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            description TEXT
                        )
                    """))
                    connection.commit()
                print(f"✅ 迁移记录表 {self.migration_table} 已准备就绪")
            except Exception as e:
                print(f"❌ 创建迁移记录表失败: {e}")
                return False
        return True
    
    def get_applied_migrations(self):
        """获取已应用的迁移"""
        with self.app.app_context():
            try:
                with db.engine.connect() as connection:
                    result = connection.execute(db.text(f"""
                        SELECT version, applied_at, description 
                        FROM {self.migration_table} 
                        ORDER BY version
                    """))
                    return [dict(row._mapping) for row in result]
            except Exception:
                return []
    
    def get_pending_migrations(self):
        """获取待执行的迁移"""
        applied = {m['version'] for m in self.get_applied_migrations()}
        all_migrations = []
        
        for file_path in sorted(self.migrations_dir.glob('*.py')):
            if file_path.name.startswith('__'):
                continue
            version = file_path.stem
            if version not in applied:
                all_migrations.append({
                    'version': version,
                    'file_path': file_path,
                    'description': self._get_migration_description(file_path)
                })
        
        return all_migrations
    
    def _get_migration_description(self, file_path):
        """从迁移文件中提取描述"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # 查找描述注释
                for line in content.split('\n'):
                    if line.strip().startswith('"""') and 'description:' in line.lower():
                        return line.strip().replace('"""', '').replace('description:', '').strip()
                    elif line.strip().startswith('#') and 'description:' in line.lower():
                        return line.strip().replace('#', '').replace('description:', '').strip()
                return "No description"
        except Exception:
            return "Unknown"
    
    def create_migration(self, name, description=""):
        """创建新的迁移文件"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        version = f"{timestamp}_{name}"
        file_path = self.migrations_dir / f"{version}.py"
        
        template = f'''"""
Migration: {name}
Description: {description}
Created: {datetime.now().isoformat()}
"""

def upgrade(connection):
    """执行迁移"""
    # 在这里添加你的迁移代码
    # 例如:
    # connection.execute("""
    #     ALTER TABLE projects ADD COLUMN new_field VARCHAR(255);
    # """)
    pass


def downgrade(connection):
    """回滚迁移"""
    # 在这里添加回滚代码
    # 例如:
    # connection.execute("""
    #     ALTER TABLE projects DROP COLUMN new_field;
    # """)
    pass
'''
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(template)
        
        print(f"✅ 创建迁移文件: {file_path}")
        return version
    
    def apply_migration(self, version):
        """应用单个迁移"""
        file_path = self.migrations_dir / f"{version}.py"
        if not file_path.exists():
            print(f"❌ 迁移文件不存在: {file_path}")
            return False
        
        try:
            # 动态导入迁移模块
            spec = __import__(f"migrations.versions.{version}", fromlist=['upgrade'])
            
            with self.app.app_context():
                with db.engine.connect() as connection:
                    # 执行迁移
                    spec.upgrade(connection)
                    
                    # 记录迁移
                    description = self._get_migration_description(file_path)
                    connection.execute(db.text(f"""
                        INSERT INTO {self.migration_table} (version, description)
                        VALUES (:version, :description)
                    """), {"version": version, "description": description})
                    
                    connection.commit()
            
            print(f"✅ 迁移 {version} 应用成功")
            return True
            
        except Exception as e:
            print(f"❌ 迁移 {version} 应用失败: {e}")
            return False
    
    def rollback_migration(self, version):
        """回滚单个迁移"""
        file_path = self.migrations_dir / f"{version}.py"
        if not file_path.exists():
            print(f"❌ 迁移文件不存在: {file_path}")
            return False
        
        try:
            # 动态导入迁移模块
            spec = __import__(f"migrations.versions.{version}", fromlist=['downgrade'])
            
            with self.app.app_context():
                with db.engine.connect() as connection:
                    # 执行回滚
                    spec.downgrade(connection)
                    
                    # 删除迁移记录
                    connection.execute(db.text(f"""
                        DELETE FROM {self.migration_table} WHERE version = :version
                    """), {"version": version})
                    
                    connection.commit()
            
            print(f"✅ 迁移 {version} 回滚成功")
            return True
            
        except Exception as e:
            print(f"❌ 迁移 {version} 回滚失败: {e}")
            return False
    
    def migrate_up(self):
        """应用所有待执行的迁移"""
        pending = self.get_pending_migrations()
        if not pending:
            print("✅ 没有待执行的迁移")
            return True
        
        print(f"📋 发现 {len(pending)} 个待执行的迁移:")
        for migration in pending:
            print(f"  - {migration['version']}: {migration['description']}")
        
        success_count = 0
        for migration in pending:
            if self.apply_migration(migration['version']):
                success_count += 1
            else:
                break
        
        print(f"✅ 成功应用 {success_count}/{len(pending)} 个迁移")
        return success_count == len(pending)
    
    def show_status(self):
        """显示迁移状态"""
        applied = self.get_applied_migrations()
        pending = self.get_pending_migrations()
        
        print("📊 数据库迁移状态:")
        print(f"已应用迁移: {len(applied)}")
        print(f"待执行迁移: {len(pending)}")
        print()
        
        if applied:
            print("✅ 已应用的迁移:")
            for migration in applied:
                print(f"  - {migration['version']}: {migration['description']}")
                print(f"    应用时间: {migration['applied_at']}")
            print()
        
        if pending:
            print("⏳ 待执行的迁移:")
            for migration in pending:
                print(f"  - {migration['version']}: {migration['description']}")
            print()


def create_app():
    """创建 Flask 应用"""
    app = Flask(__name__)
    app.config.from_object(config['development'])
    db.init_app(app)
    return app


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法:")
        print("  python migrate.py init                    - 初始化迁移系统")
        print("  python migrate.py create <name> [desc]    - 创建新迁移")
        print("  python migrate.py up                      - 应用所有待执行迁移")
        print("  python migrate.py down <version>          - 回滚指定迁移")
        print("  python migrate.py status                  - 显示迁移状态")
        return
    
    app = create_app()
    manager = MigrationManager(app)
    command = sys.argv[1].lower()
    
    if command == 'init':
        manager.init_migration_table()
    elif command == 'create':
        if len(sys.argv) < 3:
            print("❌ 请提供迁移名称")
            return
        name = sys.argv[2]
        description = sys.argv[3] if len(sys.argv) > 3 else ""
        manager.create_migration(name, description)
    elif command == 'up':
        manager.init_migration_table()
        manager.migrate_up()
    elif command == 'down':
        if len(sys.argv) < 3:
            print("❌ 请提供要回滚的迁移版本")
            return
        version = sys.argv[2]
        manager.rollback_migration(version)
    elif command == 'status':
        manager.init_migration_table()
        manager.show_status()
    else:
        print(f"❌ 未知命令: {command}")


if __name__ == '__main__':
    main()
