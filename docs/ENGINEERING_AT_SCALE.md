# 百万行级软件工程管理蓝图（Engineering at Scale）

> 目标：本项目按规划将增长到 **100~200 万行、数百上千个模块、数万~数十万个功能点**。
> 本文档回答：到那个规模，代码怎么组织、质量怎么守、协作怎么做、拆分怎么决策。
> 原则：**结构跟着规模走**——每一档规模用对应档位的组织手段，不提前过度设计，也不滞后失控。

## 0. 现状基线（2026-09-18 实测）

| 仓库 | 非测试源码行 | 主要构成 | 测试 |
|---|---|---|---|
| todo-for-ai-api-server（Flask） | ~91.7K | api/ 50K（agents 域 18K）、models/ 8.4K、services/ 6.8K | ~2660 |
| todo-for-ai-webpage（React/TS） | ~92.6K | pages/ 10.7K、components/ 7.1K、api/ 4.3K、hooks/ 2.3K | ~365 |
| agent-runtime（Python） | ~27K | 调度/引擎/运行时 | 独立门禁 |
| 主仓（编排+文档） | — | 子仓 ref、roadmap、对标文档 | — |

距 100 万行有 ~5 倍空间，距 200 万 ~10 倍。当前已出现的规模化征兆：`api/` 单层平铺 223 文件 50K 行、顶层包存在 4 组循环依赖（已入审计基线棘轮）。

## 1. 五层组织模型（每一层有明确的管理载体）

| 层 | 规模档位 | 管理载体 | 硬约束 |
|---|---|---|---|
| **仓库** | 数十万行/仓 | 主仓 + 子仓（现状）；拆仓判据见 §5 | 门禁全绿才可合 main |
| **域包** | ≤5K 行、≤30 文件 | 目录 + `__init__` docstring（职责一句话） | 平铺超限必须拆子包 |
| **模块文件** | ≤500 行（新增）；>800 禁止 | 文件头 docstring 说明职责 | arch-audit 棘轮拦截 |
| **功能点** | 数万 | roadmap「进展（日期 其N）」条目 + 模块 docstring | 每个功能点可溯源到模块 |
| **测试** | 与源码同增长 | tests/unit 按域镜像源码结构 | 全量绿才可合并 |

**域包拆分手法**（已验证：`api/agents/workflow`、`api/agents/analytics`、webpage `pages/agents/` 簇）：
1. 按名词聚类文件（workflow_*、analytics_* 天然成簇）；
2. `git mv` 进子包 + 模块名去前缀（`workflow_routes.py` → `workflow/routes.py`）；
3. 旧路径放 **sys.modules 替换型 shim**（保持模块对象同一性 → monkeypatch、私有名、`from api.agents import workflow_dsl` 全兼容）；
4. 注册行零改动（shim 触发真实模块导入，路由注册顺序不变）；
5. 全量门禁验证。

## 2. 边界规则（依赖只许单向）

**Python（api-server）**：
```
api/  →  services/  →  models/  ←  core/
（禁止反向：models/core 不得 import api/services；services 不得 import api）
```
域包内部文件互引相对导入；跨域只走公开入口（包 `__init__` 或旧路径 shim），禁止深潜他域私有模块。

**TypeScript（webpage）**：
```
pages/（叶子，无人可指向它） ← components/ ← hooks/ ← api/ ← stores/
```
`src/api/**` 不得 import pages/components/hooks；`components/**` 不得 import pages；stores 不得指向 UI。

**规则由门禁自动执行**（§4），不靠自觉。新的跨域需求 = 在被依赖方开公开出口，而不是绕过规则。

## 3. 模块注册与功能点登记

- **域包登记**：每个域包的 `__init__.py` docstring 第一行写职责（一句话），本文件 §6 目录树随合并更新。
- **功能点登记**：roadmap 按「进展（日期 其N）」追加，每条 ✅ 必须落到具体模块路径；反向要求：任何模块的 docstring 能回答"我实现了哪个功能点"。
- **所有权**：多会话并行开发（AGENTS.md worktree 纪律）下，域包即隐式所有权边界——一个会话占一个域包，pathspec 定向提交，互不卷入。

