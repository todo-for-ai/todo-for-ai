# Agent Runtime WebSocket 实时通信 Red Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the missing `/agent/ws` WebSocket endpoint to enable real-time bidirectional communication between Agent Runtime and Backend, supporting: task push, heartbeat streaming, config updates, and remote commands.

**Architecture:** Use Flask-SocketIO for the backend WebSocket server (compatible with the existing `python-socketio` client in Agent Runtime). Maintain the existing HTTP pull/commit API as fallback. WebSocket becomes the primary channel for real-time events; HTTP remains for task lifecycle operations (pull, commit, renew).

**Tech Stack:** Flask-SocketIO (backend), python-socketio (Agent Runtime), Redis (optional, for multi-instance message broadcasting), structlog (logging)

---

## Task 1: Add Flask-SocketIO Dependency and Basic Setup

**Files:**
- Modify: `todo-for-ai-api-server/requirements.txt`
- Modify: `todo-for-ai-api-server/app.py`
- Test: `curl -i http://127.0.0.1:50110/todo-for-ai/api/v1/agent/ws` (should upgrade to WebSocket)

### Step 1: Add Flask-SocketIO to requirements

In `todo-for-ai-api-server/requirements.txt`, uncomment or add:

```
Flask-SocketIO==5.3.6
python-socketio==5.9.0
```

### Step 2: Install dependencies

```bash
cd todo-for-ai-api-server
pip install Flask-SocketIO==5.3.6 python-socketio==5.9.0
```

### Step 3: Initialize SocketIO in app.py

In `todo-for-ai-api-server/app.py`, after Flask app creation:

```python
from flask_socketio import SocketIO, emit, join_room, disconnect

socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')

def create_app(config_name=None):
    # ... existing code ...
    app = Flask(__name__)
    # ... existing code ...
    socketio.init_app(app)
    # ... rest of create_app ...
    return app

# At bottom of file, update main block:
if __name__ == '__main__':
    # ... existing code ...
    socketio.run(app, host=host, port=port, debug=app.config['DEBUG'], use_reloader=False)
```

### Step 4: Verify SocketIO initialization

Restart the backend and check logs for SocketIO initialization message.

Expected: `Server initialized for threading.` or similar in logs.

### Step 5: Commit

```bash
git add todo-for-ai-api-server/requirements.txt todo-for-ai-api-server/app.py
git commit -m "feat(agent-runtime): add Flask-SocketIO dependency and initialization"
```

---

## Task 2: Create WebSocket Namespace Handler for Agent Runtime

**Files:**
- Create: `todo-for-ai-api-server/api/agent_runtime_websocket.py`
- Modify: `todo-for-ai-api-server/app.py` (register namespace)
- Test: Python script using `socketio.Client` to connect

### Step 1: Create WebSocket namespace handler

Create `todo-for-ai-api-server/api/agent_runtime_websocket.py`:

