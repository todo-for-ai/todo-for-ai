#!/usr/bin/env python3
"""Generate comprehensive test report from all test results."""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional
import xml.etree.ElementTree as ET


def load_coverage_xml(path: Path) -> Dict[str, Any]:
    """Parse coverage XML file."""
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
        total = data.get("total", {})
        return {
            "line_rate": total.get("lines", {}).get("pct", 0) / 100,
            "functions_rate": total.get("functions", {}).get("pct", 0) / 100,
            "branches_rate": total.get("branches", {}).get("pct", 0) / 100,
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
        },
        "projects": {},
    }

    # agent-runtime
    report["projects"]["agent-runtime"] = {
        "language": "Python",
        "framework": "pytest",
        "coverage": load_coverage_xml(Path("agent-runtime/coverage.xml")),
    }

    # API server
    report["projects"]["api-server"] = {
        "language": "Python",
        "framework": "pytest",
        "coverage": load_coverage_xml(Path("todo-for-ai-api-server/coverage.xml")),
    }

    # MCP
    report["projects"]["mcp"] = {
        "language": "TypeScript",
        "framework": "Vitest",
        "coverage": load_coverage_json(Path("todo-for-ai-mcp/coverage/coverage-final.json")),
    }

    # Frontend
    report["projects"]["frontend"] = {
        "language": "TypeScript/React",
        "framework": "Vitest",
        "coverage": load_coverage_json(Path("todo-for-ai-webpage/coverage/coverage-final.json")),
    }

    # Calculate overall statistics
    total_coverage = []
    for name, project in report["projects"].items():
        cov = project.get("coverage", {})
        if "line_rate" in cov and "error" not in cov:
            total_coverage.append(cov["line_rate"])

    if total_coverage:
        report["summary"]["average_coverage"] = sum(total_coverage) / len(total_coverage)

    # Save JSON report
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
    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Test Report - todo-for-ai</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 40px;
            background: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1 {{
            color: #333;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 10px;
        }}
        h2 {{
            color: #555;
            margin-top: 30px;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            background: white;
        }}
        th, td {{
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }}
        th {{
            background: #4CAF50;
            color: white;
            font-weight: 600;
        }}
        tr:nth-child(even) {{
            background: #f9f9f9;
        }}
        .metric {{
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
        }}
        .coverage-bar {{
            width: 100%;
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
        }}
        .coverage-fill {{
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            transition: width 0.3s ease;
        }}
        .timestamp {{
            color: #666;
            font-size: 14px;
        }}
        .summary-box {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .summary-item {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }}
        .summary-label {{
            color: #666;
            font-size: 14px;
            margin-bottom: 8px;
        }}
        .summary-value {{
            font-size: 28px;
            font-weight: bold;
            color: #333;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Test Report - todo-for-ai</h1>
        <p class="timestamp">Generated: {report["generated_at"]}</p>

        <div class="summary-box">
            <div class="summary-item">
                <div class="summary-label">Total Projects</div>
                <div class="summary-value">{report["summary"]["total_projects"]}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Average Coverage</div>
                <div class="summary-value">{report["summary"].get("average_coverage", 0) * 100:.1f}%</div>
            </div>
        </div>

        <h2>Coverage by Project</h2>
        <table>
            <thead>
                <tr>
                    <th>Project</th>
                    <th>Language</th>
                    <th>Framework</th>
                    <th>Line Coverage</th>
                    <th>Visual</th>
                </tr>
            </thead>
            <tbody>
"""

    for name, project in report["projects"].items():
        cov = project.get("coverage", {})
        if "error" in cov:
            percentage = 0
            percentage_str = "N/A"
        else:
            line_rate = cov.get("line_rate", 0)
            percentage = line_rate * 100
            percentage_str = f"{percentage:.1f}%"

        html += f"""
                <tr>
                    <td><strong>{name}</strong></td>
                    <td>{project["language"]}</td>
                    <td>{project["framework"]}</td>
                    <td>{percentage_str}</td>
                    <td>
                        <div class="coverage-bar">
                            <div class="coverage-fill" style="width: {percentage}%"></div>
                        </div>
                    </td>
                </tr>
"""

    html += """
            </tbody>
        </table>
    </div>
</body>
</html>
"""
    return html


if __name__ == "__main__":
    generate_report()
