-- 为API Tokens表添加加密和用户关联字段

-- 添加用户关联字段
ALTER TABLE api_tokens 
ADD COLUMN user_id INT COMMENT '用户ID';

-- 添加加密token字段
ALTER TABLE api_tokens 
ADD COLUMN token_encrypted TEXT COMMENT '加密的Token值';

-- 添加外键约束
ALTER TABLE api_tokens 
ADD CONSTRAINT fk_api_tokens_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 创建用户ID索引
CREATE INDEX idx_api_tokens_user_id ON api_tokens(user_id);

-- 注意：对于现有的token，token_encrypted字段将为NULL
-- 这些token将无法被reveal，但仍然可以正常使用
