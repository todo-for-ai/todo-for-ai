"""HTML and JUnit reporters for test results."""

import json
from pathlib import Path
from typing import Dict
from datetime import datetime


class HTMLReporter:
    """Generate HTML test reports."""

    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, results: Dict, timestamp: str) -> Path:
        """Generate HTML report."""
        output_file = self.output_dir / f"report-{timestamp}.html"

        html = self._render_html(results, timestamp)

        with open(output_file, "w") as f:
            f.write(html)

        return output_file

    def _render_html(self, results: Dict, timestamp: str) -> str:
        """Render HTML template."""
        total = results.get("total_tests", 0)
        passed = results.get("total_passed", 0)
        failed = results.get("total_failed", 0)
        duration = results.get("total_duration", 0)

        success_rate = (passed / total * 100) if total > 0 else 0

        return f"""<!DOCTYPE html>
<html>
<head>
    <title>Test Report - {timestamp}</title>
    <style>
        body {{ font-family: -apple-system, sans-serif; margin: 40px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }}
        h1 {{ color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }}
        .summary {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }}
        .metric {{ background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }}
        .metric-value {{ font-size: 32px; font-weight: bold; color: #333; }}
        .metric-label {{ color: #666; font-size: 14px; }}
        .success {{ color: #4CAF50; }}
        .failure {{ color: #f44336; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background: #4CAF50; color: white; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Test Report - {timestamp}</h1>
        <div class="summary">
            <div class="metric">
                <div class="metric-value {'success' if failed == 0 else 'failure'}">{success_rate:.1f}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">{total}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value success">{passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value {'failure' if failed > 0 else 'success'}">{failed}</div>
                <div class="metric-label">Failed</div>
            </div>
        </div>
        <p>Duration: {duration:.2f}s</p>
    </div>
</body>
</html>"""


class SlackNotifier:
    """Send Slack notifications for test results."""

    def __init__(self, webhook_url: str, channel: str = "#tests"):
        self.webhook_url = webhook_url
        self.channel = channel

    def notify(self, results: Dict) -> bool:
        """Send notification to Slack."""
        # Placeholder implementation
        # Real implementation would use requests to POST to webhook
        return True
