"""
上下文规则模型
"""

import enum
from sqlalchemy import Column, String, Text, Enum, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .base import BaseModel


class RuleType(enum.Enum):
    """规则类型枚举"""
    SYSTEM = 'system'
    INSTRUCTION = 'instruction'
    CONSTRAINT = 'constraint'
    EXAMPLE = 'example'


class ContextRule(BaseModel):
    """上下文规则模型"""
    
    __tablename__ = 'context_rules'
    
    # 基本信息
    project_id = Column(Integer, ForeignKey('projects.id'), nullable=True, comment='项目ID (NULL表示全局规则)')
    name = Column(String(255), nullable=False, comment='规则名称')
    description = Column(Text, comment='规则描述')
    rule_type = Column(
        Enum(RuleType), 
        default=RuleType.INSTRUCTION, 
        nullable=False,
        comment='规则类型'
    )
    content = Column(Text, nullable=False, comment='规则内容')
    
    # 配置选项
    priority = Column(Integer, default=0, comment='优先级 (数字越大优先级越高)')
    is_active = Column(Boolean, default=True, comment='是否启用')
    apply_to_tasks = Column(Boolean, default=True, comment='是否应用到任务查询')
    apply_to_projects = Column(Boolean, default=False, comment='是否应用到项目查询')
    
    # 关系
    project = relationship('Project', back_populates='context_rules')
    
    def __repr__(self):
        scope = 'Global' if self.project_id is None else f'Project {self.project_id}'
        return f'<ContextRule {self.id}: {self.name} ({scope})>'
    
    def to_dict(self, include_project=False):
        """转换为字典"""
        result = super().to_dict()
        result['rule_type'] = self.rule_type.value if self.rule_type else None
        result['is_global'] = self.project_id is None
        
        if include_project and self.project:
            result['project'] = {
                'id': self.project.id,
                'name': self.project.name,
                'color': self.project.color
            }
        
        return result
    
    @classmethod
    def get_global_rules(cls, rule_type=None, active_only=True):
        """获取全局规则"""
        query = cls.query.filter_by(project_id=None)
        
        if active_only:
            query = query.filter_by(is_active=True)
        if rule_type:
            query = query.filter_by(rule_type=rule_type)
        
        return query.order_by(cls.priority.desc(), cls.created_at.asc()).all()
    
    @classmethod
    def get_project_rules(cls, project_id, rule_type=None, active_only=True):
        """获取项目规则"""
        query = cls.query.filter_by(project_id=project_id)
        
        if active_only:
            query = query.filter_by(is_active=True)
        if rule_type:
            query = query.filter_by(rule_type=rule_type)
        
        return query.order_by(cls.priority.desc(), cls.created_at.asc()).all()
    
    @classmethod
    def get_applicable_rules(cls, project_id=None, for_tasks=True, for_projects=False):
        """获取适用的规则（全局 + 项目级别）"""
        rules = []
        
        # 获取全局规则
        global_query = cls.query.filter_by(project_id=None, is_active=True)
        if for_tasks:
            global_query = global_query.filter_by(apply_to_tasks=True)
        if for_projects:
            global_query = global_query.filter_by(apply_to_projects=True)
        
        rules.extend(global_query.all())
        
        # 获取项目规则
        if project_id:
            project_query = cls.query.filter_by(project_id=project_id, is_active=True)
            if for_tasks:
                project_query = project_query.filter_by(apply_to_tasks=True)
            if for_projects:
                project_query = project_query.filter_by(apply_to_projects=True)
            
            rules.extend(project_query.all())
        
        # 按优先级排序
        return sorted(rules, key=lambda r: (r.priority, r.created_at), reverse=True)
    
    @classmethod
    def build_context_string(cls, project_id=None, for_tasks=True, for_projects=False):
        """构建上下文字符串"""
        rules = cls.get_applicable_rules(project_id, for_tasks, for_projects)
        
        if not rules:
            return ""
        
        context_parts = []
        
        # 按类型分组
        rule_groups = {
            RuleType.SYSTEM: [],
            RuleType.INSTRUCTION: [],
            RuleType.CONSTRAINT: [],
            RuleType.EXAMPLE: []
        }
        
        for rule in rules:
            rule_groups[rule.rule_type].append(rule)
        
        # 构建上下文字符串
        if rule_groups[RuleType.SYSTEM]:
            context_parts.append("## 系统规则")
            for rule in rule_groups[RuleType.SYSTEM]:
                context_parts.append(f"### {rule.name}")
                context_parts.append(rule.content)
                context_parts.append("")
        
        if rule_groups[RuleType.INSTRUCTION]:
            context_parts.append("## 指令规则")
            for rule in rule_groups[RuleType.INSTRUCTION]:
                context_parts.append(f"### {rule.name}")
                context_parts.append(rule.content)
                context_parts.append("")
        
        if rule_groups[RuleType.CONSTRAINT]:
            context_parts.append("## 约束规则")
            for rule in rule_groups[RuleType.CONSTRAINT]:
                context_parts.append(f"### {rule.name}")
                context_parts.append(rule.content)
                context_parts.append("")
        
        if rule_groups[RuleType.EXAMPLE]:
            context_parts.append("## 示例")
            for rule in rule_groups[RuleType.EXAMPLE]:
                context_parts.append(f"### {rule.name}")
                context_parts.append(rule.content)
                context_parts.append("")
        
        return "\n".join(context_parts).strip()
    
    def activate(self):
        """激活规则"""
        self.is_active = True
        self.save()
    
    def deactivate(self):
        """停用规则"""
        self.is_active = False
        self.save()
    
    @property
    def is_global(self):
        """检查是否为全局规则"""
        return self.project_id is None
    
    @property
    def scope_name(self):
        """获取规则作用域名称"""
        if self.is_global:
            return "全局"
        elif self.project:
            return f"项目: {self.project.name}"
        else:
            return f"项目 ID: {self.project_id}"
