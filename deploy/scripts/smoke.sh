#!/usr/bin/env bash
set -euo pipefail

echo "==> Running smoke check against http://localhost:8004..."
curl -fsS "http://localhost:8004/healthz"
echo ""
echo "==> Smoke check passed!"
