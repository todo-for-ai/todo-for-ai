# Enhanced Regression Testing Framework Design

> **Zero-Confirm Mode Design Doc** - Auto-generated for implementation

**Goal:** Build a comprehensive, parallelized regression testing framework with performance benchmarking, failure analysis, and intelligent reporting.

**Architecture:** Multi-phase pipeline with parallel test execution, result aggregation, performance comparison against baselines, and multi-format reporting.

---

## Current State Analysis

**Existing:**
- Basic regression script (5 steps: static analysis → unit → integration → E2E → security)
- Simple test report generator (HTML/JSON)
- Module-level test configuration

**Gaps:**
- Sequential execution (slow)
- No performance regression detection
- Limited failure diagnostics
- No test data management
- No notification system

## Proposed Solution

### Phase 1: Test Data & Environment Management

**Components:**
- `scripts/testing/fixtures/` - Centralized test fixtures
- `scripts/testing/docker-compose.test.yml` - Isolated test environment
- `scripts/testing/seed-data.py` - Database seeding with realistic data

**Features:**
- Docker Compose setup with MySQL, Redis, MinIO (for file testing)
- Automatic test data generation using factories
- Database migration and cleanup between runs

### Phase 2: Parallel Test Execution Engine

**Components:**
- `scripts/testing/parallel-runner.py` - Python-based parallel executor
- `scripts/testing/worker-pool.js` - Node.js worker pool for TS tests

**Parallel Strategy:**
```
┌─────────────────────────────────────────────┐
│         Test Execution Matrix               │
├─────────────┬─────────────┬────────────────┤
│   Module    │   Runner    │    Workers     │
├─────────────┼─────────────┼────────────────┤
│ agent-run   │   pytest    │   4 (by file)  │
│ api-server  │   pytest    │   4 (by file)  │
│ mcp         │   vitest    │   2 (CPU cores)│
│ frontend    │   vitest    │   2 (CPU cores)│
└─────────────┴─────────────┴────────────────┘
```

**Features:**
- Process-level parallelization (module-level)
- Thread-level parallelization (within pytest/vitest)
- Resource limits (CPU/memory)
- Timeout handling per test suite

### Phase 3: Performance Regression Detection

**Components:**
- `scripts/testing/performance-benchmark.py` - Benchmark runner
- `scripts/testing/baseline-store.py` - Baseline management
- `.benchmarks/` - Baseline storage directory

**Metrics Tracked:**
- Test suite execution time (per module)
- API response times (p50, p95, p99)
- Database query performance
- Memory usage peaks

**Regression Detection:**
- Compare against stored baselines
- Configurable thresholds (e.g., +10% = warning, +20% = failure)
- Trend analysis (last 10 runs)

### Phase 4: Intelligent Failure Analysis

**Components:**
- `scripts/testing/failure-analyzer.py` - Failure pattern detection
- `scripts/testing/artifact-collector.py` - Log/screenshot collection

**Features:**
- Automatic screenshot capture on E2E failure
- Log tail collection (last 100 lines)
- Stack trace parsing and categorization
- Flaky test detection (track intermittent failures)

### Phase 5: Multi-Format Reporting

**Reports Generated:**
1. **HTML Dashboard** - Interactive report with charts
2. **JUnit XML** - CI/CD integration
3. **JSON API** - Programmatic access
4. **Markdown Summary** - PR comments
5. **Slack Notification** - Team alerts

**Report Contents:**
- Coverage trends (line/branch/function)
- Test execution times
- Failure categorization
- Performance regression alerts
- Flaky test warnings

### Phase 6: Notification System

**Triggers:**
- Test failure (immediate)
- Performance regression (threshold exceeded)
- Coverage drop (below threshold)
- New flaky tests detected

**Channels:**
- Slack webhook
- GitHub PR comments
- Email (for scheduled runs)

## Data Flow

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Trigger    │───▶│   Setup      │───▶│   Parallel   │
│ (Manual/CI)  │    │ Environment  │    │  Execution   │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                                │
                       ┌────────────────────────┘
                       ▼
              ┌─────────────────┐
              │ Result Analysis │
              └────────┬────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌─────────┐  ┌──────────┐  ┌──────────┐
    │Report   │  │Notify    │  │Baseline  │
    │Generate │  │   Team    │  │  Update  │
    └─────────┘  └──────────┘  └──────────┘
```

## File Structure

```
scripts/testing/
├── core/
│   ├── __init__.py
│   ├── config.py              # Test configuration
│   ├── parallel_runner.py     # Parallel execution engine
│   ├── result_aggregator.py   # Result collection & merge
│   └── logger.py              # Structured logging
├── fixtures/
│   ├── __init__.py
│   ├── base.py                # Base fixture classes
│   ├── users.py               # User fixtures
│   ├── tasks.py               # Task fixtures
│   └── seed_database.py       # Database seeding script
├── performance/
│   ├── benchmark.py           # Benchmark runner
│   ├── baseline_store.py      # Baseline management
│   └── comparators.py         # Performance comparison logic
├── analysis/
│   ├── failure_analyzer.py    # Failure pattern analysis
│   ├── flaky_detector.py      # Flaky test detection
│   └── artifact_collector.py  # Screenshot/log collection
├── reporting/
│   ├── html_reporter.py       # HTML report generator
│   ├── junit_reporter.py      # JUnit XML generator
│   ├── slack_notifier.py      # Slack integration
│   └── markdown_reporter.py   # Markdown summary
├── docker/
│   ├── docker-compose.test.yml
│   └── Dockerfile.test
├── run-regression-enhanced.sh  # Main entry point
└── requirements-testing.txt    # Python dependencies

.benchmarks/                    # Performance baselines
└── [timestamp]/
    ├── agent-runtime.json
    ├── api-server.json
    ├── mcp.json
    └── frontend.json

.test-results/                  # Test artifacts
├── [timestamp]/
│   ├── junit/
│   ├── coverage/
│   ├── screenshots/
│   └── logs/
└── latest/                     # Symlink to latest run
```

## Configuration Schema

```yaml
# testing-config.yaml
testing:
  parallel:
    max_workers: 4
    timeout_per_suite: 600  # seconds

  performance:
    enabled: true
    baseline_branch: main
    thresholds:
      warning: 1.10  # +10%
      failure: 1.20  # +20%

  reporting:
    formats: [html, junit, json, markdown]
    retention_days: 30

  notifications:
    slack:
      webhook_url: ${SLACK_WEBHOOK_URL}
      channel: "#tests"
    github:
      post_pr_comment: true

  coverage:
    fail_under:
      agent-runtime: 70
      api-server: 60
      mcp: 70
      frontend: 60
```

## Success Criteria

1. **Execution Speed** - Complete regression suite in < 5 minutes (parallel)
2. **Reliability** - 99%+ success rate for infrastructure (not tests)
3. **Visibility** - Clear failure reasons with artifacts
4. **Performance Tracking** - Automatic regression detection
5. **Integration** - Seamless CI/CD with actionable notifications

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Resource contention | CPU/memory limits per worker |
| Database conflicts | Isolated test databases per run |
| Flaky tests | Detection and quarantine system |
| Baseline drift | Weekly baseline refresh |

---

**Auto-approved:** Proceeding to implementation planning...
