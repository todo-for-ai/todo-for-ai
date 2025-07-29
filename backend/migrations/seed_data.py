#!/usr/bin/env python3
"""
测试数据生成脚本

为开发和测试环境创建初始数据，包括：
- 示例项目
- 示例任务
- 示例上下文规则
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from flask import Flask
from models import db, Project, Task, ContextRule, TaskHistory, ActionType, ProjectStatus, TaskStatus, TaskPriority, RuleType
from app.config import config


def create_app():
    """创建 Flask 应用"""
    app = Flask(__name__)
    app.config.from_object(config['development'])
    db.init_app(app)
    return app


def create_sample_projects():
    """创建示例项目"""
    projects_data = [
        {
            'name': 'AI 助手开发',
            'description': '开发一个智能的AI助手系统，支持多种任务类型和上下文理解',
            'color': '#1890ff',
            'created_by': 'system'
        },
        {
            'name': '网站重构项目',
            'description': '对现有网站进行全面重构，提升用户体验和性能',
            'color': '#52c41a',
            'created_by': 'system'
        },
        {
            'name': '数据分析平台',
            'description': '构建企业级数据分析平台，支持实时数据处理和可视化',
            'color': '#722ed1',
            'created_by': 'system'
        },
        {
            'name': '移动应用开发',
            'description': '开发跨平台移动应用，支持iOS和Android',
            'color': '#fa8c16',
            'created_by': 'system'
        }
    ]
    
    projects = []
    for data in projects_data:
        project = Project.create(**data)
        projects.append(project)
        print(f"✅ 创建项目: {project.name}")
    
    db.session.commit()
    return projects


def create_sample_tasks(projects):
    """创建示例任务"""
    tasks_data = [
        # AI 助手开发项目的任务
        {
            'project_id': projects[0].id,
            'title': '设计AI助手架构',
            'description': '设计整体系统架构，包括核心模块和接口定义',
            'content': '''# AI助手架构设计

## 目标
设计一个可扩展、高性能的AI助手系统架构。

## 核心模块
1. **对话管理模块**
   - 处理用户输入
   - 维护对话上下文
   - 管理对话流程

2. **知识库模块**
   - 存储和检索知识
   - 支持向量搜索
   - 知识更新机制

3. **任务执行模块**
   - 解析用户意图
   - 执行具体任务
   - 返回执行结果

## 技术栈
- 后端：Python + FastAPI
- 数据库：PostgreSQL + Redis
- AI模型：OpenAI GPT + 本地模型
- 部署：Docker + Kubernetes

## 接口设计
- RESTful API
- WebSocket 实时通信
- GraphQL 查询接口''',
            'status': TaskStatus.IN_PROGRESS,
            'priority': TaskPriority.HIGH,
            'assignee': 'AI-Architect',
            'due_date': datetime.now() + timedelta(days=7),
            'estimated_hours': 16.0,
            'completion_rate': 60,
            'tags': ['架构', '设计', 'AI'],
            'created_by': 'system'
        },
        {
            'project_id': projects[0].id,
            'title': '实现对话管理功能',
            'description': '实现AI助手的对话管理核心功能',
            'content': '''# 对话管理功能实现

## 功能需求
- 多轮对话支持
- 上下文记忆
- 意图识别
- 实体提取

## 实现计划
1. 设计对话状态机
2. 实现上下文管理
3. 集成NLP模型
4. 添加测试用例

## 技术细节
- 使用状态机模式管理对话流程
- Redis存储对话上下文
- 集成spaCy进行NLP处理''',
            'status': TaskStatus.TODO,
            'priority': TaskPriority.MEDIUM,
            'assignee': 'AI-Developer',
            'due_date': datetime.now() + timedelta(days=14),
            'estimated_hours': 24.0,
            'tags': ['开发', '对话', 'NLP'],
            'created_by': 'system'
        },
        
        # 网站重构项目的任务
        {
            'project_id': projects[1].id,
            'title': '前端框架选型',
            'description': '评估和选择适合的前端框架',
            'content': '''# 前端框架选型

## 候选框架
1. **React**
   - 优点：生态丰富、社区活跃
   - 缺点：学习曲线陡峭

2. **Vue.js**
   - 优点：易学易用、渐进式
   - 缺点：生态相对较小

3. **Angular**
   - 优点：企业级、功能完整
   - 缺点：复杂度高

## 评估标准
- 开发效率
- 性能表现
- 团队技能匹配
- 长期维护性

## 推荐方案
基于项目需求和团队情况，推荐使用 **React + TypeScript**''',
            'status': TaskStatus.DONE,
            'priority': TaskPriority.HIGH,
            'assignee': 'Frontend-Lead',
            'due_date': datetime.now() - timedelta(days=3),
            'estimated_hours': 8.0,
            'completion_rate': 100,
            'completed_at': datetime.now() - timedelta(days=2),
            'tags': ['前端', '选型', 'React'],
            'created_by': 'system'
        },
        
        # 数据分析平台的任务
        {
            'project_id': projects[2].id,
            'title': '数据管道设计',
            'description': '设计实时数据处理管道',
            'content': '''# 数据管道设计

## 架构概述
设计一个支持实时和批处理的数据管道系统。

## 组件设计
1. **数据采集层**
   - Kafka消息队列
   - 多种数据源连接器

2. **数据处理层**
   - Apache Spark Streaming
   - 数据清洗和转换

3. **数据存储层**
   - 时序数据库（InfluxDB）
   - 分析数据库（ClickHouse）

4. **数据服务层**
   - GraphQL API
   - 缓存层（Redis）

## 性能目标
- 支持每秒10万条消息处理
- 端到端延迟小于100ms
- 99.9%可用性''',
            'status': TaskStatus.REVIEW,
            'priority': TaskPriority.URGENT,
            'assignee': 'Data-Engineer',
            'due_date': datetime.now() + timedelta(days=5),
            'estimated_hours': 32.0,
            'completion_rate': 90,
            'tags': ['数据', '架构', '实时处理'],
            'created_by': 'system'
        }
    ]
    
    tasks = []
    for data in tasks_data:
        task = Task.create(**data)
        tasks.append(task)
        print(f"✅ 创建任务: {task.title}")
    
    db.session.commit()
    return tasks


def create_sample_context_rules(projects):
    """创建示例上下文规则"""
    rules_data = [
        # 全局规则
        {
            'project_id': None,
            'name': '代码质量标准',
            'description': '全局代码质量和开发标准',
            'rule_type': RuleType.CONSTRAINT,
            'content': '''# 代码质量标准

## 通用要求
- 所有代码必须通过单元测试
- 代码覆盖率不低于80%
- 遵循PEP 8编码规范（Python）
- 使用有意义的变量和函数名
- 添加必要的注释和文档

## 提交要求
- 每次提交必须包含清晰的提交信息
- 大功能需要拆分为小的提交
- 提交前必须进行代码审查

## 安全要求
- 不得在代码中硬编码密码或密钥
- 所有用户输入必须进行验证
- 使用参数化查询防止SQL注入''',
            'priority': 10,
            'apply_to_tasks': True,
            'apply_to_projects': True,
            'created_by': 'system'
        },
        {
            'project_id': None,
            'name': 'AI助手交互规范',
            'description': '与AI助手交互时的通用规范',
            'rule_type': RuleType.INSTRUCTION,
            'content': '''# AI助手交互规范

## 任务描述要求
- 使用清晰、具体的语言描述任务
- 包含必要的背景信息和上下文
- 明确指出期望的输出格式
- 提供相关的示例或参考资料

## 沟通风格
- 保持专业和友好的语调
- 使用结构化的信息组织方式
- 及时提供反馈和确认

## 质量标准
- 确保信息的准确性和完整性
- 遵循项目的技术标准和规范
- 考虑可维护性和可扩展性''',
            'priority': 8,
            'apply_to_tasks': True,
            'created_by': 'system'
        },
        
        # 项目级规则
        {
            'project_id': projects[0].id,
            'name': 'AI项目开发规范',
            'description': 'AI助手开发项目的特定规范',
            'rule_type': RuleType.INSTRUCTION,
            'content': '''# AI项目开发规范

## 模型管理
- 使用版本控制管理模型文件
- 记录模型训练参数和数据集信息
- 建立模型性能基准测试

## 数据处理
- 确保数据隐私和安全
- 建立数据质量检查流程
- 使用标准化的数据格式

## API设计
- 遵循RESTful设计原则
- 提供详细的API文档
- 实现适当的错误处理和日志记录

## 测试策略
- 单元测试覆盖核心算法
- 集成测试验证端到端流程
- 性能测试确保响应时间要求''',
            'priority': 9,
            'apply_to_tasks': True,
            'created_by': 'system'
        },
        {
            'project_id': projects[1].id,
            'name': '前端开发规范',
            'description': '网站重构项目的前端开发规范',
            'rule_type': RuleType.CONSTRAINT,
            'content': '''# 前端开发规范

## 技术栈
- React 18 + TypeScript
- Ant Design 组件库
- React Router 路由管理
- Zustand 状态管理

## 代码组织
- 使用函数式组件和Hooks
- 组件文件使用PascalCase命名
- 工具函数使用camelCase命名
- 样式文件与组件文件同目录

## 性能要求
- 首屏加载时间不超过2秒
- 使用懒加载优化大组件
- 图片资源进行压缩和优化
- 实现适当的缓存策略

## 兼容性
- 支持Chrome、Firefox、Safari最新版本
- 支持移动端响应式设计
- 确保无障碍访问性（WCAG 2.1）''',
            'priority': 8,
            'apply_to_tasks': True,
            'created_by': 'system'
        }
    ]
    
    rules = []
    for data in rules_data:
        rule = ContextRule.create(**data)
        rules.append(rule)
        scope = "全局" if rule.project_id is None else f"项目: {projects[rule.project_id-1].name if rule.project_id <= len(projects) else 'Unknown'}"
        print(f"✅ 创建上下文规则: {rule.name} ({scope})")
    
    db.session.commit()
    return rules


def create_sample_task_history(tasks):
    """创建示例任务历史"""
    # 为已完成的任务创建历史记录
    completed_task = next((t for t in tasks if t.status == TaskStatus.DONE), None)
    if completed_task:
        TaskHistory.log_action(
            task_id=completed_task.id,
            action=ActionType.CREATED,
            changed_by='system',
            comment='任务创建'
        )
        TaskHistory.log_action(
            task_id=completed_task.id,
            action=ActionType.STATUS_CHANGED,
            changed_by='Frontend-Lead',
            field_name='status',
            old_value='todo',
            new_value='in_progress',
            comment='开始执行任务'
        )
        TaskHistory.log_action(
            task_id=completed_task.id,
            action=ActionType.COMPLETED,
            changed_by='Frontend-Lead',
            field_name='status',
            old_value='in_progress',
            new_value='done',
            comment='任务完成，选择React作为前端框架'
        )
        print(f"✅ 创建任务历史: {completed_task.title}")


def seed_all_data():
    """创建所有测试数据"""
    app = create_app()
    
    with app.app_context():
        print("🌱 开始创建测试数据...")
        print("=" * 50)
        
        # 检查是否已有数据
        if Project.query.first():
            print("⚠️  数据库中已存在数据")
            confirm = input("是否清空现有数据并重新创建？(y/N): ")
            if confirm.lower() != 'y':
                print("操作已取消")
                return
            
            # 清空现有数据
            print("🗑️  清空现有数据...")
            db.session.query(TaskHistory).delete()
            db.session.query(ContextRule).delete()
            db.session.query(Task).delete()
            db.session.query(Project).delete()
            db.session.commit()
        
        # 创建测试数据
        projects = create_sample_projects()
        tasks = create_sample_tasks(projects)
        rules = create_sample_context_rules(projects)
        create_sample_task_history(tasks)
        
        print("=" * 50)
        print("🎉 测试数据创建完成！")
        print(f"📊 统计信息:")
        print(f"  - 项目: {len(projects)} 个")
        print(f"  - 任务: {len(tasks)} 个")
        print(f"  - 上下文规则: {len(rules)} 个")
        print(f"  - 任务历史: {TaskHistory.query.count()} 条")


def clear_all_data():
    """清空所有数据"""
    app = create_app()
    
    with app.app_context():
        print("🗑️  清空所有测试数据...")
        
        confirm = input("⚠️  这将删除所有数据！确认清空？(y/N): ")
        if confirm.lower() != 'y':
            print("操作已取消")
            return
        
        db.session.query(TaskHistory).delete()
        db.session.query(ContextRule).delete()
        db.session.query(Task).delete()
        db.session.query(Project).delete()
        db.session.commit()
        
        print("✅ 所有数据已清空")


def main():
    """主函数"""
    if len(sys.argv) < 2:
        print("用法:")
        print("  python seed_data.py create    - 创建测试数据")
        print("  python seed_data.py clear     - 清空所有数据")
        return
    
    command = sys.argv[1].lower()
    
    if command == 'create':
        seed_all_data()
    elif command == 'clear':
        clear_all_data()
    else:
        print(f"未知命令: {command}")


if __name__ == '__main__':
    main()