## 4. 治理自动化（棘轮机制）

两个审计脚本把 §1/§2 的约束变成可执行门禁：

| 仓库 | 脚本 | 检查 |
|---|---|---|
| api-server | `scripts/arch_audit.py` | 文件行数分级、分层边界违规、顶层包循环依赖、巨型平铺包预警 |
| webpage | `scripts/arch-audit.mjs` | 文件行数分级、pages 叶子规则、巨型目录预警 |

**棘轮**：FAIL 级违规若已登记 `arch_debt_baseline.txt`（存量债务）→ 放行但持续可见（BASELINE）；未登记的新违规 → exit 1 阻断合并；基线中消失的债务提示删除（**只紧不松**）。`--update-baseline` 显式重置。

当前基线（2026-09-18 首次登记，api-server 48 项）含 4 组顶层包循环依赖、7 个 >800 行文件——这是真实结构债，清偿节奏见 §7。

既有功能门禁不变：api-server 全量 pytest（>2600）+ webpage tsc/build/vitest（>365）全绿才可合 main；提交一律 pathspec 定向。

## 5. 拆分决策判据（什么时候拆包、拆仓、拆服务）

| 触发条件（满足其一） | 动作 |
|---|---|
| 单文件 >500 行 | 拆文件（hooks/子组件/域函数外移） |
| 单目录平铺 >30 文件 或 >20K 行 | 拆域包（§1 手法） |
| 某域 >50K 行，或需要独立部署/伸缩/发布节奏 | **拆仓**（子仓 + 主仓 ref 编排，现行模式已验证） |
| 某域需要独立伸缩/技术栈/可用性隔离 | **拆服务**（API 契约先行：OpenAPI/schema 固定后再拆） |
| 两个仓/服务互相改对方（合并频繁冲突） | 边界划错了——上浮共享库或合并契约，而不是加同步机制 |

拆分的**兼容三定式**（保证并行会话/下游不断裂）：shim 保持 import 面 → 契约/协议版本化 → 旧路径保留一个过渡期，删除前用审计脚本确认零引用。

## 6. 目标域目录树（随合并滚动更新）

```
api-server/
├── api/
│   ├── agents/            # Agent 域（路由聚合）
│   │   ├── workflow/      # ✅ 工作流域（11 模块：routes/runs/completion/dsl/external_steps/…）
│   │   ├── analytics/     # ✅ 分析域（7 模块：overview/capability/collaboration/…）
│   │   ├── collab/        # ⏳ 协作域（channels/conflicts/protocols/experiences/knowledge…）
│   │   ├── tasks/         # ⏳ 任务域（assignments/dispatch/task_*/run_logs…）
│   │   └── governance/    # ⏳ 治理域（sandboxes/security/maintenance/reputation…）
│   ├── tasks/ organizations/ projects/ …（已成包的保持）
│   └── （顶层散文件 223 个 → 按上列域逐步归位）
├── models/  ⏳ 按 api 同构分域
├── services/ ⏳ 同构分域（goal_loop/connectors/runtime_env/ai 已成包）
└── core/
webpage/src/ 组织约定见 webpage/docs/FRONTEND_STRUCTURE.md（页簇 + hooks + api 分域）
```

⏳ 项按 §5 触发条件渐进执行，每清偿一批基线债务更新此树。

## 7. 增长治理节奏

- **每 +50K 行**跑一次结构 review：arch-audit 全量输出 + 基线债务清偿率 + 域包健康度（行数/文件数分布）；
- **每 +200K 行**评审一次拆仓/拆服务判据（§5），并重新校准 §1 各档位数字；
- 循环依赖、>800 行文件两类债务**只许出清**：棘轮保证新增为零，存量按域包迁移顺路清偿；
- 文档即契约：本文件、webpage `docs/FRONTEND_STRUCTURE.md`、`docs/DIFY_WORKFLOW_BENCHMARK.md`（能力对标）随结构变化同步更新。
