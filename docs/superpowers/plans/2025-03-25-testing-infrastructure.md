# 完善单元测试与回归测试机制实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 todo-for-ai 项目建立完善的单元测试与回归测试机制，覆盖 Python 后端、TypeScript MCP 和 React 前端

**Architecture:** 采用分层测试策略 - 单元测试（各模块独立）+ 集成测试（模块间交互）+ E2E 测试（端到端）。Python 使用 pytest 生态，前端/MCP 使用 Vitest 统一测试框架，回归测试通过自动化脚本和 CI 集成实现。

**Tech Stack:**
- Python: pytest + pytest-asyncio + pytest-cov + factory-boy + faker
- TypeScript/MCP: Vitest + @vitest/coverage-v8
- React: Vitest + @testing-library/react + @testing-library/jest-dom + jsdom
- E2E: Playwright (已有)
- CI/CD: GitHub Actions

---

## 文件结构总览

```
.
├── agent-runtime/
│   ├── pytest.ini                    # pytest 配置
│   ├── requirements-dev.txt          # 开发依赖
│   ├── conftest.py                   # 共享 fixtures
│   └── tests/
│       ├── unit/                     # 单元测试
│       ├── integration/              # 集成测试
│       └── fixtures/                 # 测试数据
├── todo-for-ai-api-server/
│   ├── pytest.ini
│   ├── requirements-dev.txt
│   ├── conftest.py
│   └── tests/
│       ├── unit/
│       │   ├── api/
│       │   ├── core/
│       │   └── models/
│       ├── integration/
│       └── fixtures/
├── todo-for-ai-mcp/
│   ├── vitest.config.ts              # Vitest 配置
│   ├── package.json                  # 添加测试脚本和依赖
│   └── tests/
│       ├── unit/
│       └── fixtures/
├── todo-for-ai-webpage/
│   ├── vitest.config.ts
│   ├── package.json                  # 添加测试脚本和依赖
│   └── tests/
│       ├── unit/
│       ├── integration/
│       └── setup.ts                  # 测试环境设置
└── scripts/
    ├── run-all-tests.sh              # 统一测试入口
    ├── run-regression.sh             # 回归测试脚本
    └── generate-test-report.py       # 测试报告生成
```

---

## Task 1: Python 后端测试 - agent-runtime

**Files:**
- Create: `agent-runtime/pytest.ini`
- Create: `agent-runtime/requirements-dev.txt`
- Create: `agent-runtime/conftest.py`
- Create: `agent-runtime/tests/unit/test_runtime.py`
- Create: `agent-runtime/tests/unit/test_tools.py`
- Create: `agent-runtime/tests/unit/test_security.py`
- Modify: `agent-runtime/requirements.txt` (添加测试依赖)

### Step 1.1: 创建 pytest 配置

```ini
[pytest]
asyncio_mode = auto
asyncio_default_fixture_loop_scope = function
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --tb=short
    --strict-markers
    --cov=src
    --cov-report=term-missing
    --cov-report=html:htmlcov
    --cov-report=xml:coverage.xml
    --cov-fail-under=70
markers =
    unit: Unit tests
    integration: Integration tests
    slow: Slow tests
    asyncio: Async tests
```

### Step 1.2: 创建开发依赖文件

```txt
# Testing framework
pytest>=8.0.0
pytest-asyncio>=0.23.0
pytest-cov>=4.1.0
pytest-mock>=3.12.0
pytest-xdist>=3.5.0

# Test data generation
factory-boy>=3.3.0
faker>=23.0.0

# HTTP testing
respx>=0.20.0
httpx>=0.27.0

# Type checking
mypy>=1.8.0
```

### Step 1.3: 创建共享 fixtures

```python
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from pathlib import Path

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def mock_platform_api():
    """Mock platform API client."""
    api = MagicMock()
    api.get_task = AsyncMock()
    api.update_task = AsyncMock()
    api.create_task = AsyncMock()
    return api

@pytest.fixture
def mock_llm_client():
    """Mock LLM client."""
    client = MagicMock()
    client.complete = AsyncMock(return_value={
        "content": "Test response",
        "usage": {"prompt_tokens": 10, "completion_tokens": 5}
    })
    return client

@pytest.fixture
def temp_workspace(tmp_path):
    """Create temporary workspace for tests."""
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    return workspace
```

### Step 1.4: 编写 Runtime 单元测试

