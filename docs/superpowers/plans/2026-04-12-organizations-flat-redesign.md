# Organizations 页面扁平化重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 将组织列表页面从当前的蓝色渐变风格重设计为现代扁平化互联网风格，采用绿色调色彩体系，去除不必要的渐变和阴影，打造清爽、专业的视觉体验。

**Architecture:** 在 Ant Design 基础上，通过 CSS 变量和内联样式调整色彩体系（蓝色→绿色调），去除所有 gradient 和 box-shadow，使用更锐利的边框和更大的留白。卡片和列表视图都采用极简风格，统计数字使用更大的字重对比。

**Tech Stack:** React, Ant Design, CSS (flat-design.css + index.css)

---

### Task 1: 建立绿色调扁平化色彩体系

**Files:**
- Modify: `todo-for-ai-webpage/src/styles/flat-design.css`
- Modify: `todo-for-ai-webpage/src/index.css`

- [ ] **Step 1: 更新 flat-design.css 色彩从蓝色系到绿色系**

将所有 `#1677ff` / `rgba(22, 119, 255, ...)` 替换为绿色调 `#00b96b` / `rgba(0, 185, 107, ...)`。

```css
/* flat-design.css 关键替换 */
/* #1677ff → #00b96b (主色) */
/* #4096ff → #3cc884 (hover) */
/* #e6f7ff → #f0faf5 (light bg) */
/* rgba(22, 119, 255, 0.06) → rgba(0, 185, 107, 0.06) */
/* rgba(22, 119, 255, 0.08) → rgba(0, 185, 107, 0.06) */
/* rgba(22, 119, 255, 0.1) → rgba(0, 185, 107, 0.08) */

/* 按钮扁平化 - 去除所有渐变/阴影 */
.flat-btn--primary {
  color: #00b96b;
}
.flat-btn--primary:hover {
  color: #3cc884;
  background-color: rgba(0, 185, 107, 0.06);
}

/* 实心按钮 */
.flat-btn-solid--primary {
  background-color: #00b96b;
  color: #fff;
  border: none;
  box-shadow: none;
}
.flat-btn-solid--primary:hover {
  background-color: #3cc884;
}

/* 卡片 - 去除阴影，更锐利 */
.flat-card {
  border-radius: 6px;
  border: 1px solid #e8e8e8;
  box-shadow: none;
}
.flat-card:hover {
  border-color: #d0d0d0;
  box-shadow: none;
}
.flat-card--hoverable:hover {
  border-color: #00b96b;
}

/* 输入框 */
.flat-input:focus {
  border-color: #00b96b;
  box-shadow: 0 0 0 2px rgba(0, 185, 107, 0.1);
}

/* 表格 */
.flat-table .ant-table-tbody > tr:hover {
  background-color: #f0faf5;
}

/* 分页 */
.flat-pagination .ant-pagination-item-active {
  background-color: #00b96b;
  border-color: #00b96b;
}

/* 菜单 */
.flat-menu .ant-menu-item-selected {
  background-color: #f0faf5;
  color: #00b96b;
}
```

- [ ] **Step 2: 更新 index.css 全局页面容器样式**

将 page-container 的蓝色渐变改为更扁平的白色容器，去除 box-shadow。

```css
.page-container {
  padding: 32px;
  background: #fff;
  margin: 16px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
  box-shadow: none;
}

.page-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}
```

同时更新链接颜色:
```css
a {
  color: #00b96b;
}
a:hover {
  color: #3cc884;
}
a:active {
  color: #009957;
}
```

- [ ] **Step 3: Commit**
Run: `git add todo-for-ai-webpage/src/styles/flat-design.css todo-for-ai-webpage/src/index.css`

---

### Task 2: 重设计 shared 工具函数色彩

**Files:**
- Modify: `todo-for-ai-webpage/src/pages/organizations/components/organizationViewShared.tsx`

- [ ] **Step 1: 更新图标颜色和 tint 背景色为绿色调**

将 `organizationViewShared.tsx` 中的颜色全部替换为绿色调扁平化配色。

