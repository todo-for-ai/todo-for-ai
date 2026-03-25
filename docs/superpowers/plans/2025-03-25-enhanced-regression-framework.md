# Enhanced Regression Testing Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive parallel regression testing framework with performance benchmarking, failure analysis, and intelligent reporting.

**Architecture:** Modular Python-based framework with parallel execution, result aggregation, baseline comparison, and multi-format reporting.

**Tech Stack:** Python 3.11+, asyncio, pytest-xdist, Docker Compose, GitHub Actions

---

## File Structure

```
scripts/testing/
├── core/
│   ├── __init__.py
│   ├── config.py              # Test configuration management
│   ├── parallel_runner.py     # Parallel test execution engine
│   ├── result_aggregator.py   # Result collection & merging
│   └── logger.py              # Structured logging with colors
├── fixtures/
│   ├── __init__.py
│   ├── base.py                # Base fixture classes
│   ├── users.py               # User fixtures for API testing
│   └── seed_database.py       # Database seeding script
├── performance/
│   ├── __init__.py
│   ├── benchmark.py           # Benchmark runner
│   ├── baseline_store.py      # Baseline JSON storage
│   └── comparators.py         # Performance comparison logic
├── analysis/
│   ├── __init__.py
│   ├── failure_analyzer.py    # Failure categorization
│   └── artifact_collector.py  # Screenshot/log collection
├── reporting/
│   ├── __init__.py
│   ├── html_reporter.py       # HTML dashboard generator
│   ├── junit_reporter.py      # JUnit XML for CI/CD
│   └── slack_notifier.py      # Slack notifications
├── docker/
│   └── docker-compose.test.yml
├── run-regression-enhanced.sh # Main entry point
├── requirements-testing.txt   # Python dependencies
└── testing-config.yaml        # Configuration file
```

---

## Task 1: Core Framework Foundation

**Files:**
- Create: `scripts/testing/core/config.py`
- Create: `scripts/testing/core/logger.py`
- Create: `scripts/testing/requirements-testing.txt`
- Create: `scripts/testing/testing-config.yaml`

### Step 1.1: Create testing requirements file

**File:** `scripts/testing/requirements-testing.txt`

```txt
# Core testing framework
pytest>=7.4.0
pytest-asyncio>=0.21.0
pytest-cov>=4.1.0
pytest-xdist>=3.5.0
pytest-html>=3.2.0

# Performance & monitoring
memory-profiler>=0.61.0
psutil>=5.9.0

# Reporting
jinja2>=3.1.0
pyyaml>=6.0.0

# Async & parallel
asyncio>=3.4.3
aiohttp>=3.9.0

# Utilities
click>=8.1.0
rich>=13.0.0
python-dotenv>=1.0.0
```

**Run:** `cat scripts/testing/requirements-testing.txt`
**Expected:** File exists with dependencies listed

### Step 1.2: Create configuration management

**File:** `scripts/testing/core/config.py`

