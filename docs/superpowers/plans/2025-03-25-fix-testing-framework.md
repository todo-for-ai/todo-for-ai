# Fix and Enhance Regression Testing Framework

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline execution.

**Goal:** Fix discovered issues (test execution, result parsing) and make regression framework fully operational with comprehensive idempotent test coverage.

**Architecture:** Fix critical infrastructure issues first (dependencies, import errors), then improve result parsing, finally add comprehensive idempotent tests using factory fixtures.

**Tech Stack:** Python 3.9+, pytest, pytest-asyncio, factory-boy, vitest, jsdom

---

## Task 1: Fix Frontend/MCP Test Dependencies

**Files:**
- Modify: `todo-for-ai-mcp/package.json` (verify test script)
- Modify: `todo-for-ai-webpage/package.json` (verify test script)

### Step 1.1: Check MCP package.json

**Run:** `cd todo-for-ai-mcp && cat package.json | grep -A 3 '"test"'`
**Expected:** Should show vitest command

### Step 1.2: Install MCP Dependencies

**Run:**
```bash
cd todo-for-ai-mcp && npm install
```

**Verify:** `ls node_modules/.bin/vitest`

### Step 1.3: Check Frontend package.json

**Run:** `cd todo-for-ai-webpage && cat package.json | grep -A 3 '"test"'`

### Step 1.4: Install Frontend Dependencies

**Run:**
```bash
cd todo-for-ai-webpage && npm install
```

### Step 1.5: Commit

```bash
git add todo-for-ai-mcp/package-lock.json todo-for-ai-webpage/package-lock.json
git commit -m "chore: install npm dependencies for mcp and frontend"
```

---

## Task 2: Fix Agent Runtime Import Errors

**Files:**
- Modify: `agent-runtime/tests/test_openclaw.py` (fix imports)
- Read: `agent-runtime/src/core/openclaw.py` (check available exports)

### Step 2.1: Check Available Exports

**Run:** `grep -n "^class\|^def\|^from\|^import" agent-runtime/src/core/openclaw.py | head -30`

### Step 2.2: Fix test_openclaw.py Imports

**Current:**
```python
from src.core.openclaw import (
    TaskQueue, TaskWorker, OpenClawRuntime
)
```

**Change to:** Import only available classes or skip test

### Step 2.3: Run Agent Runtime Tests

**Run:** `cd agent-runtime && python3 -m pytest tests/ -v --tb=short 2>&1 | head -50`

### Step 2.4: Commit

```bash
git add agent-runtime/tests/test_openclaw.py
git commit -m "fix(agent-runtime): fix test_openclaw imports"
```

---

## Task 3: Fix API Server Test Conflicts

**Files:**
- Delete/Move: `todo-for-ai-api-server/tests/unit/core/test_auth.py`
- Modify: `todo-for-ai-api-server/tests/unit/api/test_auth.py` (merge tests)

### Step 3.1: Check Existing auth tests

**Run:** `ls -la todo-for-ai-api-server/tests/unit/*/test_auth.py`

### Step 3.2: Merge core/auth tests into api/auth tests

**Move password hashing tests from:** `tests/unit/core/test_auth.py`
**To:** `tests/unit/api/test_auth.py`

### Step 3.3: Remove duplicate

**Run:** `rm todo-for-ai-api-server/tests/unit/core/test_auth.py`

### Step 3.4: Verify tests pass

**Run:** `cd todo-for-ai-api-server && python3 -m pytest tests/unit/api/test_auth.py -v`

### Step 3.5: Commit

```bash
git add todo-for-ai-api-server/tests/
git commit -m "fix(api-server): merge auth tests to avoid import conflicts"
```

---

## Task 4: Improve Result Parser

**Files:**
- Modify: `scripts/testing/core/parallel_runner.py:_parse_test_results`
- Modify: `scripts/testing/core/result_aggregator.py`

### Step 4.1: Enhance pytest output parsing

**File:** `scripts/testing/core/parallel_runner.py:198-209`

**Change from:**
```python
def _parse_test_results(self, stdout: str, stderr: str) -> tuple:
    passed = stdout.count("PASSED") + stdout.count("✓") + stdout.count("passed")
    failed = stdout.count("FAILED") + stdout.count("✗") + stdout.count("failed")
    skipped = stdout.count("SKIPPED") + stdout.count("⊘") + stdout.count("skipped")
    total = passed + failed + skipped
    return passed, failed, skipped, total
```

