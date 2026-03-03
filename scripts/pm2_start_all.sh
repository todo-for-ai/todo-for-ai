#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/todo-for-ai-api-server"
FRONTEND_DIR="$PROJECT_ROOT/todo-for-ai-webpage"

API_APP_NAME="todo-for-ai-api-server"
WEB_APP_NAME="todo-for-ai-web-dev"
API_PORT="${API_PORT:-50110}"
WEB_PORT="${WEB_PORT:-50111}"
PM2_HOME="${PM2_HOME:-$HOME/.todo-for-ai-pm2}"

echo "[pm2-start] project root: $PROJECT_ROOT"
echo "[pm2-start] PM2_HOME: $PM2_HOME"

mkdir -p "$PM2_HOME"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "[pm2-start] pm2 not found in PATH"
  exit 1
fi

if [ ! -x "$BACKEND_DIR/.venv/bin/gunicorn" ]; then
  echo "[pm2-start] backend gunicorn not found: $BACKEND_DIR/.venv/bin/gunicorn"
  exit 1
fi

# Clean stale listeners before binding the service ports.
for port in "$API_PORT" "$WEB_PORT"; do
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
  if [ -n "$pids" ]; then
    echo "[pm2-start] kill stale listeners on :$port -> $pids"
    echo "$pids" | xargs kill -9 || true
  fi
done

PM2_HOME="$PM2_HOME" pm2 delete "$API_APP_NAME" >/dev/null 2>&1 || true
PM2_HOME="$PM2_HOME" pm2 delete "$WEB_APP_NAME" >/dev/null 2>&1 || true

PM2_HOME="$PM2_HOME" pm2 start bash --name "$API_APP_NAME" -- -lc "cd '$BACKEND_DIR' && .venv/bin/gunicorn -w 1 -b 127.0.0.1:$API_PORT app:app"
PM2_HOME="$PM2_HOME" pm2 start "$FRONTEND_DIR/ecosystem.config.cjs" --only "$WEB_APP_NAME"

PM2_HOME="$PM2_HOME" pm2 save >/dev/null

echo "[pm2-start] waiting for health endpoints..."

for _ in {1..20}; do
  if curl -fsS "http://127.0.0.1:$API_PORT/todo-for-ai/api/v1/health" >/dev/null 2>&1 && \
     curl -fsS "http://127.0.0.1:$WEB_PORT/" >/dev/null 2>&1; then
    echo "[pm2-start] backend and frontend are healthy"
    PM2_HOME="$PM2_HOME" pm2 list
    exit 0
  fi
  sleep 1
done

echo "[pm2-start] services did not become healthy in time"
PM2_HOME="$PM2_HOME" pm2 list
exit 1