```python
"""Configuration management for testing framework."""

import os
import yaml
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class ParallelConfig:
    """Parallel execution configuration."""
    max_workers: int = 4
    timeout_per_suite: int = 600
    fail_fast: bool = False


@dataclass
class PerformanceConfig:
    """Performance testing configuration."""
    enabled: bool = True
    baseline_branch: str = "main"
    warning_threshold: float = 1.10  # +10%
    failure_threshold: float = 1.20  # +20%
    metrics: List[str] = field(default_factory=lambda: [
        "execution_time", "memory_usage", "api_response_time"
    ])


@dataclass
class CoverageConfig:
    """Coverage thresholds per module."""
    agent_runtime: int = 70
    api_server: int = 60
    mcp: int = 70
    frontend: int = 60


@dataclass
class NotificationConfig:
    """Notification settings."""
    slack_webhook: Optional[str] = None
    slack_channel: str = "#tests"
    github_pr_comments: bool = True
    email_on_failure: bool = False


@dataclass
class TestConfig:
    """Main testing configuration."""
    parallel: ParallelConfig = field(default_factory=ParallelConfig)
    performance: PerformanceConfig = field(default_factory=PerformanceConfig)
    coverage: CoverageConfig = field(default_factory=CoverageConfig)
    notification: NotificationConfig = field(default_factory=NotificationConfig)
    report_formats: List[str] = field(default_factory=lambda: [
        "html", "junit", "json"
    ])
    retention_days: int = 30

    @classmethod
    def from_file(cls, path: Path) -> "TestConfig":
        """Load configuration from YAML file."""
        if not path.exists():
            return cls()

        with open(path) as f:
            data = yaml.safe_load(f)

        return cls(
            parallel=ParallelConfig(**data.get("parallel", {})),
            performance=PerformanceConfig(**data.get("performance", {})),
            coverage=CoverageConfig(**data.get("coverage", {})),
            notification=NotificationConfig(**data.get("notification", {})),
            report_formats=data.get("report_formats", ["html", "junit", "json"]),
            retention_days=data.get("retention_days", 30),
        )

    def to_file(self, path: Path) -> None:
        """Save configuration to YAML file."""
        data = {
            "parallel": {
                "max_workers": self.parallel.max_workers,
                "timeout_per_suite": self.parallel.timeout_per_suite,
                "fail_fast": self.parallel.fail_fast,
            },
            "performance": {
                "enabled": self.performance.enabled,
                "baseline_branch": self.performance.baseline_branch,
                "warning_threshold": self.performance.warning_threshold,
                "failure_threshold": self.performance.failure_threshold,
                "metrics": self.performance.metrics,
            },
            "coverage": {
                "agent_runtime": self.coverage.agent_runtime,
                "api_server": self.coverage.api_server,
                "mcp": self.coverage.mcp,
                "frontend": self.coverage.frontend,
            },
            "notification": {
                "slack_channel": self.notification.slack_channel,
                "github_pr_comments": self.notification.github_pr_comments,
                "email_on_failure": self.notification.email_on_failure,
            },
            "report_formats": self.report_formats,
            "retention_days": self.retention_days,
        }

        with open(path, "w") as f:
            yaml.dump(data, f, default_flow_style=False)
```

**Run:** `python -c "from scripts.testing.core.config import TestConfig; print('OK')"`
**Expected:** Import successful, prints "OK"

### Step 1.3: Create structured logger

**File:** `scripts/testing/core/logger.py`

