#!/usr/bin/env bash

set -euo pipefail

PM2_HOME="${PM2_HOME:-$HOME/.todo-for-ai-pm2}"
API_APP_NAME="todo-for-ai-api-server"
WEB_APP_NAME="todo-for-ai-web-dev"

echo "[pm2-stop] PM2_HOME: $PM2_HOME"

PM2_HOME="$PM2_HOME" pm2 delete "$API_APP_NAME" >/dev/null 2>&1 || true
PM2_HOME="$PM2_HOME" pm2 delete "$WEB_APP_NAME" >/dev/null 2>&1 || true
PM2_HOME="$PM2_HOME" pm2 save >/dev/null || true

echo "[pm2-stop] stopped: $API_APP_NAME, $WEB_APP_NAME"
PM2_HOME="$PM2_HOME" pm2 list || true