```python
"""
Agent Runtime WebSocket Namespace

Handles real-time communication with Agent Runtime:
- Connection authentication
- Heartbeat/health streaming
- Task push notifications
- Config updates
- Remote commands
"""

import json
from datetime import datetime
from flask import g, request
from flask_socketio import Namespace, emit, join_room, disconnect
from models import Agent, AgentSession, db
from .base import ApiResponse
from .agent_common import generate_id


class AgentRuntimeNamespace(Namespace):
    """Agent Runtime WebSocket Namespace"""
    
    namespace = '/agent/ws'
    
    def on_connect(self, auth=None):
        """Handle client connection with authentication"""
        from flask import session as socketio_session
        
        # auth should contain agent_key or access_token
        if not auth:
            auth = request.args  # Fallback to query params
        
        agent_key = auth.get('agent_key') if isinstance(auth, dict) else None
        token = auth.get('token') if isinstance(auth, dict) else None
        
        # Try to authenticate
        agent = None
        if agent_key:
            from models import AgentKey
            key = AgentKey.verify_key(agent_key)
            if key:
                agent = Agent.query.get(key.agent_id)
        elif token:
            session = AgentSession.verify_session_token(token)
            if session:
                agent = Agent.query.get(session.agent_id)
        
        if not agent:
            emit('auth_error', {'error': 'Invalid credentials'})
            disconnect()
            return False
        
        # Store agent info in SocketIO session (NOT Flask g)
        socketio_session['agent_id'] = agent.id
        socketio_session['workspace_id'] = agent.workspace_id
        
        # Join agent-specific room for targeted messages
        join_room(f'agent:{agent.id}')
        join_room(f'workspace:{agent.workspace_id}')
        
        emit('auth_success', {
            'agent_id': agent.id,
            'workspace_id': agent.workspace_id,
            'connected_at': datetime.utcnow().isoformat()
        })
        
        print(f'Agent {agent.id} connected via WebSocket')
        return True
    
    def on_disconnect(self):
        """Handle client disconnect"""
        from flask import session as socketio_session
        agent_id = socketio_session.get('agent_id')
        if agent_id:
            print(f'Agent {agent_id} disconnected')
    
    def on_heartbeat(self, data):
        """Handle heartbeat from agent"""
        agent = getattr(g, 'current_agent', None)
        if not agent:
            return
        
        # Update agent last seen
        agent.last_seen_at = datetime.utcnow()
        db.session.commit()
        
        # Acknowledge heartbeat
        emit('heartbeat_ack', {
            'timestamp': datetime.utcnow().isoformat(),
            'server_time': datetime.utcnow().timestamp()
        })
    
    def on_task_ack(self, data):
        """Handle task acknowledgment from agent"""
        agent = getattr(g, 'current_agent', None)
        if not agent:
            return
        
        task_id = data.get('task_id')
        attempt_id = data.get('attempt_id')
        
        print(f'Agent {agent.id} acknowledged task {task_id} (attempt {attempt_id})')
        
        # Broadcast to any interested parties (e.g., frontend)
        emit('task_assigned', {
            'task_id': task_id,
            'agent_id': agent.id,
            'attempt_id': attempt_id,
            'assigned_at': datetime.utcnow().isoformat()
        }, room=f'workspace:{agent.workspace_id}', broadcast=True)
    
    def on_metrics(self, data):
        """Handle metrics streaming from agent"""
        agent = getattr(g, 'current_agent', None)
        if not agent:
            return
        
        # Store metrics (optional, can be batched)
        from models import AgentMetrics
        metrics = AgentMetrics(
            agent_id=agent.id,
            workspace_id=agent.workspace_id,
            cpu_percent=data.get('cpu_percent'),
            memory_usage_mb=data.get('memory_usage_mb'),
            tasks_active=data.get('tasks_active', 0),
            tasks_completed=data.get('tasks_completed', 0),
            timestamp=datetime.utcnow()
        )
        db.session.add(metrics)
        db.session.commit()
        
        emit('metrics_ack', {'received': True})


# Helper function to push tasks to connected agents
def push_task_to_agent(agent_id, task_data):
    """Push a task to a connected agent via WebSocket"""
    from flask_socketio import emit as broadcast_emit
    broadcast_emit('task_assign', task_data, room=f'agent:{agent_id}', namespace='/agent/ws')


def broadcast_config_update(workspace_id, config_data):
    """Broadcast config update to all agents in workspace"""
    from flask_socketio import emit as broadcast_emit
    broadcast_emit('config_update', config_data, room=f'workspace:{workspace_id}', namespace='/agent/ws')


def send_command_to_agent(agent_id, command, args=None):
    """Send a remote command to a specific agent"""
    from flask_socketio import emit as broadcast_emit
    broadcast_emit('command', {
        'command': command,
        'args': args or {},
        'sent_at': datetime.utcnow().isoformat()
    }, room=f'agent:{agent_id}', namespace='/agent/ws')
```

### Step 2: Register namespace in app.py

