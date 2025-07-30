#!/usr/bin/env python3
"""
用户系统初始化脚本

这个脚本会：
1. 创建数据库表结构
2. 创建默认管理员用户（如果不存在）
3. 迁移现有数据
"""

import os
import sys
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db, User, Project, Task, ApiToken, UserRole, UserStatus


def create_tables():
    """创建数据库表"""
    print("Creating database tables...")
    db.create_all()
    print("✓ Database tables created successfully")


def create_default_admin():
    """创建默认管理员用户"""
    print("Creating default admin user...")
    
    # 检查是否已存在管理员用户
    admin_user = User.query.filter_by(role=UserRole.ADMIN).first()
    if admin_user:
        print(f"✓ Admin user already exists: {admin_user.email}")
        return admin_user
    
    # 创建默认管理员用户
    admin_email = os.environ.get('DEFAULT_ADMIN_EMAIL', 'admin@todo-for-ai.com')
    admin_user = User(
        auth0_user_id=f'local|admin_{int(datetime.utcnow().timestamp())}',
        email=admin_email,
        email_verified=True,
        username='admin',
        nickname='Administrator',
        full_name='System Administrator',
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        created_by='system',
        last_login_at=datetime.utcnow(),
        last_active_at=datetime.utcnow(),
    )
    
    db.session.add(admin_user)
    db.session.commit()
    
    print(f"✓ Default admin user created: {admin_email}")
    return admin_user


def migrate_existing_data():
    """迁移现有数据"""
    print("Migrating existing data...")
    
    # 获取管理员用户
    admin_user = User.query.filter_by(role=UserRole.ADMIN).first()
    if not admin_user:
        print("✗ No admin user found for data migration")
        return
    
    # 迁移项目数据
    projects_updated = 0
    projects = Project.query.filter_by(owner_id=None).all()
    for project in projects:
        project.owner_id = admin_user.id
        projects_updated += 1
    
    # 迁移任务数据
    tasks_updated = 0
    tasks = Task.query.filter_by(creator_id=None).all()
    for task in tasks:
        task.creator_id = admin_user.id
        # 如果任务没有分配者，也分配给管理员
        if not task.assignee_id:
            task.assignee_id = admin_user.id
        tasks_updated += 1
    
    # 迁移API Token数据
    tokens_updated = 0
    tokens = ApiToken.query.filter_by(user_id=None).all()
    for token in tokens:
        token.user_id = admin_user.id
        tokens_updated += 1
    
    db.session.commit()
    
    print(f"✓ Migrated {projects_updated} projects")
    print(f"✓ Migrated {tasks_updated} tasks")
    print(f"✓ Migrated {tokens_updated} API tokens")


def create_sample_data():
    """创建示例数据（可选）"""
    if os.environ.get('CREATE_SAMPLE_DATA', '').lower() != 'true':
        return
    
    print("Creating sample data...")
    
    # 创建示例用户
    sample_user = User.query.filter_by(email='user@example.com').first()
    if not sample_user:
        sample_user = User(
            auth0_user_id=f'local|user_{int(datetime.utcnow().timestamp())}',
            email='user@example.com',
            email_verified=True,
            username='sampleuser',
            nickname='Sample User',
            full_name='Sample User',
            role=UserRole.USER,
            status=UserStatus.ACTIVE,
            created_by='system',
            last_login_at=datetime.utcnow(),
            last_active_at=datetime.utcnow(),
        )
        db.session.add(sample_user)
        db.session.commit()
        print("✓ Sample user created")


def verify_installation():
    """验证安装"""
    print("Verifying installation...")
    
    # 检查用户表
    user_count = User.query.count()
    admin_count = User.query.filter_by(role=UserRole.ADMIN).count()
    
    # 检查项目表
    project_count = Project.query.count()
    projects_with_owner = Project.query.filter(Project.owner_id.isnot(None)).count()
    
    # 检查任务表
    task_count = Task.query.count()
    tasks_with_creator = Task.query.filter(Task.creator_id.isnot(None)).count()
    
    print(f"✓ Users: {user_count} (Admins: {admin_count})")
    print(f"✓ Projects: {project_count} (With owner: {projects_with_owner})")
    print(f"✓ Tasks: {task_count} (With creator: {tasks_with_creator})")
    
    if admin_count == 0:
        print("✗ Warning: No admin users found!")
        return False
    
    if project_count > 0 and projects_with_owner == 0:
        print("✗ Warning: Projects exist but none have owners!")
        return False
    
    print("✓ User system installation verified successfully")
    return True


def main():
    """主函数"""
    print("=" * 50)
    print("Todo for AI - User System Initialization")
    print("=" * 50)
    
    # 创建应用上下文
    app = create_app()
    
    with app.app_context():
        try:
            # 1. 创建数据库表
            create_tables()
            
            # 2. 创建默认管理员用户
            create_default_admin()
            
            # 3. 迁移现有数据
            migrate_existing_data()
            
            # 4. 创建示例数据（可选）
            create_sample_data()
            
            # 5. 验证安装
            if verify_installation():
                print("\n" + "=" * 50)
                print("✓ User system initialization completed successfully!")
                print("=" * 50)
                
                # 显示下一步说明
                print("\nNext steps:")
                print("1. Configure Auth0 settings in environment variables")
                print("2. Start the application: python app.py")
                print("3. Access the application at http://localhost:50110")
                print("4. Login with your Auth0 account")
                
                return True
            else:
                print("\n" + "=" * 50)
                print("✗ User system initialization completed with warnings!")
                print("=" * 50)
                return False
                
        except Exception as e:
            print(f"\n✗ Error during initialization: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
