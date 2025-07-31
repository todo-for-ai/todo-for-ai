-- 添加token加密字段的数据库迁移
-- 执行时间: 2025-07-31

-- 为api_tokens表添加token_encrypted字段
ALTER TABLE api_tokens 
ADD COLUMN token_encrypted TEXT COMMENT '加密的Token值';

-- 注意：由于现有的token只有哈希值，无法恢复原始token
-- 因此现有的token将无法使用新的查看功能
-- 用户需要重新创建token来使用新功能

-- 创建索引以提高查询性能
CREATE INDEX idx_api_tokens_encrypted ON api_tokens(token_encrypted(100));

-- 添加注释
ALTER TABLE api_tokens MODIFY COLUMN token_encrypted TEXT COMMENT '加密的Token值（用于支持查看完整token）';
