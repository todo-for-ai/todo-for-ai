# 回归测试框架修复与增强设计

> **Goal:** 修复测试框架运行问题，实现真正的幂等性测试覆盖

## 问题诊断

### 1. Frontend/MCP 测试无法运行
- **原因:** vitest 未安装（node_modules 缺失）
- **解决:** 安装依赖并验证测试运行

### 2. Agent Runtime 导入错误
- **原因:** test_openclaw.py 尝试导入不存在的 TaskQueue
- **解决:** 修复或跳过有问题的测试文件

### 3. API Server 路径冲突
- **原因:** tests/unit/core/test_auth.py 与 tests/unit/api/test_auth.py 命名冲突
- **解决:** 重命名并合并测试

### 4. 结果解析不准确
- **原因:** _parse_test_results 方法过于简单
- **解决:** 改进解析逻辑，正确提取 pytest 结果

## 设计方案

### 架构: 三层测试策略

1. **基础设施层** - 修复运行环境问题
2. **测试修复层** - 修复/重构有问题的测试
3. **覆盖率增强层** - 添加幂等性测试

### 技术栈
- Python: pytest, pytest-asyncio, factory-boy (用于 fixtures)
- TypeScript: vitest, jsdom, @testing-library/react

## 修复任务

### Task 1: 修复 Frontend/MCP 测试运行
- 安装 npm 依赖
- 验证 vitest 可运行

### Task 2: 修复 Agent Runtime 导入错误
- 检查 test_openclaw.py 导入问题
- 修复或标记为 skip

### Task 3: 修复 API Server 测试冲突
- 重命名 test_auth.py 文件
- 合并重复测试

### Task 4: 改进结果解析器
- 增强 _parse_test_results 方法
- 添加 pytest 输出解析

### Task 5: 添加幂等性 Fixtures
- 创建工厂函数用于测试数据
- 确保测试间数据隔离

### Task 6: 增强测试覆盖率
- 为所有核心模块添加测试
- 确保每个功能点都有测试覆盖

## 验收标准

- [ ] 所有 4 个模块测试都能正常运行
- [ ] 测试结果正确显示 passed/failed 数量
- [ ] 每个模块核心功能都有测试覆盖
- [ ] 测试是幂等的（多次运行结果一致）
