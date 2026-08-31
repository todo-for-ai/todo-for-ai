"""Structured logging with rich output for testing framework."""

import sys
from datetime import datetime
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
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