```python
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.runtime.runtime import AgentRuntime
from src.runtime.config import RuntimeConfig

class TestAgentRuntime:
    """Test AgentRuntime class."""

    @pytest.mark.asyncio
    async def test_runtime_initialization(self, mock_platform_api, mock_llm_client):
        """Test runtime initializes correctly."""
        config = RuntimeConfig(
            agent_id="test-agent",
            platform_api_url="http://localhost:8000"
        )

        runtime = AgentRuntime(config)
        assert runtime.config.agent_id == "test-agent"
        assert runtime.running is False

    @pytest.mark.asyncio
    async def test_runtime_start_stop(self, mock_platform_api):
        """Test runtime start and stop lifecycle."""
        config = RuntimeConfig(agent_id="test-agent")
        runtime = AgentRuntime(config)
        runtime.platform_api = mock_platform_api

        # Start
        await runtime.start()
        assert runtime.running is True

        # Stop
        await runtime.stop()
        assert runtime.running is False

    @pytest.mark.asyncio
    async def test_task_execution(self, mock_platform_api):
        """Test task execution flow."""
        config = RuntimeConfig(agent_id="test-agent")
        runtime = AgentRuntime(config)
        runtime.platform_api = mock_platform_api

        mock_task = {
            "id": "task-1",
            "type": "code_review",
            "input": {"code": "def hello(): pass"}
        }
        mock_platform_api.get_task.return_value = mock_task

        result = await runtime.execute_task(mock_task)
        assert result["status"] == "completed"
```

### Step 1.5: 编写 Tools 单元测试

```python
import pytest
from src.tools.code_tools import CodeAnalyzer
from src.tools.file_tools import FileManager

class TestCodeAnalyzer:
    """Test CodeAnalyzer tool."""

    def test_analyze_python_function(self):
        """Test analyzing Python function."""
        analyzer = CodeAnalyzer()
        code = """
def hello_world(name: str) -> str:
    \"\"\"Say hello to someone.\"\"\"
    return f"Hello, {name}!"
"""
        result = analyzer.analyze(code, language="python")
        assert result["functions"] == 1
        assert result["complexity"] > 0

    def test_analyze_empty_code(self):
        """Test analyzing empty code."""
        analyzer = CodeAnalyzer()
        result = analyzer.analyze("", language="python")
        assert result["functions"] == 0

class TestFileManager:
    """Test FileManager tool."""

    def test_read_file(self, temp_workspace):
        """Test reading file."""
        test_file = temp_workspace / "test.txt"
        test_file.write_text("Hello, World!")

        fm = FileManager(root_path=temp_workspace)
        content = fm.read("test.txt")
        assert content == "Hello, World!"

    def test_write_file(self, temp_workspace):
        """Test writing file."""
        fm = FileManager(root_path=temp_workspace)
        fm.write("output.txt", "Test content")

        assert (temp_workspace / "output.txt").read_text() == "Test content"
```

### Step 1.6: 更新 requirements.txt

添加测试依赖到主 requirements.txt：
```
# Testing (uncomment for development)
pytest>=8.0.0
pytest-asyncio>=0.23.0
pytest-cov>=4.1.0
```

---

## Task 2: Python 后端测试 - todo-for-ai-api-server

**Files:**
- Create: `todo-for-ai-api-server/pytest.ini`
- Create: `todo-for-ai-api-server/requirements-dev.txt`
- Create: `todo-for-ai-api-server/conftest.py`
- Create: `todo-for-ai-api-server/tests/unit/models/test_user.py`
- Create: `todo-for-ai-api-server/tests/unit/api/test_auth.py`
- Create: `todo-for-ai-api-server/tests/integration/test_api_flow.py`
- Modify: `todo-for-ai-api-server/requirements.txt` (取消测试依赖注释)

### Step 2.1: 创建 pytest 配置

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --tb=short
    --strict-markers
    --cov=.
    --cov-report=term-missing
    --cov-report=html:htmlcov
    --cov-report=xml:coverage.xml
    --cov-fail-under=60
    --ignore=venv
    --ignore=.venv
markers =
    unit: Unit tests
    integration: Integration tests
    api: API tests
    slow: Slow tests
```

### Step 2.2: 创建开发依赖

```txt
# Testing
pytest>=7.4.3
pytest-flask>=1.3.0
pytest-cov>=4.1.0
pytest-mock>=3.12.0
pytest-xdist>=3.5.0

