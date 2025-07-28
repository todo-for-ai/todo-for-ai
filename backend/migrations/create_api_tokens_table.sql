-- 创建API Tokens表

CREATE TABLE IF NOT EXISTS api_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT 'Token名称',
    token_hash VARCHAR(64) NOT NULL UNIQUE COMMENT 'Token哈希值',
    prefix VARCHAR(10) NOT NULL COMMENT 'Token前缀（用于识别）',
    description TEXT COMMENT 'Token描述',
    is_active BOOLEAN DEFAULT TRUE NOT NULL COMMENT '是否激活',
    expires_at DATETIME COMMENT '过期时间',
    last_used_at DATETIME COMMENT '最后使用时间',
    usage_count INT DEFAULT 0 COMMENT '使用次数',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
);

-- 创建索引
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash);
CREATE INDEX idx_api_tokens_is_active ON api_tokens(is_active);
CREATE INDEX idx_api_tokens_expires_at ON api_tokens(expires_at);
CREATE INDEX idx_api_tokens_prefix ON api_tokens(prefix);
