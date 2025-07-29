# Todo for AI - 数据库设计文档

## 概述

本文档描述了 Todo for AI 项目的数据库设计，包括表结构、字段定义、关系和约束。

## 数据库架构

### 核心实体关系

```
projects (项目)
    ├── tasks (任务) - 一对多关系
    └── context_rules (项目级上下文规则) - 一对多关系

context_rules (上下文规则)
    ├── 全局规则 (project_id = NULL)
    └── 项目规则 (project_id != NULL)

tasks (任务)
    ├── 属于项目 (project_id)
    └── 状态管理 (status, priority)
```

## 表结构设计

### 1. projects (项目表)

存储项目基本信息和配置。

```sql
CREATE TABLE projects (
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
```

### 2. tasks (任务表)

存储任务详细信息，支持 Markdown 内容。

```sql
CREATE TABLE tasks (
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
```

### 3. context_rules (上下文规则表)

存储全局和项目级别的上下文规则，用于AI查询时自动拼接。

```sql
CREATE TABLE context_rules (
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
```

### 4. task_history (任务历史表)

记录任务的变更历史，用于审计和版本控制。

```sql
CREATE TABLE task_history (
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
```

### 5. attachments (附件表)

存储任务相关的文件附件信息。

```sql
CREATE TABLE attachments (
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
```

## 数据字典

### 任务状态 (task.status)
- `todo`: 待办
- `in_progress`: 进行中
- `review`: 待审核
- `done`: 已完成
- `cancelled`: 已取消

### 任务优先级 (task.priority)
- `low`: 低优先级
- `medium`: 中等优先级
- `high`: 高优先级
- `urgent`: 紧急

### 项目状态 (project.status)
- `active`: 活跃
- `archived`: 已归档
- `deleted`: 已删除

### 规则类型 (context_rules.rule_type)
- `system`: 系统规则
- `instruction`: 指令规则
- `constraint`: 约束规则
- `example`: 示例规则

## 索引策略

1. **主键索引**: 所有表都有自增主键
2. **外键索引**: 所有外键字段都有索引
3. **状态索引**: 经常用于筛选的状态字段
4. **时间索引**: 创建时间、更新时间等时间字段
5. **全文索引**: 任务表的标题、描述、内容字段

## 数据完整性

1. **外键约束**: 确保数据引用完整性
2. **级联删除**: 删除项目时自动删除相关任务和规则
3. **非空约束**: 关键字段不允许为空
4. **默认值**: 为状态、优先级等字段设置合理默认值
5. **字符集**: 使用 utf8mb4 支持完整的 Unicode 字符

## 性能考虑

1. **分页查询**: 大数据量时使用 LIMIT 和 OFFSET
2. **索引优化**: 根据查询模式创建合适的索引
3. **JSON字段**: 任务标签使用 JSON 类型存储
4. **全文搜索**: 支持任务内容的全文搜索
5. **历史数据**: 任务历史表可定期归档
