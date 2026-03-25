# Testing Guide

## Overview

This project uses a comprehensive testing strategy covering unit tests, integration tests, and end-to-end tests across all modules.

## Test Structure

```
.
├── agent-runtime/          # Python tests (pytest)
│   └── tests/
│       ├── unit/
│       └── integration/
├── todo-for-ai-api-server/ # Python tests (pytest)
│   └── tests/
│       ├── unit/
│       │   ├── api/
│       │   ├── core/
│       │   └── models/
│       └── integration/
├── todo-for-ai-mcp/        # TypeScript tests (Vitest)
│   └── tests/
│       └── unit/
├── todo-for-ai-webpage/    # React tests (Vitest)
│   └── tests/
│       ├── unit/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── stores/
│       └── integration/
└── scripts/                # Test automation scripts
    ├── run-all-tests.sh
    └── run-regression.sh
```

## Quick Start

### Run All Tests

```bash
./scripts/run-all-tests.sh
```

### Run Regression Tests

```bash
./scripts/run-regression.sh
```

### Generate Test Report

```bash
python scripts/generate-test-report.py
```

## Module-Specific Testing

### Agent Runtime (Python)

```bash
cd agent-runtime

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test
pytest tests/unit/test_runtime.py::TestAgentRuntime::test_runtime_initialization -v

# Run with watch mode (requires pytest-watch)
ptw
```

### API Server (Python)

```bash
cd todo-for-ai-api-server

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run unit tests only
pytest tests/unit/ -v

# Run integration tests only
pytest tests/integration/ -v

# Run with specific marker
pytest -m "not slow" -v
```

### MCP (TypeScript)

```bash
cd todo-for-ai-mcp

# Install dependencies
npm install

# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# Run specific test
npm test -- tests/unit/tools.test.ts
```

### Frontend (React)

```bash
cd todo-for-ai-webpage

# Install dependencies
npm install

# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific component test
npm test -- tests/unit/components/Button.test.tsx
```

## Writing Tests

### Python Tests

```python
import pytest
from unittest.mock import AsyncMock, MagicMock

class TestFeature:
    """Test feature description."""

    def test_specific_behavior(self):
        """Test description."""
        # Arrange
        input_data = {"key": "value"}

        # Act
        result = function(input_data)

        # Assert
        assert result == expected
        assert result["status"] == "success"

    @pytest.mark.asyncio
    async def test_async_behavior(self, mock_api):
        """Test async function."""
        mock_api.get.return_value = {"data": []}

        result = await async_function()

        assert result is not None
        mock_api.get.assert_called_once()

    @pytest.mark.integration
    def test_integration_scenario(self):
        """Integration test example."""
        pass
```

### TypeScript Tests (MCP)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyClass } from '../../src/my-module';

describe('Feature', () => {
  let instance: MyClass;

  beforeEach(() => {
    instance = new MyClass();
  });

  it('should behave correctly', () => {
    // Arrange
    const input = { key: 'value' };

    // Act
    const result = instance.method(input);

    // Assert
    expect(result).toBe(expected);
    expect(result).toHaveProperty('status', 'success');
  });

  it('should handle errors', async () => {
    // Arrange
    vi.spyOn(api, 'call').mockRejectedValue(new Error('Network error'));

    // Act & Assert
    await expect(instance.asyncMethod()).rejects.toThrow('Network error');
  });
});
```

### React Component Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button } from '@/components/common/Button';

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
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should apply variant styles', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });
});
```

### React Hook Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import * as authApi from '@/api/auth';

vi.mock('@/api/auth');

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
    vi.mocked(authApi.login).mockResolvedValue({
      access_token: 'test-token',
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('testuser', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
  });
});
```

## Coverage Requirements

| Project | Minimum Coverage | Target Coverage |
|---------|------------------|-----------------|
| agent-runtime | 70% | 80% |
| api-server | 60% | 75% |
| mcp | 70% | 80% |
| frontend | 60% | 75% |

Coverage reports are generated in:
- Python: `htmlcov/` directory and `coverage.xml`
- TypeScript: `coverage/` directory

## Test Markers

### Python (pytest)

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.slow` - Slow tests
- `@pytest.mark.asyncio` - Async tests
- `@pytest.mark.api` - API tests

Run tests by marker:
```bash
pytest -m unit          # Run only unit tests
pytest -m "not slow"    # Exclude slow tests
pytest -m integration   # Run only integration tests
```

### TypeScript (Vitest)

Group tests using `describe` blocks:
```typescript
describe('Unit', () => {
  it('should...', () => {});
});

describe.skip('Slow', () => {
  it('should...', () => {});
});
```

## CI/CD Integration

Tests are automatically run on:

1. **Push to `main` or `dev` branches** - All tests
2. **Pull Request** - All tests
3. **Daily at 2 AM UTC** - Full regression tests

### CI Jobs

- `test-agent-runtime` - Python tests with coverage
- `test-api-server` - Flask tests with MySQL and Redis services
- `test-mcp` - TypeScript tests with coverage
- `test-frontend` - React tests with coverage
- `regression-test` - Full regression suite (scheduled/main only)

## Debugging Tests

### Python

```bash
# Run with PDB
pytest --pdb

# Run with verbose output
pytest -vvv

# Run with specific log level
pytest --log-cli-level=DEBUG
```

### TypeScript

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run specific test with logs
npm test -- tests/unit/mytest.test.ts --reporter=verbose

# Debug with Node inspector
npm test -- --inspect-brk
```

## Best Practices

1. **Test Behavior, Not Implementation** - Test what the code does, not how it does it
2. **One Assertion Per Test** - Keep tests focused and readable
3. **Use Descriptive Names** - Test names should describe the behavior being tested
4. **Arrange-Act-Assert** - Structure tests clearly
5. **Mock External Dependencies** - Don't test external services
6. **Clean Up After Tests** - Use fixtures and teardown
7. **Write Tests First** - Follow TDD when possible
8. **Keep Tests Fast** - Slow tests discourage running them
9. **Test Edge Cases** - Don't just test the happy path
10. **Maintain Test Data** - Use factories and fixtures

## Troubleshooting

### Common Issues

**Python: Import errors**
```bash
# Ensure you're in the correct directory
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

**TypeScript: Module not found**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Coverage not generating**
```bash
# Ensure coverage dependencies are installed
pip install pytest-cov
npm install -D @vitest/coverage-v8
```

**Tests failing in CI but passing locally**
- Check environment variables
- Verify service dependencies (MySQL, Redis)
- Check for timing issues (add retries or waits)

## Additional Resources

- [pytest Documentation](https://docs.pytest.org/)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Flask Testing](https://flask.palletsprojects.com/en/latest/testing/)
