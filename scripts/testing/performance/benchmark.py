"""Performance benchmarking with baseline comparison."""

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class BenchmarkResult:
    """Performance benchmark result."""
    module: str
    execution_time: float
    memory_usage_mb: float
    timestamp: str
    git_commit: Optional[str] = None
    metrics: Dict[str, float] = field(default_factory=dict)


class BaselineStore:
    """Store and retrieve performance baselines."""

    def __init__(self, baseline_dir: Path):
        self.baseline_dir = baseline_dir
        self.baseline_dir.mkdir(parents=True, exist_ok=True)

    def get_baseline_path(self, branch: str) -> Path:
        """Get baseline file path for branch."""
        return self.baseline_dir / f"baseline-{branch}.json"

    def save_baseline(self, results: Dict[str, BenchmarkResult], branch: str) -> None:
        """Save baseline results."""
        path = self.get_baseline_path(branch)
        data = {
            "branch": branch,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "results": {k: {
                "execution_time": v.execution_time,
                "memory_usage_mb": v.memory_usage_mb,
                "metrics": v.metrics,
            } for k, v in results.items()},
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    def load_baseline(self, branch: str) -> Optional[Dict]:
        """Load baseline for branch."""
        path = self.get_baseline_path(branch)
        if not path.exists():
            return None
        with open(path) as f:
            return json.load(f)


class PerformanceComparator:
    """Compare performance against baselines."""

    def __init__(self, warning_threshold: float = 1.10, failure_threshold: float = 1.20):
        self.warning_threshold = warning_threshold
        self.failure_threshold = failure_threshold

    def compare(self, current: BenchmarkResult, baseline: Dict) -> Dict:
        """Compare current result against baseline."""
        baseline_time = baseline.get("execution_time", current.execution_time)
        baseline_memory = baseline.get("memory_usage_mb", current.memory_usage_mb)

        time_ratio = current.execution_time / baseline_time if baseline_time > 0 else 1.0
        memory_ratio = current.memory_usage_mb / baseline_memory if baseline_memory > 0 else 1.0

        result = {
            "module": current.module,
            "time_regression": time_ratio > self.warning_threshold,
            "time_failure": time_ratio > self.failure_threshold,
            "time_ratio": time_ratio,
            "memory_regression": memory_ratio > self.warning_threshold,
            "memory_failure": memory_ratio > self.failure_threshold,
            "memory_ratio": memory_ratio,
        }

        return result