In `todo-for-ai-api-server/app.py`, add:

```python
from api.agent_runtime_websocket import AgentRuntimeNamespace, socketio

# After socketio.init_app(app):
socketio.on_namespace(AgentRuntimeNamespace())
```

### Step 3: Create test script

Create `test_ws_connection.py`:

```python
import socketio
import sys

sio = socketio.Client()

@sio.event
def connect():
    print('Connected to WebSocket')

@sio.event
def disconnect():
    print('Disconnected from WebSocket')

@sio.on('auth_success')
def on_auth_success(data):
    print(f'Auth success: {data}')

@sio.on('auth_error')
def on_auth_error(data):
    print(f'Auth error: {data}')
    sys.exit(1)

@sio.on('task_assign')
def on_task_assign(data):
    print(f'Task assigned: {data}')

@sio.on('heartbeat_ack')
def on_heartbeat_ack(data):
    print(f'Heartbeat ack: {data}')

if __name__ == '__main__':
    # Connect with agent key
    # The namespace /agent/ws must be explicitly registered in the connect call
    sio.connect(
        'http://127.0.0.1:50110',
        namespaces=['/agent/ws'],
        auth={'agent_key': 'your-agent-key'}
    )
    sio.wait()
```

Run test:
```bash
python test_ws_connection.py
```

Expected: `Auth success: {...}`

### Step 4: Commit

```bash
git add todo-for-ai-api-server/api/agent_runtime_websocket.py test_ws_connection.py
git commit -m "feat(agent-runtime): implement WebSocket namespace handler"
```

---

## Task 3: Integrate WebSocket Push with Task Creation

**Files:**
- Modify: `todo-for-ai-api-server/api/tasks.py` (or task creation endpoint)
- Modify: `todo-for-ai-api-server/api/agent_runtime_websocket.py`
- Test: Create task via API, verify WebSocket push

### Step 1: Add WebSocket push helper to task creation endpoint

Find where tasks are created with `is_ai_task=True` (e.g., `todo-for-ai-api-server/api/tasks.py` or `ai_task_assistant_bp`). Add:

```python
from api.agent_runtime_websocket import push_task_to_agent

def _notify_agent_task_created(task):
    """Notify connected agents of new AI task via WebSocket"""
    from models import Agent
    try:
        agent = Agent.query.filter_by(
            workspace_id=task.workspace_id or task.owner_id,
            status='ACTIVE'
        ).first()
        if not agent:
            return False
        
        task_data = {
            'task_id': task.id,
            'project_id': task.project_id,
            'title': task.title,
            'content': task.content,
            'priority': str(task.priority) if task.priority else None,
            'created_at': task.created_at.isoformat() if task.created_at else None,
        }
        push_task_to_agent(agent.id, task_data)
        return True
    except Exception as e:
        print(f'Failed to push task via WebSocket: {e}')
        return False
```

### Step 2: Trigger push after task creation

After `db.session.commit()` when a new `is_ai_task=True` task is created:

```python
if task.is_ai_task:
    _notify_agent_task_created(task)
```

### Step 3: Test integration

1. Start backend with SocketIO
2. Connect Agent Runtime via WebSocket
3. Create a new AI task
4. Verify task is pushed via WebSocket

Expected: Agent Runtime receives `task_assign` event immediately after task creation.

### Step 4: Commit

```bash
git add todo-for-ai-api-server/api/agent_runtime_pull.py
git commit -m "feat(agent-runtime): integrate WebSocket push with task pull"
```

---

## Task 4: Update Agent Runtime WebSocket Client for Backend Compatibility

**Files:**
- Modify: `agent-runtime/src/runtime/websocket_client.py`
- Modify: `agent-runtime/src/runtime/main.py`
- Test: Verify Agent Runtime connects and receives tasks

### Step 1: Update WebSocket client to use python-socketio

Replace `websockets` with `socketio.Client` in `websocket_client.py`:

