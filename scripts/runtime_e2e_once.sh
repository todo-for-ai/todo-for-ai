#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUNTIME_DIR="${REPO_ROOT}/agent-runtime"
RUNTIME_SCRIPT="${RUNTIME_DIR}/scripts/run_docker_e2e_once.sh"

if [ ! -x "${RUNTIME_SCRIPT}" ]; then
  echo "❌ runtime E2E script not found or not executable: ${RUNTIME_SCRIPT}" >&2
  exit 1
fi

cd "${RUNTIME_DIR}"
exec "${RUNTIME_SCRIPT}" "$@"
