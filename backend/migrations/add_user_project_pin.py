"""
添加用户项目Pin配置表

创建时间: 2025-07-30
"""

import sqlalchemy as sa
from alembic import op


def upgrade():
    """创建用户项目Pin配置表"""
    
    # 创建用户项目Pin配置表
    op.create_table(
        'user_project_pins',
        
        # 基础字段
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False, comment='主键ID'),
        sa.Column('created_at', sa.DateTime(), nullable=False, comment='创建时间'),
        sa.Column('updated_at', sa.DateTime(), nullable=False, comment='更新时间'),
        sa.Column('created_by', sa.String(100), comment='创建者'),
        
        # 关联字段
        sa.Column('user_id', sa.Integer(), nullable=False, comment='用户ID'),
        sa.Column('project_id', sa.Integer(), nullable=False, comment='项目ID'),
        
        # Pin配置字段
        sa.Column('pin_order', sa.Integer(), nullable=False, default=0, comment='Pin顺序，数字越小越靠前'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True, comment='是否激活'),
        
        # 主键
        sa.PrimaryKeyConstraint('id'),
        
        # 外键约束
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        
        # 唯一约束：每个用户对每个项目只能有一个Pin配置
        sa.UniqueConstraint('user_id', 'project_id', name='uq_user_project_pin'),
        
        comment='用户项目Pin配置表'
    )
    
    # 创建索引
    op.create_index('idx_user_project_pins_user_id', 'user_project_pins', ['user_id'])
    op.create_index('idx_user_project_pins_project_id', 'user_project_pins', ['project_id'])
    op.create_index('idx_user_project_pins_user_active', 'user_project_pins', ['user_id', 'is_active'])
    op.create_index('idx_user_project_pins_order', 'user_project_pins', ['user_id', 'pin_order'])


def downgrade():
    """删除用户项目Pin配置表"""
    
    # 删除索引
    op.drop_index('idx_user_project_pins_order', 'user_project_pins')
    op.drop_index('idx_user_project_pins_user_active', 'user_project_pins')
    op.drop_index('idx_user_project_pins_project_id', 'user_project_pins')
    op.drop_index('idx_user_project_pins_user_id', 'user_project_pins')
    
    # 删除表
    op.drop_table('user_project_pins')