```python
"""
WebSocket Client - Real-time bidirectional communication using Socket.IO
"""

import asyncio
import json
import time
from typing import Any, Callable, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

import socketio
import structlog

logger = structlog.get_logger()


class WSMessageType(str, Enum):
    """WebSocket message types (mapped to Socket.IO events)"""
    AUTH = "auth"
    HEARTBEAT = "heartbeat"
    TASK_ACK = "task_ack"
    TASK_COMPLETE = "task_complete"
    EVENT = "event"
    METRICS = "metrics"
    
    # Server -> Client events
    AUTH_SUCCESS = "auth_success"
    AUTH_ERROR = "auth_error"
    TASK_ASSIGN = "task_assign"
    CONFIG_UPDATE = "config_update"
    COMMAND = "command"
    ERROR = "error"


class WebSocketClient:
    """WebSocket Client using Socket.IO"""
    
    def __init__(
        self,
        ws_url: str,
        agent_key: str,
        heartbeat_interval: float = 30.0,
        reconnect_delay: float = 5.0,
    ):
        self.ws_url = ws_url
        self.agent_key = agent_key
        self.heartbeat_interval = heartbeat_interval
        self.reconnect_delay = reconnect_delay
        
        self.sio = socketio.Client()
        self._running = False
        self._authenticated = False
        self._shutdown_event = asyncio.Event()
        
        # Callbacks
        self._callbacks: Dict[WSMessageType, List[Callable]] = {}
        self._default_callback: Optional[Callable[[Any], None]] = None
        
        # Setup event handlers
        self._setup_socketio_handlers()
    
    def _setup_socketio_handlers(self):
        """Setup Socket.IO event handlers"""
        @self.sio.on('connect')
        def on_connect():
            logger.info("websocket.connected")
            # Send auth immediately on connect
            self.sio.emit('auth', {'agent_key': self.agent_key})
        
        @self.sio.on('disconnect')
        def on_disconnect():
            logger.info("websocket.disconnected")
            self._authenticated = False
        
        @self.sio.on('auth_success')
        def on_auth_success(data):
            logger.info("websocket.authenticated", data=data)
            self._authenticated = True
            self._trigger_callbacks(WSMessageType.AUTH_SUCCESS, data)
        
        @self.sio.on('auth_error')
        def on_auth_error(data):
            logger.error("websocket.auth_failed", error=data.get('error'))
            self._authenticated = False
        
        @self.sio.on('task_assign')
        def on_task_assign(data):
            logger.info("websocket.task_assigned", task_id=data.get('task_id'))
            self._trigger_callbacks(WSMessageType.TASK_ASSIGN, data)
        
        @self.sio.on('config_update')
        def on_config_update(data):
            logger.info("websocket.config_update", keys=list(data.keys()))
            self._trigger_callbacks(WSMessageType.CONFIG_UPDATE, data)
        
        @self.sio.on('command')
        def on_command(data):
            logger.info("websocket.command_received", command=data.get('command'))
            self._trigger_callbacks(WSMessageType.COMMAND, data)
        
        @self.sio.on('heartbeat_ack')
        def on_heartbeat_ack(data):
            logger.debug("websocket.heartbeat_ack")
    
    def _trigger_callbacks(self, msg_type: WSMessageType, data: Any):
        """Trigger registered callbacks for message type"""
        callbacks = self._callbacks.get(msg_type, [])
        for callback in callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    asyncio.create_task(callback(data))
                else:
                    callback(data)
            except Exception as e:
                logger.error("websocket.callback_error", error=str(e))
        
        if self._default_callback:
            try:
                if asyncio.iscoroutinefunction(self._default_callback):
                    asyncio.create_task(self._default_callback(data))
                else:
                    self._default_callback(data)
            except Exception as e:
                logger.error("websocket.default_callback_error", error=str(e))
    
    def on(self, msg_type: WSMessageType, callback: Callable[[Any], None]):
        """Register message handler"""
        if msg_type not in self._callbacks:
            self._callbacks[msg_type] = []
        self._callbacks[msg_type].append(callback)
    
    def on_default(self, callback: Callable[[Any], None]):
        """Register default message handler"""
        self._default_callback = callback
    
    async def start(self):
        """Start WebSocket client"""
        logger.info("websocket.starting", url=self.ws_url)
        self._running = True
        
        # Connect in background thread (socketio is blocking)
        import threading
        def connect():
            try:
                self.sio.connect(
                    self.ws_url,
                    auth={'agent_key': self.agent_key},
                    wait_timeout=10
                )
            except Exception as e:
                logger.error("websocket.connection_error", error=str(e))
        
        thread = threading.Thread(target=connect)
        thread.daemon = True
        thread.start()
        
        # Start heartbeat loop
        asyncio.create_task(self._heartbeat_loop())
        
        logger.info("websocket.started")
    
    async def stop(self):
        """Stop WebSocket client"""
        logger.info("websocket.stopping")
        self._running = False
        self._shutdown_event.set()
        
        if self.sio.connected:
            self.sio.disconnect()
        
        logger.info("websocket.stopped")
    
    async def _heartbeat_loop(self):
        """Heartbeat loop"""
        while self._running and not self._shutdown_event.is_set():
            try:
                await asyncio.sleep(self.heartbeat_interval)
                
                if not self._authenticated:
                    continue
                
                self.sio.emit('heartbeat', {
                    'timestamp': time.time(),
                    'active_tasks': 0  # Will be updated by runtime
                })
                logger.debug("websocket.heartbeat_sent")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("websocket.heartbeat_error", error=str(e))
    
    def send_event(self, event_type: str, payload: Dict[str, Any]):
        """Send event to server"""
        self.sio.emit('event', {
            'event_type': event_type,
            'data': payload,
            'timestamp': time.time()
        })
    
    def ack_task(self, task_id: int, attempt_id: str):
        """Acknowledge task assignment"""
        self.sio.emit('task_ack', {
            'task_id': task_id,
            'attempt_id': attempt_id
        })
    
    def is_connected(self) -> bool:
        """Check if connected"""
        return self.sio.connected
    
    def is_authenticated(self) -> bool:
        """Check if authenticated"""
        return self._authenticated
```

