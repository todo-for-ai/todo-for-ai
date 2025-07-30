-- 创建API Token表
-- 用于存储用户的API Token，支持MCP认证

CREATE TABLE IF NOT EXISTS `api_tokens` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` INT NOT NULL COMMENT '用户ID',
  `token_name` VARCHAR(100) NOT NULL COMMENT 'Token名称',
  `token_hash` VARCHAR(255) NOT NULL COMMENT 'Token哈希值（SHA256）',
  `token_prefix` VARCHAR(20) NOT NULL COMMENT 'Token前缀（用于显示）',
  `permissions` JSON COMMENT 'Token权限配置',
  `last_used_at` DATETIME NULL COMMENT '最后使用时间',
  `expires_at` DATETIME NULL COMMENT '过期时间（NULL表示永不过期）',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否激活',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token_hash` (`token_hash`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_token_prefix` (`token_prefix`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_expires_at` (`expires_at`),
  
  CONSTRAINT `fk_api_tokens_user_id` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API Token表';

-- 插入示例数据（可选）
-- INSERT INTO `api_tokens` (`user_id`, `token_name`, `token_hash`, `token_prefix`, `permissions`) 
-- VALUES (1, 'MCP Client Token', SHA2('example_token_value', 256), 'tfa_', '{"read": true, "write": true}');
