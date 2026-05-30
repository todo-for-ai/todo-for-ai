# Notification System Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the notification system by adding a top-navigation notification bell with unread badge, integrating the notification dispatcher worker into PM2, and optionally decoupling channel APIs from the agent_automation package.

**Architecture:** The backend already has UserNotification models, REST APIs (`/notifications`), task-event wiring (`create_task_notifications`), channel configuration, provider adapters, and a Redis-backed dispatcher. The missing pieces are: 1) a frontend notification bell in the top nav, 2) a running dispatcher worker, and 3) cleaner API routing for channels.

**Tech Stack:** React + TypeScript (Ant Design), Python (Flask), PM2, Redis

---

## What Already Exists

- **Backend models:** `UserNotification`, `NotificationChannel`, `NotificationEvent`, `NotificationDelivery` ✅
- **Backend APIs:** `/notifications` (list, unread-count, read, read-all, catalog) ✅
- **Task event wiring:** `api/tasks/routes_tasks.py` calls `create_task_notifications()` ✅
- **Channel config UI:** `NotificationChannelManager.tsx` is used in Settings, OrganizationDetail, and ProjectDetail ✅
- **Notification center page:** `src/pages/Notifications.tsx` ✅
- **Notification settings:** `src/pages/Settings.tsx` already has in-app preference controls ✅
- **Dispatcher engine:** `core/notification_dispatcher.py` + `scripts/run_notification_dispatcher.py` ✅

## What Is Missing

1. **Top-navigation notification bell** with unread count badge and a quick-view dropdown.
2. **PM2-managed notification dispatcher worker** (`scripts/run_notification_dispatcher.py` is not in `ecosystem.config.js`).
3. **Channel API cleanup** (routes currently live inside `api/agent_automation/` but are used by the general UI).

---

### Task 1: Add Notification Bell to Top Navigation

**Files:**
- Create: `todo-for-ai-webpage/src/components/NotificationBell.tsx`
- Modify: `todo-for-ai-webpage/src/components/Layout/TopNavigation.tsx`

- [ ] **Step 1: Inspect `TopNavigation.tsx` layout**

Read `todo-for-ai-webpage/src/components/Layout/TopNavigation.tsx` and locate the `header-user-section` where `<UserAvatar />` is rendered.

- [ ] **Step 2: Create `NotificationBell` component**

Create `todo-for-ai-webpage/src/components/NotificationBell.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Badge, Dropdown, List, Space, Tag, Typography, Button, Spin } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../modules/notifications'
import type { NotificationItem } from '../api/notificationTypes'

const { Text } = Typography

const NotificationBell: React.FC = () => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { loading, items, unreadCount, markAsRead, markAllAsRead, reload } = useNotifications({
    page: 1,
    perPage: 10,
  })

  useEffect(() => {
    const interval = setInterval(() => {
      void reload()
    }, 30000)
    return () => clearInterval(interval)
  }, [reload])

  const handleClickItem = async (item: NotificationItem) => {
    if (!item.is_read) {
      await markAsRead(item.id)
    }
    setOpen(false)
    if (item.link_url) {
      navigate(item.link_url)
    } else {
      navigate('/todo-for-ai/pages/notifications')
    }
  }

  const listContent = (
    <div style={{ width: 360, maxHeight: 400, overflowY: 'auto' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>通知中心</Text>
        {items.length > 0 && (
          <Button size="small" type="link" onClick={() => void markAllAsRead()}>
            全部已读
          </Button>
        )}
      </div>
      <Spin spinning={loading}>
        <List
          dataSource={items.slice(0, 8)}
          locale={{ emptyText: <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>暂无通知</div> }}
          renderItem={(item) => (
            <List.Item
              style={{ cursor: 'pointer', padding: '10px 16px', opacity: item.is_read ? 0.7 : 1 }}
              onClick={() => void handleClickItem(item)}
            >
              <List.Item.Meta
                title={(
                  <Space size={4}>
                    <Text strong={!item.is_read}>{item.title}</Text>
                    {!item.is_read && <Tag color="gold" style={{ margin: 0 }}>未读</Tag>}
                  </Space>
                )}
                description={(
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.body || item.event_type}
                  </Text>
                )}
              />
            </List.Item>
          )}
        />
        <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
          <Button type="link" size="small" onClick={() => { setOpen(false); navigate('/todo-for-ai/pages/notifications') }}>
            查看全部通知
          </Button>
        </div>
      </Spin>
    </div>
  )

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      dropdownRender={() => listContent}
      placement="bottomRight"
      trigger={['click']}
    >
      <div style={{ cursor: 'pointer', padding: '0 12px', display: 'flex', alignItems: 'center' }}>
        <Badge count={unreadCount} overflowCount={99} size="small">
          <BellOutlined style={{ fontSize: 20, color: '#666' }} />
        </Badge>
      </div>
    </Dropdown>
  )
}

export default NotificationBell
```

