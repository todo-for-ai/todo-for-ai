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
