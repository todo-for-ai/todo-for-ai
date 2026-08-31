#!/usr/bin/env bash

set -euo pipefail

API_PORT="${API_PORT:-50110}"
WEB_PORT="${WEB_PORT:-50111}"
PM2_HOME="${PM2_HOME:-$HOME/.todo-for-ai-pm2}"

echo "[pm2-status] PM2_HOME: $PM2_HOME"
PM2_HOME="$PM2_HOME" pm2 list || true

echo "[pm2-status] backend health:"
curl -sS "http://127.0.0.1:$API_PORT/todo-for-ai/api/v1/health" || true
echo

echo "[pm2-status] frontend root:"
curl -sS -o /tmp/todo-for-ai-web-status.out -w "%{http_code}" "http://127.0.0.1:$WEB_PORT/" || true
echo
