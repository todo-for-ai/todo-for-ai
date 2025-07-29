-- 删除上下文规则表的 rule_type 列
-- 这个迁移脚本用于删除不需要的规则类型字段

-- 删除 rule_type 列
ALTER TABLE context_rules DROP COLUMN rule_type;

-- 验证列已被删除
DESCRIBE context_rules;
