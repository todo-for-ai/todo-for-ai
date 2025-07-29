-- Todo for AI - 数据库初始化脚本
-- 创建数据库和所有表结构

-- 创建数据库
CREATE DATABASE IF NOT EXISTS todo_for_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE todo_for_ai;

-- 创建项目表
CREATE TABLE IF NOT EXISTS projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT '项目名称',
    description TEXT COMMENT '项目描述',
    color VARCHAR(7) DEFAULT '#1890ff' COMMENT '项目颜色 (HEX)',
    status ENUM('active', 'archived', 'deleted') DEFAULT 'active' COMMENT '项目状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(100) COMMENT '创建者',
    
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目表';

-- 创建任务表
CREATE TABLE IF NOT EXISTS tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL COMMENT '所属项目ID',
    title VARCHAR(500) NOT NULL COMMENT '任务标题',
    description TEXT COMMENT '任务简短描述',
    content LONGTEXT COMMENT '任务详细内容 (Markdown)',
    status ENUM('todo', 'in_progress', 'review', 'done', 'cancelled') DEFAULT 'todo' COMMENT '任务状态',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' COMMENT '任务优先级',
    tags JSON COMMENT '任务标签 (JSON数组)',
    assignee VARCHAR(100) COMMENT '任务分配给的AI或用户',
    due_date DATETIME COMMENT '截止时间',
    estimated_hours DECIMAL(5,2) COMMENT '预估工时',
    completion_rate INT DEFAULT 0 COMMENT '完成百分比 (0-100)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    completed_at TIMESTAMP NULL COMMENT '完成时间',
    created_by VARCHAR(100) COMMENT '创建者',
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_assignee (assignee),
    INDEX idx_due_date (due_date),
    INDEX idx_created_at (created_at),
    FULLTEXT idx_content (title, description, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务表';

-- 创建上下文规则表
CREATE TABLE IF NOT EXISTS context_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NULL COMMENT '项目ID (NULL表示全局规则)',
    name VARCHAR(255) NOT NULL COMMENT '规则名称',
    description TEXT COMMENT '规则描述',
    rule_type ENUM('system', 'instruction', 'constraint', 'example') DEFAULT 'instruction' COMMENT '规则类型',
    content LONGTEXT NOT NULL COMMENT '规则内容',
    priority INT DEFAULT 0 COMMENT '优先级 (数字越大优先级越高)',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    apply_to_tasks BOOLEAN DEFAULT TRUE COMMENT '是否应用到任务查询',
    apply_to_projects BOOLEAN DEFAULT FALSE COMMENT '是否应用到项目查询',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(100) COMMENT '创建者',
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_rule_type (rule_type),
    INDEX idx_priority (priority),
    INDEX idx_is_active (is_active),
    INDEX idx_apply_to_tasks (apply_to_tasks),
    INDEX idx_apply_to_projects (apply_to_projects)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='上下文规则表';

-- 创建任务历史表
CREATE TABLE IF NOT EXISTS task_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL COMMENT '任务ID',
    action ENUM('created', 'updated', 'status_changed', 'assigned', 'completed', 'deleted') NOT NULL COMMENT '操作类型',
    field_name VARCHAR(100) COMMENT '变更字段名',
    old_value TEXT COMMENT '旧值',
    new_value TEXT COMMENT '新值',
    changed_by VARCHAR(100) COMMENT '操作者',
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    comment TEXT COMMENT '变更说明',
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id),
    INDEX idx_action (action),
    INDEX idx_changed_at (changed_at),
    INDEX idx_changed_by (changed_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务历史表';

-- 创建附件表
CREATE TABLE IF NOT EXISTS attachments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL COMMENT '任务ID',
    filename VARCHAR(255) NOT NULL COMMENT '文件名',
    original_filename VARCHAR(255) NOT NULL COMMENT '原始文件名',
    file_path VARCHAR(500) NOT NULL COMMENT '文件路径',
    file_size BIGINT NOT NULL COMMENT '文件大小 (字节)',
    mime_type VARCHAR(100) COMMENT 'MIME类型',
    is_image BOOLEAN DEFAULT FALSE COMMENT '是否为图片',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
    uploaded_by VARCHAR(100) COMMENT '上传者',
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id),
    INDEX idx_is_image (is_image),
    INDEX idx_uploaded_at (uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='附件表';

-- 显示创建的表
SHOW TABLES;

-- 显示表结构
DESCRIBE projects;
DESCRIBE tasks;
DESCRIBE context_rules;
DESCRIBE task_history;
DESCRIBE attachments;