### Step 2: Update main.py to use new WebSocket client

In `agent-runtime/src/runtime/main.py`, update imports:

```python
# Replace websockets import with socketio
from .websocket_client import WebSocketClient, WSMessageType
```

Update the WebSocket URL construction:

```python
# In AgentConfig.__init__:
if not self.ws_url and self.api_base_url:
    # Socket.IO connects to base URL and uses namespace separately
    self.ws_url = self.api_base_url.replace('/api/v1', '')
```

### Step 3: Update requirements

In `agent-runtime/requirements.txt`, replace `websockets` with:

```
python-socketio[client]==5.9.0
websocket-client==1.6.4
```

### Step 4: Test Agent Runtime WebSocket connection

Restart Agent Runtime and verify:

```
2026-04-06 16:08:15 [info] websocket.connected
2026-04-06 16:08:15 [info] websocket.authenticated
```

### Step 5: Commit

```bash
git add agent-runtime/src/runtime/websocket_client.py agent-runtime/src/runtime/main.py agent-runtime/requirements.txt
git commit -m "feat(agent-runtime): migrate WebSocket client to Socket.IO for backend compatibility"
```

---

## Task 5: End-to-End Integration Test

**Files:**
- Create: `tests/integration/test_agent_runtime_websocket.py`
- Test: Full flow: create task → WebSocket push → agent execution → result commit

### Step 1: Create integration test