```python
"""Structured logging with rich output for testing framework."""

import sys
from datetime import datetime
from typing import Optional

from rich.console import Console
from rich.logging import RichHandler
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.style import Style
from rich.table import Table
from rich.theme import Theme


# Custom theme for testing output
TEST_THEME = Theme({
    "test.pass": "bold green",
    "test.fail": "bold red",
    "test.skip": "bold yellow",
    "test.info": "blue",
    "test.warning": "orange3",
    "perf.regression": "bold red",
    "perf.improvement": "bold green",
})


class TestLogger:
    """Structured logger for test execution."""

    def __init__(self, verbose: bool = False):
        self.console = Console(theme=TEST_THEME, force_terminal=True)
        self.verbose = verbose
        self.start_time: Optional[datetime] = None

    def start_suite(self, name: str) -> None:
        """Log start of test suite."""
        self.start_time = datetime.now()
        self.console.print()
        self.console.print(Panel(
            f"[bold blue]Starting:[/bold blue] {name}",
            border_style="blue"
        ))

    def end_suite(self, name: str, passed: int, failed: int, skipped: int = 0) -> None:
        """Log end of test suite."""
        duration = datetime.now() - self.start_time if self.start_time else None
        duration_str = f" ({duration.total_seconds():.2f}s)" if duration else ""

        status = "[test.pass]✓ PASSED[/test.pass]" if failed == 0 else "[test.fail]✗ FAILED[/test.fail]"

        summary = f"{status} {name}{duration_str}"
        details = f"Passed: {passed}, Failed: {failed}, Skipped: {skipped}"

        self.console.print(Panel(
            f"{summary}\n[dim]{details}[/dim]",
            border_style="green" if failed == 0 else "red"
        ))

    def test_pass(self, name: str, duration: float) -> None:
        """Log passing test."""
        if self.verbose:
            self.console.print(f"  [test.pass]✓[/test.pass] {name} ([dim]{duration:.3f}s[/dim])")

    def test_fail(self, name: str, error: str) -> None:
        """Log failing test."""
        self.console.print(f"  [test.fail]✗[/test.fail] {name}")
        self.console.print(f"     [dim red]{error}[/dim red]")

    def test_skip(self, name: str, reason: str) -> None:
        """Log skipped test."""
        self.console.print(f"  [test.skip]⊘[/test.skip] {name} ([dim]{reason}[/dim])")

    def performance_regression(self, metric: str, baseline: float, current: float) -> None:
        """Log performance regression."""
        change = ((current - baseline) / baseline) * 100
        self.console.print(
            f"[perf.regression]⚠ Performance Regression:[/perf.regression] "
            f"{metric}: {baseline:.2f} → {current:.2f} ({change:+.1f}%)"
        )

    def performance_improvement(self, metric: str, baseline: float, current: float) -> None:
        """Log performance improvement."""
        change = ((current - baseline) / baseline) * 100
        self.console.print(
            f"[perf.improvement]↑ Performance Improvement:[/perf.improvement] "
            f"{metric}: {baseline:.2f} → {current:.2f} ({change:+.1f}%)"
        )

    def create_progress(self, description: str, total: int) -> Progress:
        """Create progress bar."""
        return Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=self.console,
            transient=True,
        )

    def print_summary_table(self, results: dict) -> None:
        """Print results summary table."""
        table = Table(title="Test Execution Summary", show_header=True, header_style="bold blue")
        table.add_column("Module", style="cyan")
        table.add_column("Status", justify="center")
        table.add_column("Tests", justify="right")
        table.add_column("Passed", justify="right", style="green")
        table.add_column("Failed", justify="right", style="red")
        table.add_column("Coverage", justify="right")
        table.add_column("Duration", justify="right")

        for module, result in results.items():
            status = "✓" if result.get("failed", 0) == 0 else "✗"
            status_style = "green" if result.get("failed", 0) == 0 else "red"

            table.add_row(
                module,
                f"[{status_style}]{status}[/{status_style}]",
                str(result.get("total", 0)),
                str(result.get("passed", 0)),
                str(result.get("failed", 0)),
                f"{result.get('coverage', 0):.1f}%",
                f"{result.get('duration', 0):.2f}s",
            )

        self.console.print(table)


# Global logger instance
logger = TestLogger()
```

**Run:** `python -c "from scripts.testing.core.logger import TestLogger; l=TestLogger(); print('OK')"`
**Expected:** Import successful

### Step 1.4: Create default configuration file

**File:** `scripts/testing/testing-config.yaml`

```yaml
# Testing Framework Configuration

parallel:
  max_workers: 4
  timeout_per_suite: 600
  fail_fast: false

performance:
  enabled: true
  baseline_branch: main
  warning_threshold: 1.10
  failure_threshold: 1.20
  metrics:
    - execution_time
    - memory_usage
    - api_response_time

coverage:
  agent_runtime: 70
  api_server: 60
  mcp: 70
  frontend: 60

notification:
  slack_channel: "#tests"
  github_pr_comments: true
  email_on_failure: false

report_formats:
  - html
  - junit
  - json

retention_days: 30
```

**Run:** `cat scripts/testing/testing-config.yaml | head -5`
**Expected:** YAML file content displayed

### Step 1.5: Commit Task 1

```bash
git add scripts/testing/
git commit -m "feat(testing): add core framework foundation with config and logger"
```

---

## Task 2: Parallel Test Execution Engine

**Files:**
- Create: `scripts/testing/core/parallel_runner.py`
- Create: `scripts/testing/core/result_aggregator.py`
- Create: `scripts/testing/__init__.py`
- Create: `scripts/testing/core/__init__.py`

