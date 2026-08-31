"""Parallel test execution engine with resource management."""

import os
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional
import concurrent.futures

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
                    "python3", "-m", "pytest", "tests/",
                    "-v", "--cov=src", "--cov-report=xml"
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
                    "python3", "-m", "pytest", "tests/",
                    "-v", "--cov=.", "--cov-report=xml"
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
        logger.console.print(f"[cyan]Running {len(suites)} test suites with {max_workers} workers...[/cyan]")

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

        return self.results

    def _parse_test_results(self, stdout: str, stderr: str) -> tuple:
        """Parse test counts from pytest/vitest output."""
        import re

        combined = stdout + "\n" + stderr

        # Pytest summary line: "X passed, Y failed, Z skipped, W errors"
        # Must explicitly match 'failed' keyword
        pytest_match = re.search(r'(\d+) passed,?\s*(\d+)?\s*failed,?\s*(\d+)?\s*(?:skipped,?)?\s*(\d+)?\s*(?:error?s?,?)?', combined, re.IGNORECASE)
        if pytest_match:
            passed = int(pytest_match.group(1)) if pytest_match.group(1) else 0
            failed = int(pytest_match.group(2)) if pytest_match.group(2) else 0
            skipped = int(pytest_match.group(3)) if pytest_match.group(3) else 0
            total = passed + failed + skipped
            return passed, failed, skipped, total

        # Alternative pattern: just "X passed" with no failures
        passed_only_match = re.search(r'(\d+) passed', combined)
        if passed_only_match and 'failed' not in combined.lower():
            passed = int(passed_only_match.group(1))
            return passed, 0, 0, passed

        # Vitest summary: "Tests (X) Y passed, Z failed"
        vitest_match = re.search(r'(\d+)\s+passed,?\s*(\d+)?\s*(?:failed?,?)?', combined)
        if vitest_match:
            passed = int(vitest_match.group(1))
            failed = int(vitest_match.group(2)) if vitest_match.group(2) else 0
            return passed, failed, 0, passed + failed

        # Fallback to simple counting
        passed = stdout.count("PASSED") + stdout.count(" passed")
        failed = stdout.count("FAILED") + stdout.count(" failed") + stdout.count("ERROR")
        skipped = stdout.count("SKIPPED") + stdout.count(" skipped")
        total = passed + failed + skipped
        return passed, failed, skipped, total

    def _extract_coverage(self, module: str) -> float:
        """Extract coverage percentage from coverage files."""
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