```python
"""Integration test for Agent Runtime WebSocket"""
import pytest
import socketio
import httpx
import time
import json

class TestAgentRuntimeWebSocket:
    def test_websocket_auth_success(self, base_url, agent_key):
        """Test WebSocket connection with valid agent key"""
        sio = socketio.Client()
        connected = False
        authenticated = False
        
        @sio.on('connect')
        def on_connect():
            nonlocal connected
            connected = True
        
        @sio.on('auth_success')
        def on_auth_success(data):
            nonlocal authenticated
            authenticated = True
        
        sio.connect(
            f'{base_url}/todo-for-ai/api/v1',
            socketio_path='/agent/ws',
            auth={'agent_key': agent_key}
        )
        
        time.sleep(1)
        
        assert connected
        assert authenticated
        sio.disconnect()
    
    def test_task_push_via_websocket(self, base_url, agent_key, auth_token):
        """Test task is pushed via WebSocket when created"""
        sio = socketio.Client()
        task_received = None
        
        @sio.on('task_assign')
        def on_task_assign(data):
            nonlocal task_received
            task_received = data
        
        # Connect agent
        sio.connect(
            f'{base_url}/todo-for-ai/api/v1',
            socketio_path='/agent/ws',
            auth={'agent_key': agent_key}
        )
        time.sleep(1)
        
        # Create a task via HTTP API
        resp = httpx.post(
            f'{base_url}/todo-for-ai/api/v1/tasks',
            json={
                'title': 'WebSocket Test Task',
                'content': json.dumps({'prompt': 'test'}),
                'is_ai_task': True
            },
            headers={'Authorization': f'Bearer {auth_token}'}
        )
        assert resp.status_code == 201
        
        # Wait for WebSocket push
        time.sleep(2)
        
        assert task_received is not None
        assert 'task_id' in task_received
        
        sio.disconnect()
```

### Step 2: Run integration test

```bash
cd todo-for-ai-api-server
pytest tests/integration/test_agent_runtime_websocket.py -v
```

Expected: All tests pass.

### Step 3: Commit

```bash
git add tests/integration/test_agent_runtime_websocket.py
git commit -m "test(agent-runtime): add WebSocket integration tests"
```

---

## Task 6: Documentation and Cleanup

**Files:**
- Create: `docs/agent-runtime/websocket-protocol.md`
- Modify: `README.md` (update Agent Runtime section)

### Step 1: Document WebSocket protocol

Create `docs/agent-runtime/websocket-protocol.md`:

```markdown
# Agent Runtime WebSocket Protocol

## Connection

Connect to: `ws://<host>:<port>/todo-for-ai/api/v1/agent/ws`

Authentication: Pass `agent_key` in connection auth:
```javascript
const socket = io('/agent/ws', {
  auth: { agent_key: 'agk_...' }
});
```

## Events

### Client → Server

- `auth` - Initial authentication
- `heartbeat` - Keepalive and health reporting
- `task_ack` - Acknowledge task assignment
- `task_complete` - Report task completion
- `event` - Generic event reporting
- `metrics` - System metrics streaming

### Server → Client

- `auth_success` - Authentication successful
- `auth_error` - Authentication failed
- `task_assign` - New task assigned to agent
- `config_update` - Configuration update
- `command` - Remote command (reload, shutdown, etc.)
- `heartbeat_ack` - Heartbeat acknowledgment

## Example Flow

1. Agent connects with `agent_key`
2. Server responds with `auth_success`
3. Agent sends periodic `heartbeat`
4. When task created, server emits `task_assign`
5. Agent responds with `task_ack`
6. Agent executes task and calls HTTP commit endpoint
```

### Step 2: Commit documentation

```bash
git add docs/agent-runtime/websocket-protocol.md
git commit -m "docs(agent-runtime): document WebSocket protocol"
```

---

## Acceptance Criteria

- [ ] Flask-SocketIO installed and initialized
- [ ] `/agent/ws` namespace handler created with auth
- [ ] Agent can connect via WebSocket and authenticate
- [ ] Tasks are pushed via WebSocket when created
- [ ] Agent Runtime uses Socket.IO client (not raw websockets)
- [ ] Heartbeat works bidirectionally
- [ ] Integration tests pass
- [ ] Documentation complete