# Test data
factory-boy>=3.3.0
faker>=23.0.0

# Code quality
black>=23.11.0
flake8>=6.1.0
isort>=5.12.0
mypy>=1.7.0
```

### Step 2.3: 创建 Flask fixtures

```python
import pytest
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

from app import create_app
from models import db, User, Task, Project

@pytest.fixture(scope="session")
def app():
    """Create application for testing."""
    app = create_app(testing=True)
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": "test-secret-key",
        "WTF_CSRF_ENABLED": False,
    })

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """Create test CLI runner."""
    return app.test_cli_runner()

@pytest.fixture
def auth_headers(client):
    """Create authenticated user and return headers."""
    # Register user
    client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123"
    })

    # Login
    response = client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "testpassword123"
    })

    token = response.json["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def db_session(app):
    """Provide database session for tests."""
    with app.app_context():
        yield db.session
        db.session.rollback()
```

### Step 2.4: 编写 User Model 测试

```python
import pytest
from models import User

class TestUserModel:
    """Test User model."""

    def test_create_user(self, db_session):
        """Test creating user."""
        user = User(
            username="testuser",
            email="test@example.com"
        )
        user.set_password("password123")
        db_session.add(user)
        db_session.commit()

        assert user.id is not None
        assert user.username == "testuser"
        assert user.email == "test@example.com"

    def test_user_password_hashing(self, db_session):
        """Test password is properly hashed."""
        user = User(username="testuser", email="test@example.com")
        user.set_password("password123")

        assert user.password_hash != "password123"
        assert user.check_password("password123") is True
        assert user.check_password("wrongpassword") is False

    def test_user_unique_constraints(self, db_session):
        """Test unique constraints."""
        user1 = User(username="testuser", email="test1@example.com")
        user1.set_password("password123")
        db_session.add(user1)
        db_session.commit()

        # Duplicate username should fail
        user2 = User(username="testuser", email="test2@example.com")
        user2.set_password("password123")
        db_session.add(user2)

        with pytest.raises(Exception):
            db_session.commit()
```

### Step 2.5: 编写 Auth API 测试

```python
import pytest

class TestAuthAPI:
    """Test Authentication API endpoints."""

    def test_register_success(self, client):
        """Test successful registration."""
        response = client.post("/api/auth/register", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "securepassword123"
        })

        assert response.status_code == 201
        assert "access_token" in response.json
        assert "refresh_token" in response.json

    def test_register_duplicate_username(self, client):
        """Test registration with duplicate username."""
        # First registration
        client.post("/api/auth/register", json={
            "username": "existing",
            "email": "first@example.com",
            "password": "password123"
        })

        # Duplicate registration
        response = client.post("/api/auth/register", json={
            "username": "existing",
            "email": "second@example.com",
            "password": "password123"
        })

        assert response.status_code == 409

    def test_login_success(self, client):
        """Test successful login."""
        # Register first
        client.post("/api/auth/register", json={
            "username": "logintest",
            "email": "login@example.com",
            "password": "password123"
        })

        # Login
        response = client.post("/api/auth/login", json={
            "username": "logintest",
            "password": "password123"
        })

        assert response.status_code == 200
        assert "access_token" in response.json

    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        response = client.post("/api/auth/login", json={
            "username": "nonexistent",
            "password": "wrongpassword"
        })

        assert response.status_code == 401

    def test_get_current_user(self, client, auth_headers):
        """Test getting current user info."""
        response = client.get("/api/auth/me", headers=auth_headers)

        assert response.status_code == 200
        assert response.json["username"] == "testuser"

    def test_protected_endpoint_without_auth(self, client):
        """Test accessing protected endpoint without auth."""
        response = client.get("/api/auth/me")

        assert response.status_code == 401
```

### Step 2.6: 编写集成测试

```python
import pytest

class TestAPIFlow:
    """Test complete API workflows."""

    def test_complete_task_workflow(self, client, auth_headers):
        """Test complete task lifecycle."""
        # Create project
        project_response = client.post(
            "/api/projects",
            json={"name": "Test Project", "description": "Test"},
            headers=auth_headers
        )
        project_id = project_response.json["id"]

        # Create task
        task_response = client.post(
            "/api/tasks",
            json={
                "title": "Test Task",
                "description": "Test description",
                "project_id": project_id
            },
            headers=auth_headers
        )
        task_id = task_response.json["id"]
        assert task_response.status_code == 201

        # Get task
        get_response = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
        assert get_response.status_code == 200
        assert get_response.json["title"] == "Test Task"

        # Update task
        update_response = client.put(
            f"/api/tasks/{task_id}",
            json={"status": "in_progress"},
            headers=auth_headers
        )
        assert update_response.status_code == 200
        assert update_response.json["status"] == "in_progress"

        # Delete task
        delete_response = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
        assert delete_response.status_code == 204
