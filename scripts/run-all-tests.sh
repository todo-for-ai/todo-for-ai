#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Running All Tests for todo-for-ai   ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

FAILED=0
TOTAL=0
PASSED=0

# Function to run tests with error handling
run_tests() {
    local name=$1
    local cmd=$2
    local dir=$3

    echo -e "${YELLOW}▶ Running $name tests...${NC}"
    cd "$dir" || exit 1

    TOTAL=$((TOTAL + 1))

    if eval "$cmd"; then
        echo -e "${GREEN}✓ $name tests passed${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗ $name tests failed${NC}"
        FAILED=$((FAILED + 1))
    fi

    cd - > /dev/null || exit 1
    echo ""
}

# Run agent-runtime tests
if [ -d "agent-runtime" ]; then
    run_tests "agent-runtime (Python)" "python -m pytest tests/ -v --cov=src --cov-report=term-missing 2>/dev/null || python -m pytest tests/ -v" "agent-runtime"
fi

# Run API server tests
if [ -d "todo-for-ai-api-server" ]; then
    run_tests "API Server (Python)" "python -m pytest tests/ -v --cov=. --cov-report=term-missing 2>/dev/null || python -m pytest tests/ -v" "todo-for-ai-api-server"
fi

# Run MCP tests
if [ -d "todo-for-ai-mcp" ]; then
    run_tests "MCP (TypeScript)" "npm run test:coverage 2>/dev/null || npm test" "todo-for-ai-mcp"
fi

# Run Frontend tests
if [ -d "todo-for-ai-webpage" ]; then
    run_tests "Frontend (React)" "npm run test:coverage 2>/dev/null || npm test" "todo-for-ai-webpage"
fi

# Generate report
echo -e "${YELLOW}▶ Generating test report...${NC}"
if [ -f "scripts/generate-test-report.py" ]; then
    python scripts/generate-test-report.py || echo -e "${YELLOW}⚠ Report generation skipped${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Test Summary                          ${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total: $TOTAL | Passed: ${GREEN}$PASSED${NC} | Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}   All tests passed! ✓${NC}"
else
    echo -e "${RED}   Some tests failed! ✗${NC}"
fi
echo -e "${BLUE}========================================${NC}"

exit $FAILED
