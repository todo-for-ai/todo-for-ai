#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/pm2_stop_all.sh"
"$SCRIPT_DIR/pm2_start_all.sh"