**Change to:**
```python
def _parse_test_results(self, stdout: str, stderr: str) -> tuple:
    """Parse test counts from pytest/vitest output."""
    import re

    # Try to find pytest summary line: "X passed, Y failed, Z skipped"
    pytest_summary = re.search(r'(\d+) passed,?\s*(\d+)?\s*failed?,?\s*(\d+)?\s*skipped?', stdout)
    if pytest_summary:
        passed = int(pytest_summary.group(1)) if pytest_summary.group(1) else 0
        failed = int(pytest_summary.group(2)) if pytest_summary.group(2) else 0
        skipped = int(pytest_summary.group(3)) if pytest_summary.group(3) else 0
        return passed, failed, skipped, passed + failed + skipped

    # Fallback to simple counting
    passed = stdout.count("PASSED") + stdout.count("✓") + stdout.count(" passed")
    failed = stdout.count("FAILED") + stdout.count("✗") + stdout.count(" failed") + stdout.count("ERROR")
    skipped = stdout.count("SKIPPED") + stdout.count("⊘") + stdout.count(" skipped")
    total = passed + failed + skipped
    return passed, failed, skipped, total
```

### Step 4.2: Test parser with real output

**Run:**
```bash
cd agent-runtime && python3 -m pytest tests/unit/ -v 2>&1 | grep -E "passed|failed|skipped" | tail -5
```

### Step 4.3: Commit

```bash
git add scripts/testing/core/parallel_runner.py
git commit -m "fix(testing): improve test result parsing with regex"
```

---

## Task 5: Add Idempotent Fixtures

**Files:**
- Create: `agent-runtime/tests/conftest.py` (enhance with factory fixtures)
- Create: `todo-for-ai-api-server/tests/conftest.py` (enhance with factory fixtures)
- Create: `agent-runtime/tests/factories.py`

### Step 5.1: Create Task Factory for Agent Runtime

**File:** `agent-runtime/tests/factories.py`

```python
"""Factory fixtures for idempotent testing."""
import factory
from src.api.client import Task, TaskResult


class TaskFactory(factory.Factory):
    """Factory for creating test tasks."""
    class Meta:
        model = Task

    id = factory.Sequence(lambda n: f"task-{n}")
    type = "code_review"
    payload = factory.Dict({"code": "def test(): pass"})
    priority = 1
    created_at = "2024-01-01T00:00:00Z"
    deadline = None
    dependencies = factory.List([])


class TaskResultFactory(factory.Factory):
    """Factory for creating test task results."""
    class Meta:
        model = TaskResult

    task_id = factory.Sequence(lambda n: f"task-{n}")
    status = "success"
    output = "Test output"
    error = None
    execution_time_ms = 100
    metadata = None
```

### Step 5.2: Update conftest with factory fixtures

**File:** `agent-runtime/tests/conftest.py`

Add:
```python
@pytest.fixture
def task_factory():
    """Return TaskFactory for creating test tasks."""
    from tests.factories import TaskFactory
    return TaskFactory

@pytest.fixture
def task_result_factory():
    """Return TaskResultFactory for creating test results."""
    from tests.factories import TaskResultFactory
    return TaskResultFactory
```

### Step 5.3: Commit

```bash
git add agent-runtime/tests/factories.py agent-runtime/tests/conftest.py
git commit -m "test(agent-runtime): add factory fixtures for idempotent testing"
```

---

## Task 6: Run Full Framework Validation

### Step 6.1: Run complete regression suite

**Run:** `python3 scripts/testing/runner.py -v 2>&1 | tail -50`

### Step 6.2: Verify results are correctly parsed

**Check:** Results show non-zero test counts

### Step 6.3: Verify reports generated

**Run:** `ls -la test-results/*/report-*.html`

### Step 6.4: Final commit

```bash
git add -A
git commit -m "test: complete regression testing framework with working result parsing"
```

---

## Auto-Selection

**Auto-selecting: Inline Execution**

These are straightforward fixes with clear specifications. Inline execution is more efficient for:
- Simple dependency fixes
- Test import corrections
- Parser improvements
- Sequential verification required between steps

Proceeding to execute...