```

### Step 2.7: 取消 requirements.txt 中的测试依赖注释

取消以下行的注释：
```
pytest==7.4.3
pytest-flask==1.3.0
pytest-cov==4.1.0
```

---

## Task 3: TypeScript/MCP 测试配置

**Files:**
- Create: `todo-for-ai-mcp/vitest.config.ts`
- Create: `todo-for-ai-mcp/tests/setup.ts`
- Create: `todo-for-ai-mcp/tests/unit/tools.test.ts`
- Create: `todo-for-ai-mcp/tests/unit/server.test.ts`
- Modify: `todo-for-ai-mcp/package.json`

### Step 3.1: 创建 Vitest 配置

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'lib'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        'lib/',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    setupFiles: ['./tests/setup.ts'],
  },
});
```

### Step 3.2: 创建测试环境设置

```typescript
// tests/setup.ts
import { vi } from 'vitest';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.API_BASE_URL = 'http://localhost:8000';
process.env.API_TOKEN = 'test-token';

// Global mocks
global.fetch = vi.fn();
```

### Step 3.3: 创建 Tools 测试

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskTools } from '../../src/tools/task-tools';
import { ApiClient } from '../../src/api-client';

describe('TaskTools', () => {
  let mockApiClient: ApiClient;
  let taskTools: TaskTools;

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as ApiClient;

    taskTools = new TaskTools(mockApiClient);
  });

  describe('getTask', () => {
    it('should return task when found', async () => {
      const mockTask = {
        id: 'task-1',
        title: 'Test Task',
        status: 'pending',
      };
      mockApiClient.get = vi.fn().mockResolvedValue(mockTask);

      const result = await taskTools.getTask({ taskId: 'task-1' });

      expect(result).toEqual(mockTask);
      expect(mockApiClient.get).toHaveBeenCalledWith('/tasks/task-1');
    });

    it('should throw error when task not found', async () => {
      mockApiClient.get = vi.fn().mockRejectedValue(new Error('Not found'));

      await expect(taskTools.getTask({ taskId: 'nonexistent' }))
        .rejects.toThrow('Not found');
    });
  });

  describe('createTask', () => {
    it('should create task with valid data', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
      };
      const createdTask = { id: 'task-2', ...taskData };
      mockApiClient.post = vi.fn().mockResolvedValue(createdTask);

      const result = await taskTools.createTask(taskData);

      expect(result).toEqual(createdTask);
      expect(mockApiClient.post).toHaveBeenCalledWith('/tasks', taskData);
    });
  });
});
```

### Step 3.4: 创建 Server 测试

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from '../../src/server';

describe('MCP Server', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createServer({
      apiBaseUrl: 'http://localhost:8000',
      apiToken: 'test-token',
    });
  });

  describe('Health endpoint', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({ status: 'healthy' });
    });
  });

  describe('MCP endpoint', () => {
    it('should handle valid MCP requests', async () => {
      const mcpRequest = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      };

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      expect(response.body.jsonrpc).toBe('2.0');
      expect(response.body.id).toBe(1);
    });

    it('should reject invalid JSON-RPC requests', async () => {
      const invalidRequest = { method: 'tools/list' };

      await request(app)
        .post('/mcp')
        .send(invalidRequest)
        .expect(400);
    });
  });
});
```