```tsx
// getOrganizationStatItems 中的颜色替换：
// #1677ff → #00b96b (members 图标)
// rgba(22, 119, 255, 0.08) → rgba(0, 185, 107, 0.06) (members tint)
// #52c41a 保持不变 (agents 已经是绿色)
// #13c2c2 → #00b96b (projects 图标改为绿色调)
// rgba(19, 194, 194, 0.10) → rgba(0, 185, 107, 0.08) (projects tint)
// #fa8c16 → #7c6cf0 (activeRoles 改为紫色做区分)
// rgba(250, 140, 22, 0.12) → rgba(124, 108, 240, 0.08) (activeRoles tint)

// roleColorMap 调整：
export const roleColorMap: Record<string, string> = {
  owner: '#00b96b',    // 绿色实心
  admin: 'processing',  // Ant 内置蓝绿色
  member: 'default',    // 灰色
  viewer: 'default',
}
```

- [ ] **Step 2: Commit**
Run: `git add todo-for-ai-webpage/src/pages/organizations/components/organizationViewShared.tsx`

---

### Task 3: 重设计列表视图为扁平风格

**Files:**
- Modify: `todo-for-ai-webpage/src/pages/organizations/components/OrganizationsListView.tsx`

- [ ] **Step 1: 重写 OrganizationsListView 内联样式**

将组织头像的渐变背景改为纯色扁平设计，去除 boxShadow，使用更大的字重对比。

```tsx
// 组织头像: 去除渐变和 inset boxShadow
// 替换:
// background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)'
// → background: '#f0faf5'
// boxShadow: 'inset 0 0 0 1px rgba(24, 144, 255, 0.12)'
// → border: '1px solid rgba(0, 185, 107, 0.15)'

// TeamOutlined color: '#1890ff' → '#00b96b'

// 统计卡片: 去除边框改为纯背景
// border: '1px solid rgba(24, 144, 255, 0.08)' → 去除 border
// borderRadius: 8 → 6

// 时间图标颜色: '#1677ff' → '#00b96b'
```

- [ ] **Step 2: Commit**
Run: `git add todo-for-ai-webpage/src/pages/organizations/components/OrganizationsListView.tsx`

---

### Task 4: 重设计卡片视图为扁平风格

**Files:**
- Modify: `todo-for-ai-webpage/src/pages/organizations/components/OrganizationsCardView.tsx`

- [ ] **Step 1: 重写 OrganizationsCardView 卡片样式**

将卡片改为极简扁平设计：去除渐变背景、减弱阴影、加大留白。

```tsx
// 卡片外层:
// border: '1px solid #e6f4ff' → '1px solid #e8e8e8'
// boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)' → 'none'
// background: 'linear-gradient(180deg, #ffffff 0%, #fafcff 100%)' → '#ffffff'
// borderRadius: 8 → 6

// 组织头像:
// background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 100%)' → '#f0faf5'
// boxShadow: 'inset 0 0 0 1px rgba(24, 144, 255, 0.12)' → 'border: 1px solid rgba(0, 185, 107, 0.15)'
// TeamOutlined color: '#1677ff' → '#00b96b'

// 角色区块:
// background: 'rgba(24, 144, 255, 0.04)' → 'rgba(0, 185, 107, 0.04)'
// border: '1px solid rgba(24, 144, 255, 0.08)' → '1px solid rgba(0, 185, 107, 0.08)'

// 统计小卡:
// borderRadius: 8 → 6
// border: '1px solid rgba(24, 144, 255, 0.08)' → 去除 border
```

- [ ] **Step 2: Commit**
Run: `git add todo-for-ai-webpage/src/pages/organizations/components/OrganizationsCardView.tsx`

---

## 设计方向总结

**色彩体系:**
- 主色: `#00b96b` (现代绿)
- Hover: `#3cc884`
- Active: `#009957`
- 浅底: `#f0faf5`
- 图标辅助: `#7c6cf0` (紫色点缀)

**扁平化原则:**
- 零渐变 (no linear-gradient)
- 零阴影 (no box-shadow) 或极淡阴影
- 6px 圆角 (不是 8px)
- 1px 实线边框
- 大量留白 (32px padding)
