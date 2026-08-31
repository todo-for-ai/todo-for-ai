#!/usr/bin/env python3
"""Main entry point for enhanced regression testing."""

import argparse
import sys
import time
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from core.config import TestConfig
from core.logger import logger
from core.parallel_runner import ParallelTestRunner
from core.result_aggregator import ResultAggregator
from reporting.html_reporter import HTMLReporter


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Enhanced Regression Test Runner")
    parser.add_argument("--parallel", action="store_true", help="Run tests in parallel")
    parser.add_argument("--performance", action="store_true", help="Run performance benchmarks")
    parser.add_argument("--notify", action="store_true", help="Send notifications")
    parser.add_argument("--config", type=Path, default=Path("testing-config.yaml"), help="Config file")
    parser.add_argument("--output", type=Path, default=Path("test-results"), help="Output directory")
    parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")

    args = parser.parse_args()

    # Load configuration
    config_path = Path(__file__).parent / args.config
    config = TestConfig.from_file(config_path)

    if args.verbose:
        logger.verbose = True

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    output_dir = args.output / timestamp
    output_dir.mkdir(parents=True, exist_ok=True)

    logger.console.print("[bold blue]Enhanced Regression Test Suite[/bold blue]")
    logger.console.print(f"Output: {output_dir}")
    logger.console.print()

    # Run tests
    runner = ParallelTestRunner(config)
    suites = runner.discover_suites()

    if not suites:
        logger.console.print("[yellow]No test suites found![/yellow]")
        return 1

    results = runner.run_parallel(suites)

    # Aggregate results
    aggregator = ResultAggregator(output_dir)
    summary = aggregator.aggregate(results)

    # Save results
    aggregator.save_json(results, timestamp)
    aggregator.generate_junit_xml(results, output_dir / "junit.xml")

    # Generate HTML report
    reporter = HTMLReporter(output_dir)
    reporter.generate(summary, timestamp)

    # Print summary
    logger.console.print()
    logger.print_summary_table(summary["modules"])

    # Return exit code
    total_failed = summary["total_failed"]
    return 0 if total_failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
