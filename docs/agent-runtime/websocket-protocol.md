# Agent Runtime WebSocket Protocol

## Overview

The Agent Runtime WebSocket protocol enables real-time bidirectional communication between Agent Runtime clients and the Todo for AI Platform. It complements the HTTP API by providing instant notifications for task assignments, configuration updates, and remote commands.

## Connection

### Endpoint

```
ws://<host>:<port>/agent/ws
```

For production:
```
wss://api.todo-for-ai.com/agent/ws
```

### Authentication

Authentication is performed during connection establishment using the `agent_key`:

```javascript
const socket = io('/agent/ws', {
  auth: { agent_key: 'agk_...' }
});
```

Or in Python:
```python
import socketio

sio = socketio.Client()
sio.connect(
    'http://127.0.0.1:50110',
    namespaces=['/agent/ws'],
    auth={'agent_key': 'agk_...'}
)
```

### Connection Events

- `connect` - Connection established
- `auth_success` - Authentication successful, payload includes `agent_id` and `workspace_id`
- `auth_error` - Authentication failed
- `disconnect` - Connection closed

## Client → Server Events

### `heartbeat`

Sent periodically to maintain connection and report agent health.

```json
{
  "timestamp": 1775501234.567,
  "active_tasks": 3
}
```

Server responds with `heartbeat_ack`.

### `task_ack`

Acknowledge receipt of a task assignment.

```json
{
  "task_id": 123,
  "attempt_id": "att_abc123"
}
```

### `event`

Generic event reporting (task progress, logs, etc.).

```json
{
  "event_type": "task.progress",
  "data": {
    "task_id": 123,
    "step": "processing",
    "progress": 50
  },
  "timestamp": 1775501234.567
}
```

### `metrics`

System metrics streaming (CPU, memory, etc.).

```json
{
  "cpu_percent": 45.2,
  "memory_usage_mb": 512,
  "tasks_active": 2,
  "tasks_completed": 10
}
```

## Server → Client Events

### `task_assign`

Pushed when a new AI task is assigned to the agent.

```json
{
  "task_id": 123,
  "attempt_id": "att_abc123",
  "lease_id": "lea_def456",
  "project_id": 5,
  "title": "Implement feature X",
  "payload": {
    "prompt": "Write a function to...",
    "context": {"language": "python"}
  },
  "priority": "HIGH",
  "workspace_id": 1,
  "created_at": "2026-04-06T18:30:00.000000"
}
```

### `config_update`

Pushed when agent configuration is updated.

```json
{
  "max_concurrent_tasks": 5,
  "heartbeat_interval": 30,
  "log_level": "INFO"
}
```

### `command`

Remote command from platform to agent.

```json
{
  "command": "reload_config",
  "args": {},
  "sent_at": "2026-04-06T18:30:00.000000"
}
```

Supported commands:
- `reload_config` - Reload configuration
- `report_status` - Request immediate status report
- `graceful_shutdown` - Initiate graceful shutdown

### `heartbeat_ack`

Acknowledgment of heartbeat.

```json
{
  "timestamp": "2026-04-06T18:30:01.000000",
  "server_time": 1775501401.0
}
```

## Example Flow

### 1. Agent Connects

```
Client: connect(namespace='/agent/ws', auth={'agent_key': 'agk_...'})
Server: auth_success {agent_id: 1, workspace_id: 1}
```

### 2. Heartbeat Loop

```
Client (every 30s): heartbeat {timestamp, active_tasks}
Server: heartbeat_ack {timestamp, server_time}
```

### 3. Task Assignment

```
Server: task_assign {task_id, attempt_id, lease_id, payload, ...}
Client: task_ack {task_id, attempt_id}
Client: [Executes task via OpenClaw]
Client: [Commits result via HTTP API]
```

### 4. Configuration Update

```
Server: config_update {max_concurrent_tasks: 10}
Client: [Applies new configuration]
```

## Error Handling

### Connection Errors

- Reconnect with exponential backoff
- Maximum retry attempts: 10
- Initial delay: 5 seconds

### Authentication Errors

- On `auth_error`, disconnect and retry with new credentials
- Log error details for debugging

### Message Errors

- Invalid messages are logged and ignored
- Callback errors don't crash the connection

## Implementation Notes

### Flask-SocketIO (Backend)

```python
from flask_socketio import Namespace, emit, join_room

class AgentRuntimeNamespace(Namespace):
    def on_connect(self, auth=None):
        # Authenticate and join rooms
        join_room(f'agent:{agent.id}')
        join_room(f'workspace:{agent.workspace_id}')
        emit('auth_success', {...})

    def on_heartbeat(self, data):
        # Update agent last_seen_at
        emit('heartbeat_ack', {...})
```

### python-socketio (Client)

```python
import socketio

class WebSocketClient:
    def __init__(self, ws_url, agent_key):
        self.sio = socketio.Client()
        self.sio.on('task_assign', namespace='/agent/ws')(self._on_task_assign)

    def _on_task_assign(self, data):
        print(f"Task assigned: {data['task_id']}")
        self.sio.emit('task_ack', {
            'task_id': data['task_id'],
            'attempt_id': data['attempt_id']
        }, namespace='/agent/ws')
```

## Testing

### Integration Tests

See `tests/integration/test_agent_runtime_websocket.py` for examples:

```python
def test_websocket_auth_success(app, agent_with_key):
    from app import socketio
    agent, raw_key = agent_with_key

    with app.app_context():
        client = socketio.test_client(
            app,
            namespace='/agent/ws',
            auth={'agent_key': raw_key},
        )
        assert client.is_connected('/agent/ws')
        received = client.get_received('/agent/ws')
        assert 'auth_success' in [msg['name'] for msg in received]
```

## Migration from Raw WebSockets

If migrating from raw WebSocket implementation:

1. Replace `websockets` library with `python-socketio[client]`
2. Update connection URL (remove `/agent/ws` path, use as namespace)
3. Replace message framing with Socket.IO events
4. Update authentication from headers to `auth` parameter
5. Handle reconnection automatically (built into Socket.IO)

## See Also

- [Agent Runtime Architecture](../../agent-runtime/README.md)
- [HTTP API Documentation](../api/README.md)
- [Flask-SocketIO Documentation](https://flask-socketio.readthedocs.io/)
- [python-socketio Documentation](https://python-socketio.readthedocs.io/)