### Step 3.5: 更新 package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  },
  "devDependencies": {
    "@vitest/coverage-v8": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Task 4: React 前端测试配置

**Files:**
- Create: `todo-for-ai-webpage/vitest.config.ts`
- Create: `todo-for-ai-webpage/tests/setup.ts`
- Create: `todo-for-ai-webpage/tests/unit/components/Button.test.tsx`
- Create: `todo-for-ai-webpage/tests/unit/hooks/useAuth.test.ts`
- Create: `todo-for-ai-webpage/tests/unit/stores/taskStore.test.ts`
- Modify: `todo-for-ai-webpage/package.json`

### Step 4.1: 创建 Vitest 配置

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

### Step 4.2: 创建测试环境设置

```typescript
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

### Step 4.3: 创建 Button 组件测试

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../../src/components/common/Button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should show loading spinner when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('disabled');
  });

  it('should apply variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });
});
```

### Step 4.4: 创建 useAuth Hook 测试

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../../src/hooks/useAuth';
import * as authApi from '../../../src/api/auth';

vi.mock('../../../src/api/auth');

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with unauthenticated state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('should handle successful login', async () => {
    const mockUser = { id: '1', username: 'testuser' };
    const mockResponse = {
      access_token: 'test-token',
      user: mockUser,
    };

    vi.mocked(authApi.login).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('testuser', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(localStorage.getItem('token')).toBe('test-token');
  });

  it('should handle login failure', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await expect(result.current.login('testuser', 'wrongpass'))
        .rejects.toThrow('Invalid credentials');
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle logout', () => {
    localStorage.setItem('token', 'test-token');

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });
});
```

### Step 4.5: 创建 Task Store 测试

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskStore, useTaskStore } from '../../../src/stores/taskStore';
import * as taskApi from '../../../src/api/tasks';

vi.mock('../../../src/api/tasks');

describe('taskStore', () => {
  beforeEach(() => {
    taskStore.setState({
      tasks: [],
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('should add task', () => {
    const newTask = { id: '1', title: 'New Task' };

    taskStore.getState().addTask(newTask);

    expect(taskStore.getState().tasks).toContainEqual(newTask);
  });

  it('should remove task', () => {
    taskStore.setState({
      tasks: [{ id: '1', title: 'Task 1' }, { id: '2', title: 'Task 2' }],
    });

    taskStore.getState().removeTask('1');

    expect(taskStore.getState().tasks).toHaveLength(1);
    expect(taskStore.getState().tasks[0].id).toBe('2');
  });

  it('should update task', () => {
    taskStore.setState({
      tasks: [{ id: '1', title: 'Old Title', status: 'pending' }],
    });

    taskStore.getState().updateTask('1', { title: 'New Title' });

    expect(taskStore.getState().tasks[0].title).toBe('New Title');
  });

  it('should set loading state', () => {
    taskStore.getState().setLoading(true);
    expect(taskStore.getState().loading).toBe(true);

    taskStore.getState().setLoading(false);
    expect(taskStore.getState().loading).toBe(false);
  });

  it('should set error', () => {
    const error = 'Network error';
    taskStore.getState().setError(error);
    expect(taskStore.getState().error).toBe(error);
  });
});
```

### Step 4.6: 更新 package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^14.2.0",
    "@testing-library/user-event": "^14.5.0",
    "@vitest/coverage-v8": "^1.2.0",
    "@vitest/ui": "^1.2.0",
    "jsdom": "^24.0.0",
    "vitest": "^1.2.0"
  }
}
```

---

## Task 5: 回归测试机制

**Files:**
- Create: `scripts/run-all-tests.sh`
- Create: `scripts/run-regression.sh`
- Create: `scripts/generate-test-report.py`
- Create: `.github/workflows/test.yml`
- Create: `docs/testing-guide.md`

### Step 5.1: 创建统一测试脚本

```bash
#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}   Running All Tests for todo-for-ai   ${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

FAILED=0

# Function to run tests with error handling
run_tests() {
    local name=$1
    local cmd=$2
    local dir=$3

    echo -e "${YELLOW}Running $name tests...${NC}"
    cd "$dir" || exit 1

    if eval "$cmd"; then
        echo -e "${GREEN}✓ $name tests passed${NC}"
    else
        echo -e "${RED}✗ $name tests failed${NC}"
        FAILED=1
    fi

    cd - > /dev/null || exit 1
    echo ""
}

# Run agent-runtime tests
run_tests "agent-runtime (Python)" "python -m pytest tests/ -v --cov=src --cov-report=term-missing" "agent-runtime"

# Run API server tests
run_tests "API Server (Python)" "python -m pytest tests/ -v --cov=. --cov-report=term-missing" "todo-for-ai-api-server"

# Run MCP tests
run_tests "MCP (TypeScript)" "npm run test:coverage" "todo-for-ai-mcp"

# Run Frontend tests
run_tests "Frontend (React)" "npm run test:coverage" "todo-for-ai-webpage"

