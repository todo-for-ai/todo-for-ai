# Channel API Decoupling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline execution recommended due to single focused task). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple the notification channel API from `api/agent_automation/` into a standalone `api/channels.py` blueprint, maintaining full backward compatibility for existing URLs.

**Architecture:** The channel routes currently live inside `agent_automation` and are auto-imported via its blueprint. This creates a false coupling between general notification channels and agent automation. We will extract these routes into a dedicated Flask blueprint while keeping the exact same URL paths.

**Tech Stack:** Python Flask, SQLAlchemy

---

## Task 1: Extract Channel Routes into Standalone Blueprint

**Files:**
- Create: `todo-for-ai-api-server/api/channels.py`
- Modify: `todo-for-ai-api-server/app.py`
- Modify: `todo-for-ai-api-server/api/agent_automation/__init__.py`
- Test: `python3 -m py_compile` + backend restart + curl

### Step 1: Create `api/channels.py`

Create the file by extracting channel route logic from `api/agent_automation/routes_channels.py` and using a new `channels_bp`:

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
@unified_auth_required
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

### Step 2: Register blueprint in `app.py`

Add near other blueprint imports:
```python
from api.channels import channels_bp
```

Add registration:
```python
app.register_blueprint(channels_bp, url_prefix='/todo-for-ai/api/v1')
```

### Step 3: Remove channel route import from `agent_automation`

Edit `todo-for-ai-api-server/api/agent_automation/__init__.py` and remove:
```python
from . import routes_channels  # noqa: E402,F401
```

### Step 4: Verify syntax and imports

Run:
```bash
python3 -m py_compile todo-for-ai-api-server/api/channels.py
python3 -m py_compile todo-for-ai-api-server/app.py
python3 -m py_compile todo-for-ai-api-server/api/agent_automation/__init__.py
```

Expected: All pass without errors.

### Step 5: Start backend and verify API responds

```bash
PM2_HOME=/Users/cc11001100/github/todo-for-ai/todo-for-ai/.todo-for-ai-pm2 pm2 start ecosystem.config.js --only todo-for-ai-backend
sleep 3
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:50110/todo-for-ai/api/v1/users/1/channels
```

Expected: 401 (unauthorized) or 200 — but NOT 404.

### Step 6: Commit

```bash
git add todo-for-ai-api-server/api/channels.py todo-for-ai-api-server/app.py todo-for-ai-api-server/api/agent_automation/__init__.py
git commit -m "refactor(notifications): decouple channel API from agent_automation into standalone blueprint"
```