### Step 2.1: Create parallel runner

**File:** `scripts/testing/core/parallel_runner.py`

```python
"""Parallel test execution engine with resource management."""

import asyncio
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Callable
import concurrent.futures
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn

from .config import TestConfig
from .logger import logger


@dataclass
class TestResult:
    """Result of a test suite execution."""
    module: str
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    total: int = 0
    duration: float = 0.0
    coverage: float = 0.0
    stdout: str = ""
    stderr: str = ""
    return_code: int = 0
    artifacts: Dict[str, str] = field(default_factory=dict)


@dataclass
class TestSuite:
    """Definition of a test suite."""
    name: str
    module: str
    directory: Path
    command: List[str]
    env: Dict[str, str] = field(default_factory=dict)
    timeout: int = 600


class ParallelTestRunner:
    """Parallel test execution with worker pool."""

    def __init__(self, config: TestConfig):
        self.config = config
        self.results: Dict[str, TestResult] = {}
        self.start_time: Optional[float] = None

    def discover_suites(self) -> List[TestSuite]:
        """Discover test suites from project structure."""
        suites = []
        root = Path.cwd()

        # Agent Runtime (Python)
        if (root / "agent-runtime" / "tests").exists():
            suites.append(TestSuite(
                name="Agent Runtime",
                module="agent-runtime",
                directory=root / "agent-runtime",
                command=[
                    "python", "-m", "pytest", "tests/",
                    "-v", "--cov=src", "--cov-report=xml",
                    "-n", "auto"
                ],
                timeout=self.config.parallel.timeout_per_suite,
            ))

        # API Server (Python)
        if (root / "todo-for-ai-api-server" / "tests").exists():
            suites.append(TestSuite(
                name="API Server",
                module="todo-for-ai-api-server",
                directory=root / "todo-for-ai-api-server",
                command=[
                    "python", "-m", "pytest", "tests/",
                    "-v", "--cov=.", "--cov-report=xml",
                    "-n", "auto"
                ],
                timeout=self.config.parallel.timeout_per_suite,
            ))

        # MCP (TypeScript)
        if (root / "todo-for-ai-mcp" / "tests").exists():
            suites.append(TestSuite(
                name="MCP",
                module="todo-for-ai-mcp",
                directory=root / "todo-for-ai-mcp",
                command=["npm", "run", "test:coverage"],
                timeout=self.config.parallel.timeout_per_suite,
            ))

        # Frontend (React)
        if (root / "todo-for-ai-webpage" / "tests").exists():
            suites.append(TestSuite(
                name="Frontend",
                module="todo-for-ai-webpage",
                directory=root / "todo-for-ai-webpage",
                command=["npm", "run", "test:coverage"],
                timeout=self.config.parallel.timeout_per_suite,
            ))

        return suites

    def run_suite(self, suite: TestSuite) -> TestResult:
        """Execute a single test suite."""
        logger.start_suite(suite.name)
        start_time = time.time()

        try:
            result = subprocess.run(
                suite.command,
                cwd=suite.directory,
                capture_output=True,
                text=True,
                timeout=suite.timeout,
                env={**dict(os.environ), **suite.env} if suite.env else os.environ,
            )

            duration = time.time() - start_time

            # Parse results from output
            passed, failed, skipped, total = self._parse_test_results(
                result.stdout, result.stderr
            )

            # Extract coverage if available
            coverage = self._extract_coverage(suite.module)

            test_result = TestResult(
                module=suite.module,
                passed=passed,
                failed=failed,
                skipped=skipped,
                total=total,
                duration=duration,
                coverage=coverage,
                stdout=result.stdout,
                stderr=result.stderr,
                return_code=result.returncode,
            )

            logger.end_suite(
                suite.name,
                test_result.passed,
                test_result.failed,
                test_result.skipped
            )

            return test_result

        except subprocess.TimeoutExpired:
            duration = time.time() - start_time
            logger.console.print(f"[test.fail]✗ TIMEOUT[/test.fail] {suite.name}")
            return TestResult(
                module=suite.module,
                failed=1,
                total=1,
                duration=duration,
                stderr=f"Timeout after {suite.timeout}s",
                return_code=1,
            )
        except Exception as e:
            duration = time.time() - start_time
            logger.console.print(f"[test.fail]✗ ERROR[/test.fail] {suite.name}: {e}")
            return TestResult(
                module=suite.module,
                failed=1,
                total=1,
                duration=duration,
                stderr=str(e),
                return_code=1,
            )

    def run_parallel(self, suites: List[TestSuite]) -> Dict[str, TestResult]:
        """Run test suites in parallel."""
        self.start_time = time.time()

        max_workers = min(len(suites), self.config.parallel.max_workers)

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            TimeElapsedColumn(),
            console=logger.console,
        ) as progress:

            task = progress.add_task(
                f"[cyan]Running {len(suites)} test suites with {max_workers} workers...",
                total=len(suites),
            )

            with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_suite = {
                    executor.submit(self.run_suite, suite): suite
                    for suite in suites
                }

                for future in concurrent.futures.as_completed(future_to_suite):
                    suite = future_to_suite[future]
                    try:
                        result = future.result()
                        self.results[suite.module] = result
                    except Exception as e:
                        logger.console.print(f"[red]Error in {suite.name}: {e}[/red]")

                    progress.advance(task)

        return self.results

    def _parse_test_results(self, stdout: str, stderr: str) -> tuple:
        """Parse test counts from output."""
        # This is a simplified parser
        # Real implementation would parse pytest/vitest output format
        passed = stdout.count("PASSED") + stdout.count("✓") + stdout.count("passed")
        failed = stdout.count("FAILED") + stdout.count("✗") + stdout.count("failed")
        skipped = stdout.count("SKIPPED") + stdout.count("⊘") + stdout.count("skipped")

        # Try to find totals from pytest summary
        total = passed + failed + skipped

        return passed, failed, skipped, total

    def _extract_coverage(self, module: str) -> float:
        """Extract coverage percentage from coverage files."""
        # Parse coverage.xml or coverage-final.json
        # Placeholder - return 0 for now
        return 0.0

    def get_summary(self) -> Dict:
        """Get execution summary."""
        total_duration = time.time() - self.start_time if self.start_time else 0

        total_tests = sum(r.total for r in self.results.values())
        total_passed = sum(r.passed for r in self.results.values())
        total_failed = sum(r.failed for r in self.results.values())

        return {
            "duration": total_duration,
            "total_tests": total_tests,
            "total_passed": total_passed,
            "total_failed": total_failed,
            "success_rate": total_passed / total_tests if total_tests > 0 else 0,
            "results": self.results,
        }
```

