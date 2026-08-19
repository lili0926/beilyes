#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
cp ../index.html dist/index.html
echo "ok"
