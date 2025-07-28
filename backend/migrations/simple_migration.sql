-- 简单的数据库迁移脚本

-- 为项目表添加新字段
ALTER TABLE projects
ADD COLUMN github_url VARCHAR(500) COMMENT 'GitHub仓库链接',
ADD COLUMN project_context TEXT COMMENT '项目级别的上下文信息',
ADD COLUMN last_activity_at DATETIME COMMENT '最后活动时间';

-- 为任务表添加新字段
ALTER TABLE tasks
ADD COLUMN related_files JSON COMMENT '任务相关的文件列表 (JSON数组)',
ADD COLUMN is_ai_task BOOLEAN DEFAULT TRUE COMMENT '是否是分配给AI的任务',
ADD COLUMN creator_type VARCHAR(20) DEFAULT 'human' COMMENT '创建者类型: human, ai',
ADD COLUMN creator_identifier VARCHAR(100) COMMENT '创建者标识符 (AI的标识或用户ID)',
ADD COLUMN feedback_content TEXT COMMENT '任务反馈内容',
ADD COLUMN feedback_at DATETIME COMMENT '反馈时间';

-- 更新现有项目的最后活动时间
UPDATE projects 
SET last_activity_at = updated_at 
WHERE last_activity_at IS NULL;

-- 更新现有任务的创建者信息
UPDATE tasks 
SET creator_type = 'human'
WHERE creator_type IS NULL;