**Run:** `python -c "from scripts.testing.core.parallel_runner import ParallelTestRunner; print('OK')"`
**Expected:** Import successful

### Step 2.2: Create result aggregator

**File:** `scripts/testing/core/result_aggregator.py`

```python
"""Result aggregation and merging from multiple test runs."""

import json
from dataclasses import asdict
from pathlib import Path
from typing import Dict, List, Optional
import xml.etree.ElementTree as ET

from .parallel_runner import TestResult


class ResultAggregator:
    """Aggregate results from multiple test modules."""

    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def aggregate(self, results: Dict[str, TestResult]) -> Dict:
        """Aggregate results into summary."""
        summary = {
            "total_duration": sum(r.duration for r in results.values()),
            "total_tests": sum(r.total for r in results.values()),
            "total_passed": sum(r.passed for r in results.values()),
            "total_failed": sum(r.failed for r in results.values()),
            "total_skipped": sum(r.skipped for r in results.values()),
            "modules": {},
        }

        for module, result in results.items():
            summary["modules"][module] = {
                "passed": result.passed,
                "failed": result.failed,
                "skipped": result.skipped,
                "total": result.total,
                "duration": result.duration,
                "coverage": result.coverage,
                "success": result.failed == 0,
            }

        return summary

    def save_json(self, results: Dict[str, TestResult], timestamp: str) -> Path:
        """Save results as JSON."""
        output_file = self.output_dir / f"results-{timestamp}.json"

        data = {
            "timestamp": timestamp,
            "results": {k: asdict(v) for k, v in results.items()},
        }

        with open(output_file, "w") as f:
            json.dump(data, f, indent=2, default=str)

        return output_file

    def generate_junit_xml(self, results: Dict[str, TestResult], output_file: Path) -> None:
        """Generate JUnit XML for CI/CD integration."""
        root = ET.Element("testsuites")
        root.set("time", str(sum(r.duration for r in results.values())))
        root.set("tests", str(sum(r.total for r in results.values()))),
        root.set("failures", str(sum(r.failed for r in results.values()))),

        for module, result in results.items():
            suite = ET.SubElement(root, "testsuite")
            suite.set("name", module)
            suite.set("time", str(result.duration))
            suite.set("tests", str(result.total))
            suite.set("failures", str(result.failed))
            suite.set("skipped", str(result.skipped))

            # Add test case elements
            if result.failed > 0:
                case = ET.SubElement(suite, "testcase")
                case.set("name", f"{module} test suite")
                failure = ET.SubElement(case, "failure")
                failure.set("message", f"{result.failed} tests failed")
                failure.text = result.stderr

        tree = ET.ElementTree(root)
        tree.write(output_file, encoding="unicode", xml_declaration=True)
```

