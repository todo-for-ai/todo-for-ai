"""
添加用户系统的数据库迁移脚本

这个脚本会：
1. 创建users表
2. 为projects表添加owner_id字段
3. 为tasks表添加assignee_id和creator_id字段
4. 为api_tokens表添加user_id字段
5. 创建必要的索引和外键约束
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers
revision = 'add_user_system'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """升级数据库结构"""
    
    # 1. 创建users表
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False, comment='主键ID'),
        sa.Column('created_at', sa.DateTime(), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(), nullable=False, comment='更新时间'),
        sa.Column('created_by', sa.String(100), comment='创建者'),
        
        # Auth0相关字段
        sa.Column('auth0_user_id', sa.String(255), nullable=False, comment='Auth0用户ID'),
        sa.Column('email', sa.String(255), nullable=False, comment='用户邮箱'),
        sa.Column('email_verified', sa.Boolean(), default=False, comment='邮箱是否已验证'),
        
        # 基本信息
        sa.Column('username', sa.String(100), comment='用户名'),
        sa.Column('nickname', sa.String(100), comment='昵称'),
        sa.Column('full_name', sa.String(200), comment='全名'),
        sa.Column('avatar_url', sa.String(500), comment='头像URL'),
        sa.Column('bio', sa.Text(), comment='个人简介'),
        
        # 认证信息
        sa.Column('provider', sa.String(50), comment='认证提供商'),
        sa.Column('provider_user_id', sa.String(255), comment='提供商用户ID'),
        
        # 权限和状态
        sa.Column('role', sa.Enum('admin', 'user', 'viewer', name='userrole'), 
                 default='user', nullable=False, comment='用户角色'),
        sa.Column('status', sa.Enum('active', 'inactive', 'suspended', name='userstatus'), 
                 default='active', nullable=False, comment='用户状态'),
        
        # 时间信息
        sa.Column('last_login_at', sa.DateTime(), comment='最后登录时间'),
        sa.Column('last_active_at', sa.DateTime(), comment='最后活动时间'),
        
        # 设置和偏好
        sa.Column('preferences', sa.JSON(), comment='用户偏好设置'),
        sa.Column('timezone', sa.String(50), default='UTC', comment='时区'),
        sa.Column('locale', sa.String(10), default='zh-CN', comment='语言区域'),
        
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('auth0_user_id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username'),
        comment='用户表'
    )
    
    # 2. 为projects表添加owner_id字段
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.add_column(sa.Column('owner_id', sa.Integer(), nullable=True, comment='项目所有者ID'))
        batch_op.create_foreign_key('fk_projects_owner', 'users', ['owner_id'], ['id'])
        batch_op.create_index('ix_projects_owner_id', ['owner_id'])
    
    # 3. 为tasks表添加用户关联字段
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('assignee_id', sa.Integer(), nullable=True, comment='任务分配者ID'))
        batch_op.add_column(sa.Column('creator_id', sa.Integer(), nullable=True, comment='任务创建者ID'))
        batch_op.create_foreign_key('fk_tasks_assignee', 'users', ['assignee_id'], ['id'])
        batch_op.create_foreign_key('fk_tasks_creator', 'users', ['creator_id'], ['id'])
        batch_op.create_index('ix_tasks_assignee_id', ['assignee_id'])
        batch_op.create_index('ix_tasks_creator_id', ['creator_id'])
    
    # 4. 为api_tokens表添加user_id字段
    with op.batch_alter_table('api_tokens', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True, comment='Token所有者ID'))
        batch_op.create_foreign_key('fk_api_tokens_user', 'users', ['user_id'], ['id'])
        batch_op.create_index('ix_api_tokens_user_id', ['user_id'])
    
    # 5. 创建额外的索引
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_status', 'users', ['status'])
    op.create_index('ix_users_role', 'users', ['role'])
    op.create_index('ix_users_last_active_at', 'users', ['last_active_at'])


def downgrade():
    """降级数据库结构"""
    
    # 删除索引
    op.drop_index('ix_users_last_active_at', table_name='users')
    op.drop_index('ix_users_role', table_name='users')
    op.drop_index('ix_users_status', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    
    # 删除api_tokens表的用户关联
    with op.batch_alter_table('api_tokens', schema=None) as batch_op:
        batch_op.drop_index('ix_api_tokens_user_id')
        batch_op.drop_constraint('fk_api_tokens_user', type_='foreignkey')
        batch_op.drop_column('user_id')
    
    # 删除tasks表的用户关联
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_index('ix_tasks_creator_id')
        batch_op.drop_index('ix_tasks_assignee_id')
        batch_op.drop_constraint('fk_tasks_creator', type_='foreignkey')
        batch_op.drop_constraint('fk_tasks_assignee', type_='foreignkey')
        batch_op.drop_column('creator_id')
        batch_op.drop_column('assignee_id')
    
    # 删除projects表的用户关联
    with op.batch_alter_table('projects', schema=None) as batch_op:
        batch_op.drop_index('ix_projects_owner_id')
        batch_op.drop_constraint('fk_projects_owner', type_='foreignkey')
        batch_op.drop_column('owner_id')
    
    # 删除users表
    op.drop_table('users')
    
    # 删除枚举类型
    op.execute("DROP TYPE IF EXISTS userstatus")
    op.execute("DROP TYPE IF EXISTS userrole")
