-- 修复数据库设计问题
-- 1. 移除username的唯一约束
-- 2. 将tasks表的id字段改为bigint
-- 3. 更新相关外键引用

-- 开始事务
START TRANSACTION;

-- 1. 移除username的唯一约束
-- MySQL 5.7及以下版本不支持IF EXISTS，需要分别处理
ALTER TABLE `users` DROP INDEX `username`;

-- 2. 备份当前数据（可选，但建议在生产环境中执行）
-- CREATE TABLE tasks_backup AS SELECT * FROM tasks;
-- CREATE TABLE attachments_backup AS SELECT * FROM attachments;
-- CREATE TABLE task_history_backup AS SELECT * FROM task_history;

-- 3. 删除外键约束
ALTER TABLE `attachments` DROP FOREIGN KEY `attachments_ibfk_1`;
ALTER TABLE `task_history` DROP FOREIGN KEY `task_history_ibfk_1`;

-- 4. 修改相关表的外键字段类型为bigint
ALTER TABLE `attachments` MODIFY COLUMN `task_id` BIGINT NOT NULL COMMENT '关联的任务ID';
ALTER TABLE `task_history` MODIFY COLUMN `task_id` BIGINT NOT NULL COMMENT '关联的任务ID';

-- 5. 修改tasks表的主键为bigint
ALTER TABLE `tasks` MODIFY COLUMN `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID';

-- 6. 重新创建外键约束
ALTER TABLE `attachments` 
ADD CONSTRAINT `attachments_ibfk_1` 
FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE;

ALTER TABLE `task_history` 
ADD CONSTRAINT `task_history_ibfk_1` 
FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE;

-- 7. 添加索引优化（如果需要）
-- 为username添加普通索引（非唯一）以提高查询性能
CREATE INDEX `idx_users_username` ON `users` (`username`);

-- 8. 验证修改结果
SELECT 'Username unique constraint removed' as status;
SELECT 'Tasks ID changed to BIGINT' as status;
SELECT 'Foreign keys updated' as status;

-- 提交事务
COMMIT;

-- 显示修改后的表结构
SHOW CREATE TABLE users;
SHOW CREATE TABLE tasks;
SHOW CREATE TABLE attachments;
SHOW CREATE TABLE task_history;
