"""Result aggregation and merging from multiple test runs."""

import json
from dataclasses import asdict
from pathlib import Path
from typing import Dict
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
        root.set("tests", str(sum(r.total for r in results.values())))
        root.set("failures", str(sum(r.failed for r in results.values())))

        for module, result in results.items():
            suite = ET.SubElement(root, "testsuite")
            suite.set("name", module)
            suite.set("time", str(result.duration))
            suite.set("tests", str(result.total))
            suite.set("failures", str(result.failed))
            suite.set("skipped", str(result.skipped))

            if result.failed > 0:
                case = ET.SubElement(suite, "testcase")
                case.set("name", f"{module} test suite")
                failure = ET.SubElement(case, "failure")
                failure.set("message", f"{result.failed} tests failed")
                failure.text = result.stderr

        tree = ET.ElementTree(root)
        tree.write(output_file, encoding="unicode", xml_declaration=True)