# Generate report
echo -e "${YELLOW}Generating test report...${NC}"
python scripts/generate-test-report.py

# Summary
echo ""
echo -e "${YELLOW}========================================${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}   All tests passed! ✓${NC}"
else
    echo -e "${RED}   Some tests failed! ✗${NC}"
fi
echo -e "${YELLOW}========================================${NC}"

exit $FAILED
```

### Step 5.2: 创建回归测试脚本

```bash
#!/bin/bash
set -e

# Regression Test Script
# Runs comprehensive tests before releases

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Regression Test Suite              ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

START_TIME=$(date +%s)
REPORT_FILE="regression-report-$(date +%Y%m%d-%H%M%S).json"

# Initialize report
echo '{"started_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "results": {}}' > "$REPORT_FILE"

# Step 1: Static Analysis
echo -e "${YELLOW}Step 1/5: Static Analysis...${NC}"

# Python linting
cd agent-runtime || exit 1
python -m flake8 src/ --max-line-length=100 --exit-zero || true
python -m mypy src/ --ignore-missing-imports --exit-zero || true
cd - > /dev/null || exit 1

cd todo-for-ai-api-server || exit 1
python -m flake8 . --max-line-length=100 --exit-zero --exclude=venv,.venv,migrations || true
cd - > /dev/null || exit 1

# TypeScript linting
cd todo-for-ai-mcp || exit 1
npm run lint || true
cd - > /dev/null || exit 1

cd todo-for-ai-webpage || exit 1
npm run lint || true
cd - > /dev/null || exit 1

echo -e "${GREEN}✓ Static analysis complete${NC}"
echo ""

# Step 2: Unit Tests
echo -e "${YELLOW}Step 2/5: Running Unit Tests...${NC}"
./scripts/run-all-tests.sh || true
echo -e "${GREEN}✓ Unit tests complete${NC}"
echo ""

# Step 3: Integration Tests
echo -e "${YELLOW}Step 3/5: Running Integration Tests...${NC}"

# API integration tests
cd todo-for-ai-api-server || exit 1
python -m pytest tests/integration/ -v --tb=short || true
cd - > /dev/null || exit 1

# MCP integration tests
cd todo-for-ai-mcp || exit 1
npm run test -- --runInBand || true
cd - > /dev/null || exit 1

echo -e "${GREEN}✓ Integration tests complete${NC}"
echo ""

# Step 4: E2E Tests
echo -e "${YELLOW}Step 4/5: Running E2E Tests...${NC}"
if [ -f "playwright.config.ts" ]; then
    npx playwright test || true
else
    echo -e "${YELLOW}No Playwright config found, skipping E2E tests${NC}"
fi
echo -e "${GREEN}✓ E2E tests complete${NC}"
echo ""

# Step 5: Security Checks
echo -e "${YELLOW}Step 5/5: Security Checks...${NC}"

# Check for common security issues
if command -v bandit &> /dev/null; then
    cd agent-runtime || exit 1
    bandit -r src/ -f json -o ../../bandit-report.json || true
    cd - > /dev/null || exit 1
fi

if command -v npm_audit &> /dev/null; then
    cd todo-for-ai-mcp || exit 1
    npm audit --json > ../npm-audit-mcp.json || true
    cd - > /dev/null || exit 1

    cd todo-for-ai-webpage || exit 1
    npm audit --json > ../npm-audit-webpage.json || true
    cd - > /dev/null || exit 1
fi

echo -e "${GREEN}✓ Security checks complete${NC}"
echo ""

# Generate final report
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "{\"completed_at\": \""$(date -u +%Y-%m-%dT%H:%M:%SZ)"\", \"duration_seconds\": $DURATION}" >> "$REPORT_FILE"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Regression Test Complete            ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Duration: ${DURATION}s"
echo -e "Report: $REPORT_FILE"
```

### Step 5.3: 创建测试报告生成脚本

```python
#!/usr/bin/env python3
"""Generate comprehensive test report from all test results."""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Any


def load_coverage_xml(path: Path) -> Dict[str, Any]:
    """Parse coverage XML file."""
    import xml.etree.ElementTree as ET

    if not path.exists():
        return {"error": "Coverage file not found"}

    try:
        tree = ET.parse(path)
        root = tree.getroot()
        return {
            "line_rate": float(root.attrib.get("line-rate", 0)),
            "branch_rate": float(root.attrib.get("branch-rate", 0)),
            "lines_valid": int(root.attrib.get("lines-valid", 0)),
            "lines_covered": int(root.attrib.get("lines-covered", 0)),
        }
    except Exception as e:
        return {"error": str(e)}


