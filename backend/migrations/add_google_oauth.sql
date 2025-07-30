-- 添加Google OAuth支持的数据库迁移
-- 为用户表添加google_id字段

ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE NULL COMMENT 'Google用户ID';

-- 创建索引以提高查询性能
CREATE INDEX idx_users_google_id ON users(google_id);

-- 更新注释说明OAuth字段的用途
ALTER TABLE users MODIFY COLUMN github_id VARCHAR(255) UNIQUE NULL COMMENT 'GitHub用户ID';
ALTER TABLE users MODIFY COLUMN provider VARCHAR(50) COMMENT '认证提供商 (github, google等)';