- [ ] **Step 3: Import and render `NotificationBell` inside `TopNavigation.tsx`**

Edit `todo-for-ai-webpage/src/components/Layout/TopNavigation.tsx`:

Add import:
```tsx
import NotificationBell from '../NotificationBell'
```

Insert `<NotificationBell />` immediately before `<UserAvatar onPinUpdate={reloadPinnedProjects} />` inside the `header-user-section` div, with a small gap:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
  <NotificationBell />
  <UserAvatar onPinUpdate={reloadPinnedProjects} />
</div>
```

- [ ] **Step 4: Build frontend and verify no errors**

Run:
```bash
cd todo-for-ai-webpage && npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add todo-for-ai-webpage/src/components/NotificationBell.tsx todo-for-ai-webpage/src/components/Layout/TopNavigation.tsx
git commit -m "feat(notifications): add notification bell with unread badge to top navigation"
```

---

### Task 2: Register Notification Dispatcher Worker in PM2

**Files:**
- Modify: `ecosystem.config.js`

- [ ] **Step 1: Read existing `ecosystem.config.js`**

Confirm it currently only manages `todo-for-ai-backend` and `todo-for-ai-frontend`.

- [ ] **Step 2: Add `todo-for-ai-notification-dispatcher` app config**

Append a third object to the `apps` array in `ecosystem.config.js`:

```javascript
    {
      name: 'todo-for-ai-notification-dispatcher',
      cwd: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/todo-for-ai-api-server',
      script: '/usr/bin/python3',
      args: 'scripts/run_notification_dispatcher.py',
      env: {
        NODE_ENV: 'development',
        FLASK_ENV: 'development',
      },
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      min_uptime: '10s',
      time: true,
      log_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/notification-dispatcher.log',
      out_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/notification-dispatcher-out.log',
      error_file: '/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2/logs/notification-dispatcher-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
```

- [ ] **Step 3: Test PM2 config syntax**

Run:
```bash
pm2 delete ecosystem.config.js 2>/dev/null; pm2 start ecosystem.config.js --only todo-for-ai-notification-dispatcher
```

Expected: The `todo-for-ai-notification-dispatcher` process starts without syntax errors.

- [ ] **Step 4: Verify logs**

Run:
```bash
pm2 logs todo-for-ai-notification-dispatcher --lines 20
```

Expected: Log output shows either `[notification-dispatcher] batch=...` or `[notification-dispatcher] idle`, indicating the worker is looping correctly.

- [ ] **Step 5: Stop the test process (do not leave it running unless user requests)**

```bash
pm2 stop todo-for-ai-notification-dispatcher
```

- [ ] **Step 6: Commit**

```bash
git add ecosystem.config.js
git commit -m "feat(notifications): add notification dispatcher worker to pm2 ecosystem"
```

---

### Task 3: Decouple Channel API from `agent_automation` (Optional but Recommended)

**Files:**
- Create: `todo-for-ai-api-server/api/channels.py`
- Modify: `todo-for-ai-api-server/app.py`
- Modify: `todo-for-ai-api-server/api/agent_automation/__init__.py`

- [ ] **Step 1: Extract channel routes into a new blueprint**

Create `todo-for-ai-api-server/api/channels.py` by copying the content from `api/agent_automation/routes_channels.py` and replacing `agent_automation_bp` with a new `channels_bp`:

```python
"""Notification channel routes (general purpose)."""

from flask import Blueprint, request
from models import (
    db,
    NotificationChannel,
    NotificationScopeType,
    NotificationChannelType,
    Project,
)
from core.auth import unified_auth_required, get_current_user
from api.base import ApiResponse, validate_json_request
from api.notification_service import (
    SUPPORTED_NOTIFICATION_CHANNEL_TYPES,
    normalize_notification_event_types,
    serialize_notification_channel,
    validate_notification_channel_config,
)
from api.agent_automation.shared import (
    _resolve_channel_scope,
    _can_manage_scope,
    _list_channels_by_scope,
    _parse_bool,
)

channels_bp = Blueprint('channels', __name__)


def _create_channel_for_scope(scope_type, scope_id):
    user = get_current_user()
    scope, err = _resolve_channel_scope(scope_type, scope_id)
    if err:
        return err

    if not _can_manage_scope(scope):
        return ApiResponse.forbidden('Access denied').to_response()

    data = validate_json_request(
        required_fields=['name', 'channel_type'],
        optional_fields=['enabled', 'is_default', 'events', 'config'],
    )
    if isinstance(data, tuple):
        return data

    channel_type_raw = str(data.get('channel_type') or '').strip().lower()
    if channel_type_raw not in SUPPORTED_NOTIFICATION_CHANNEL_TYPES:
        return ApiResponse.error('Invalid channel_type', 400).to_response()

    events = data.get('events') or []
    if not isinstance(events, list):
        return ApiResponse.error('events must be array', 400).to_response()
    normalized_events = normalize_notification_event_types(events)
    if normalized_events is None:
        return ApiResponse.error('events contains unsupported event type', 400).to_response()

    config = data.get('config') or {}
    validated_config, config_error = validate_notification_channel_config(channel_type_raw, config)
    if config_error:
        return ApiResponse.error(config_error, 400).to_response()

    row = NotificationChannel(
        scope_type=(scope_type.value if hasattr(scope_type, 'value') else str(scope_type)),
        scope_id=scope_id,
        name=str(data.get('name') or '').strip()[:128],
        channel_type=NotificationChannelType(channel_type_raw).value,
        enabled=_parse_bool(data.get('enabled'), True),
        is_default=_parse_bool(data.get('is_default'), False),
        events=normalized_events,
        config=validated_config,
        created_by_user_id=user.id,
        updated_by_user_id=user.id,
        created_by=user.email,
    )

    if not row.name:
        return ApiResponse.error('name cannot be empty', 400).to_response()

    db.session.add(row)
    db.session.commit()

    return ApiResponse.created(serialize_notification_channel(row), 'Channel created successfully').to_response()


def _list_channels_for_scope(scope_type, scope_id):
    scope, err = _resolve_channel_scope(scope_type, scope_id)
    if err:
        return err
    return ApiResponse.success({'items': _list_channels_by_scope(scope_type, scope_id)}, 'Channels retrieved successfully').to_response()


@channels_bp.route('/users/<int:user_id>/channels', methods=['GET'])
@unified_auth_required
def list_user_channels(user_id):
    return _list_channels_for_scope(NotificationScopeType.USER.value, user_id)


@channels_bp.route('/users/<int:user_id>/channels', methods=['POST'])
@unified_auth_required
def create_user_channel(user_id):
    return _create_channel_for_scope(NotificationScopeType.USER.value, user_id)


@channels_bp.route('/organizations/<int:organization_id>/channels', methods=['GET'])
def list_org_channels(organization_id):
    return _list_channels_for_scope(NotificationScopeType.ORGANIZATION.value, organization_id)


@channels_bp.route('/organizations/<int:organization_id>/channels', methods=['POST'])
@unified_auth_required
def create_org_channel(organization_id):
    return _create_channel_for_scope(NotificationScopeType.ORGANIZATION.value, organization_id)


@channels_bp.route('/projects/<int:project_id>/channels', methods=['GET'])
@unified_auth_required
def list_project_channels(project_id):
    return _list_channels_for_scope(NotificationScopeType.PROJECT.value, project_id)


@channels_bp.route('/projects/<int:project_id>/channels', methods=['POST'])
@unified_auth_required
def create_project_channel(project_id):
    return _create_channel_for_scope(NotificationScopeType.PROJECT.value, project_id)


@channels_bp.route('/channels/<int:channel_id>', methods=['PATCH'])
@unified_auth_required
def patch_channel(channel_id):
    user = get_current_user()
    row = NotificationChannel.query.get(channel_id)
    if not row:
        return ApiResponse.not_found('Channel not found').to_response()

    scope, err = _resolve_channel_scope(row.scope_type, row.scope_id)
    if err:
        return err
    if not _can_manage_scope(scope):
        return ApiResponse.forbidden('Access denied').to_response()

    data = validate_json_request(optional_fields=['name', 'enabled', 'is_default', 'events', 'config'])
    if isinstance(data, tuple):
        return data

    if 'name' in data:
        name = str(data.get('name') or '').strip()
        if not name:
            return ApiResponse.error('name cannot be empty', 400).to_response()
        row.name = name[:128]

    if 'enabled' in data:
        row.enabled = _parse_bool(data.get('enabled'), True)

    if 'is_default' in data:
        row.is_default = _parse_bool(data.get('is_default'), False)

    if 'events' in data:
        events = data.get('events') or []
        if not isinstance(events, list):
            return ApiResponse.error('events must be array', 400).to_response()
        normalized_events = normalize_notification_event_types(events)
        if normalized_events is None:
            return ApiResponse.error('events contains unsupported event type', 400).to_response()
        row.events = normalized_events

    if 'config' in data:
        config = data.get('config') or {}
        validated_config, config_error = validate_notification_channel_config(row.channel_type, config)
        if config_error:
            return ApiResponse.error(config_error, 400).to_response()
        existing_config = row.config or {}
        channel_type_value = str(row.channel_type or '').strip().lower()
        if channel_type_value in {NotificationChannelType.FEISHU.value, NotificationChannelType.DINGTALK.value}:
            if not validated_config.get('secret') and existing_config.get('secret'):
                validated_config['secret'] = existing_config.get('secret')
        row.config = validated_config

    row.updated_by_user_id = user.id
    db.session.commit()

    return ApiResponse.success(serialize_notification_channel(row), 'Channel updated successfully').to_response()


@channels_bp.route('/channels/<int:channel_id>', methods=['DELETE'])
@unified_auth_required
def delete_channel(channel_id):
    row = NotificationChannel.query.get(channel_id)
    if not row:
        return ApiResponse.not_found('Channel not found').to_response()

    scope, err = _resolve_channel_scope(row.scope_type, row.scope_id)
    if err:
        return err
    if not _can_manage_scope(scope):
        return ApiResponse.forbidden('Access denied').to_response()

    db.session.delete(row)
    db.session.commit()
    return ApiResponse.success(None, 'Channel deleted successfully').to_response()


@channels_bp.route('/projects/<int:project_id>/effective-channels', methods=['GET'])
@unified_auth_required
def get_project_effective_channels(project_id):
    user = get_current_user()
    project = Project.query.get(project_id)
    if not project:
        return ApiResponse.not_found('Project not found').to_response()
    if not user.can_access_project(project):
        return ApiResponse.forbidden('Access denied').to_response()

    event_type = str(request.args.get('event_type') or '').strip().lower()

    levels = []
    project_channels = NotificationChannel.query.filter_by(
        scope_type=NotificationScopeType.PROJECT.value,
        scope_id=project.id,
        enabled=True,
    ).all()
    levels.append({'scope_type': 'project', 'scope_id': project.id, 'items': project_channels})

    if project.organization_id:
        org_channels = NotificationChannel.query.filter_by(
            scope_type=NotificationScopeType.ORGANIZATION.value,
            scope_id=project.organization_id,
            enabled=True,
        ).all()
        levels.append({'scope_type': 'organization', 'scope_id': project.organization_id, 'items': org_channels})

    user_channels = NotificationChannel.query.filter_by(
        scope_type=NotificationScopeType.USER.value,
        scope_id=project.owner_id,
        enabled=True,
    ).all()
    levels.append({'scope_type': 'user', 'scope_id': project.owner_id, 'items': user_channels})

    selected_level = None
    selected_items = []
    for level in levels:
        current_items = [
            row for row in level['items']
            if not event_type or not row.events or event_type in [str(item).strip().lower() for item in (row.events or [])]
        ]
        if current_items:
            selected_level = {'scope_type': level['scope_type'], 'scope_id': level['scope_id']}
            selected_items = current_items
            break

    if not selected_level:
        selected_level = {'scope_type': 'none', 'scope_id': None}

    return ApiResponse.success(
        {
            'event_type': event_type or None,
            'selected_scope': selected_level,
            'items': [serialize_notification_channel(row) for row in selected_items],
        },
        'Effective channels resolved successfully',
    ).to_response()
```

Note: `list_org_channels` is missing `@unified_auth_required` in the snippet above; make sure it is decorated in the actual file.

- [ ] **Step 3: Register `channels_bp` in `app.py`**

Add import inside `app.py` (near line 191 where other blueprints are imported):

```python
from api.channels import channels_bp
```

Add registration (near line 234):

```python
app.register_blueprint(channels_bp, url_prefix='/todo-for-ai/api/v1')
```

- [ ] **Step 4: Remove channel routes from `agent_automation` (backward compatibility)**

Edit `todo-for-ai-api-server/api/agent_automation/__init__.py` and remove or comment out:

```python
from . import routes_channels  # noqa: E402,F401
```

The old URLs (`/todo-for-ai/api/v1/users/:id/channels`) will now be served by `channels_bp` at the same prefix, so no frontend breakage.

- [ ] **Step 5: Restart backend and verify a channel API**

Run:
```bash
pm2 restart todo-for-ai-backend
curl -s http://127.0.0.1:50110/todo-for-ai/api/v1/users/1/channels -H "Authorization: Bearer <token>"
```

Expected: 200 with JSON list (or 401 if token is invalid, but not 404).

- [ ] **Step 6: Commit**

```bash
git add todo-for-ai-api-server/
git commit -m "refactor(notifications): decouple channel API from agent_automation into standalone channels blueprint"
```

---

### Task 4: End-to-End Smoke Test

- [ ] **Step 1: Run Playwright or API tests**

Run:
```bash
cd todo-for-ai-webpage && npx playwright test --grep "notification" || echo "No notification-specific tests"
```

If no specific tests exist, run the comprehensive API test script:
```bash
cd todo-for-ai-api-server && python -m pytest tests/ -k "notification" -v || echo "No notification tests"
```

- [ ] **Step 2: Manual smoke checklist ( dokumented in temp file )**

Create `docs/NOTIFICATION_SMOKE_CHECKLIST.md`:

```markdown
# Notification System Smoke Checklist

- [ ] Create a task → check Notifications page for `task.created` entry
- [ ] Check top nav bell shows unread count > 0
- [ ] Click bell dropdown → click a notification → navigates to task
- [ ] Mark all read → unread count becomes 0
- [ ] In Settings, disable `task.created` → create another task → no new in-app notification
- [ ] Add a webhook channel in Settings → create task → `notification_deliveries` has pending row
- [ ] PM2 `todo-for-ai-notification-dispatcher` logs show it picking up and attempting delivery
```

This file should be retained as documentation or removed after verification depending on team preference. For this plan, remove it after the smoke test passes.

- [ ] **Step 3: Remove temporary checklist and finalize**

```bash
rm -f docs/NOTIFICATION_SMOKE_CHECKLIST.md
git add docs/
git commit --allow-empty -m "docs(notifications): add and complete smoke test checklist"
```

---

## Execution Selection

**Auto-selecting: Subagent-Driven Execution**

This plan spans frontend UI (React component), backend refactoring (blueprint extraction), infrastructure (PM2 config), and end-to-end verification. Subagent-driven execution is optimal because:
- Fresh subagent per task prevents context pollution between frontend and backend
- Built-in review stages catch UI layout and API routing issues early
- The PM2 step requires shell-level verification that is best isolated

**REQUIRED SUB-SKILL:** Using superpowers:subagent-driven-development

**Proceeding to execute...**