def load_coverage_json(path: Path) -> Dict[str, Any]:
    """Load coverage from JSON file."""
    if not path.exists():
        return {"error": "Coverage file not found"}

    try:
        with open(path) as f:
            data = json.load(f)
        return {
            "line_rate": data.get("total", {}).get("lines", {}).get("pct", 0) / 100,
            "functions_rate": data.get("total", {}).get("functions", {}).get("pct", 0) / 100,
            "branches_rate": data.get("total", {}).get("branches", {}).get("pct", 0) / 100,
        }
    except Exception as e:
        return {"error": str(e)}


def generate_report():
    """Generate comprehensive test report."""
    report = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "summary": {
            "total_projects": 4,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
        },
        "projects": {},
    }

    # agent-runtime
    report["projects"]["agent-runtime"] = {
        "language": "Python",
        "framework": "pytest",
        "coverage": load_coverage_xml(
            Path("agent-runtime/coverage.xml")
        ),
    }

    # API server
    report["projects"]["api-server"] = {
        "language": "Python",
        "framework": "pytest",
        "coverage": load_coverage_xml(
            Path("todo-for-ai-api-server/coverage.xml")
        ),
    }

    # MCP
    report["projects"]["mcp"] = {
        "language": "TypeScript",
        "framework": "Vitest",
        "coverage": load_coverage_json(
            Path("todo-for-ai-mcp/coverage/coverage-final.json")
        ),
    }

    # Frontend
    report["projects"]["frontend"] = {
        "language": "TypeScript/React",
        "framework": "Vitest",
        "coverage": load_coverage_json(
            Path("todo-for-ai-webpage/coverage/coverage-final.json")
        ),
    }

    # Calculate overall statistics
    total_coverage = []
    for project in report["projects"].values():
        cov = project.get("coverage", {})
        if "line_rate" in cov and "error" not in cov:
            total_coverage.append(cov["line_rate"])

    if total_coverage:
        report["summary"]["average_coverage"] = sum(total_coverage) / len(total_coverage)

    # Save report
    report_path = Path("test-report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    # Generate HTML report
    html_report = Path("test-report.html")
    with open(html_report, "w") as f:
        f.write(generate_html_report(report))

    print(f"Test report generated: {report_path}")
    print(f"HTML report generated: {html_report}")


def generate_html_report(report: Dict) -> str:
    """Generate HTML version of report."""
    html = """<!DOCTYPE html>
<html>
<head>
    <title>Test Report - todo-for-ai</title>
    <style>
        body { font-family: -apple-system, sans-serif; margin: 40px; }
        h1 { color: #333; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #f5f5f5; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .metric { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <h1>Test Report - todo-for-ai</h1>
    <p>Generated: """ + report["generated_at"] + """</p>

    <h2>Coverage Summary</h2>
    <table>
        <tr>
            <th>Project</th>
            <th>Language</th>
            <th>Framework</th>
            <th>Line Coverage</th>
        </tr>
"""

    for name, project in report["projects"].items():
        cov = project.get("coverage", {})
        line_rate = cov.get("line_rate", 0)
        percentage = f"{line_rate * 100:.1f}%"

        html += f"""
        <tr>
            <td>{name}</td>
            <td>{project["language"]}</td>
            <td>{project["framework"]}</td>
            <td>{percentage}</td>
        </tr>
"""

    html += """
    </table>
</body>
</html>
"""
    return html


if __name__ == "__main__":
    generate_report()
```

### Step 5.4: 创建 GitHub Actions CI 配置

```yaml
name: Test Suite

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main, dev]
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  test-agent-runtime:
    name: Test Agent Runtime
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: agent-runtime

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run tests with coverage
        run: |
          pytest tests/ -v --cov=src --cov-report=xml --cov-report=html

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./agent-runtime/coverage.xml
          flags: agent-runtime

  test-api-server:
    name: Test API Server
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    defaults:
      run:
        working-directory: todo-for-ai-api-server

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run tests
        run: |
          pytest tests/ -v --cov=. --cov-report=xml --cov-report=html
        env:
          DATABASE_URL: mysql+pymysql://root:root@localhost:3306/test
          REDIS_URL: redis://localhost:6379/0

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./todo-for-ai-api-server/coverage.xml
          flags: api-server

  test-mcp:
    name: Test MCP
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: todo-for-ai-mcp

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: todo-for-ai-mcp/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./todo-for-ai-mcp/coverage/lcov.info
          flags: mcp

  test-frontend:
    name: Test Frontend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: todo-for-ai-webpage

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: todo-for-ai-webpage/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./todo-for-ai-webpage/coverage/lcov.info
          flags: frontend

  regression-test:
    name: Regression Test
    runs-on: ubuntu-latest
    needs: [test-agent-runtime, test-api-server, test-mcp, test-frontend]
    if: github.event_name == 'schedule' || github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install all dependencies
        run: |
          # Python dependencies
          pip install -r agent-runtime/requirements.txt
          pip install -r agent-runtime/requirements-dev.txt
          pip install -r todo-for-ai-api-server/requirements.txt
          pip install -r todo-for-ai-api-server/requirements-dev.txt

          # Node.js dependencies
          cd todo-for-ai-mcp && npm ci && cd ..
          cd todo-for-ai-webpage && npm ci && cd ..

      - name: Run regression tests
        run: |
          chmod +x scripts/run-regression.sh
          ./scripts/run-regression.sh

      - name: Upload regression report
        uses: actions/upload-artifact@v4
        with:
          name: regression-report
          path: regression-report-*.json