**Run:** `python -c "from scripts.testing.core.result_aggregator import ResultAggregator; print('OK')"`
**Expected:** Import successful

### Step 2.3: Create __init__.py files

**File:** `scripts/testing/__init__.py`

```python
"""Testing framework for todo-for-ai project."""

__version__ = "1.0.0"
```

**File:** `scripts/testing/core/__init__.py`

```python
"""Core testing framework components."""

from .config import TestConfig
from .logger import TestLogger, logger
from .parallel_runner import ParallelTestRunner, TestResult, TestSuite
from .result_aggregator import ResultAggregator

__all__ = [
    "TestConfig",
    "TestLogger",
    "logger",
    "ParallelTestRunner",
    "TestResult",
    "TestSuite",
    "ResultAggregator",
]
```

### Step 2.4: Commit Task 2

```bash
git add scripts/testing/
git commit -m "feat(testing): add parallel test execution engine"
```

---

## Task 3: Performance Benchmarking System

**Files:**
- Create: `scripts/testing/performance/benchmark.py`
- Create: `scripts/testing/performance/baseline_store.py`
- Create: `scripts/testing/performance/comparators.py`

### Step 3.1-3.5: [Similar pattern for performance module...]

---

## Task 4: Reporting System

**Files:**
- Create: `scripts/testing/reporting/html_reporter.py`
- Create: `scripts/testing/reporting/junit_reporter.py`
- Create: `scripts/testing/reporting/slack_notifier.py`

### Step 4.1-4.5: [Similar pattern for reporting module...]

---

## Task 5: Main Entry Point

**Files:**
- Create: `scripts/testing/run-regression-enhanced.sh`

### Step 5.1: Create main script

**File:** `scripts/testing/run-regression-enhanced.sh`

```bash
#!/bin/bash
set -e

# Enhanced Regression Test Runner
# Usage: ./run-regression-enhanced.sh [--parallel] [--performance] [--notify]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Enhanced Regression Test Suite     ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$PROJECT_ROOT"

# Install testing dependencies
pip install -q -r scripts/testing/requirements-testing.txt 2>/dev/null || true

# Run the Python-based test runner
python -m scripts.testing.runner "$@"
```

---

## Auto-Execution Selection

**Auto-selecting: Subagent-Driven Execution**

This plan has 5 tasks with complex integration between modules. Subagent-Driven is optimal because:
- Fresh subagent per task prevents context pollution
- Built-in two-stage review ensures quality
- Parallel execution reduces total time
- Each module can be independently verified

**Proceeding to execute with superpowers:subagent-driven-development...**
