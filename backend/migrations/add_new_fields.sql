-- 数据库结构调整 - 添加新字段
-- 执行时间: 2024-12-19

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
SET creator_type = 'human', 
    creator_identifier = created_by 
WHERE creator_type IS NULL;

-- 创建索引以提高查询性能
CREATE INDEX idx_projects_last_activity ON projects(last_activity_at);
CREATE INDEX idx_projects_status_activity ON projects(status, last_activity_at);
CREATE INDEX idx_tasks_creator_type ON tasks(creator_type);
CREATE INDEX idx_tasks_is_ai_task ON tasks(is_ai_task);
CREATE INDEX idx_tasks_feedback_at ON tasks(feedback_at);

-- 添加注释
ALTER TABLE projects MODIFY COLUMN github_url VARCHAR(500) COMMENT 'GitHub仓库链接';
ALTER TABLE projects MODIFY COLUMN project_context TEXT COMMENT '项目级别的上下文信息';
ALTER TABLE projects MODIFY COLUMN last_activity_at DATETIME COMMENT '最后活动时间';

ALTER TABLE tasks MODIFY COLUMN related_files JSON COMMENT '任务相关的文件列表 (JSON数组)';
ALTER TABLE tasks MODIFY COLUMN is_ai_task BOOLEAN DEFAULT TRUE COMMENT '是否是分配给AI的任务';
ALTER TABLE tasks MODIFY COLUMN creator_type VARCHAR(20) DEFAULT 'human' COMMENT '创建者类型: human, ai';
ALTER TABLE tasks MODIFY COLUMN creator_identifier VARCHAR(100) COMMENT '创建者标识符 (AI的标识或用户ID)';
ALTER TABLE tasks MODIFY COLUMN feedback_content TEXT COMMENT '任务反馈内容';
ALTER TABLE tasks MODIFY COLUMN feedback_at DATETIME COMMENT '反馈时间';