```

### Step 5.5: 创建测试指南文档

```markdown
# Testing Guide

## Overview

This project uses a comprehensive testing strategy covering unit tests, integration tests, and end-to-end tests.

## Test Structure

```
.
├── agent-runtime/          # Python tests (pytest)
├── todo-for-ai-api-server/ # Python tests (pytest)
├── todo-for-ai-mcp/        # TypeScript tests (Vitest)
├── todo-for-ai-webpage/    # React tests (Vitest)
└── scripts/                # Test automation scripts
```

## Running Tests

### Quick Start

Run all tests:
```bash
./scripts/run-all-tests.sh
```

Run regression tests:
```bash
./scripts/run-regression.sh
```

### Individual Projects

#### Agent Runtime (Python)

```bash
cd agent-runtime

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test
pytest tests/unit/test_runtime.py::TestAgentRuntime::test_runtime_initialization

# Run with watch mode
ptw
```

#### API Server (Python)

```bash
cd todo-for-ai-api-server

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run integration tests only
pytest tests/integration/
```

#### MCP (TypeScript)

```bash
cd todo-for-ai-mcp

# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui
```

#### Frontend (React)

```bash
cd todo-for-ai-webpage

# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Writing Tests

### Python Tests

```python
import pytest

class TestFeature:
    """Test feature description."""

    def test_specific_behavior(self):
        """Test description."""
        result = function(input)
        assert result == expected

    @pytest.mark.asyncio
    async def test_async_behavior(self):
        """Test async function."""
        result = await async_function()
        assert result is not None
```

### TypeScript Tests

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('Feature', () => {
  it('should behave correctly', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### React Component Tests

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('should handle click', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Coverage Requirements

| Project | Minimum Coverage |
|---------|------------------|
| agent-runtime | 70% |
| api-server | 60% |
| mcp | 70% |
| frontend | 60% |

## CI/CD Integration

Tests are automatically run on:
- Every push to `main` or `dev` branches
- Every pull request
- Daily at 2 AM UTC (regression tests)

## Test Reports

After running tests, reports are generated:
- `test-report.json`: JSON summary
- `test-report.html`: HTML report
- `coverage/`: Detailed coverage reports
```

---

## Auto-Selection: Subagent-Driven Execution

**Auto-selecting: Subagent-Driven Development**

This plan has 5 major tasks across multiple technology stacks with complex dependencies:
- 4 different projects (Python x2, TypeScript x2)
- Multiple configuration files and test files
- Cross-project integration concerns
- CI/CD configuration

**Subagent-Driven is optimal because:**
- Fresh subagent per task prevents context pollution
- Built-in two-stage review ensures quality
- Parallel execution possible for independent tasks
- Each task can be independently verified

**Execution order:**
1. Task 1 & 2 (Python backends) - can run in parallel
2. Task 3 & 4 (TypeScript) - can run in parallel
3. Task 5 (Regression) - depends on all above

**Proceeding to execute with superpowers:subagent-driven-development...**
