#!/bin/bash
# scripts/run-all-qa-tests.sh
set -euo pipefail

echo "=== Running Complete QA Suite ==="

# Split-first guard - ensure qa-splitter.sh has been run
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPECTED_QA_SCRIPTS=11

ACTUAL_QA_SCRIPTS=$(ls -1 "$SCRIPT_DIR"/qa-*.sh 2>/dev/null | wc -l)
if [[ $ACTUAL_QA_SCRIPTS -lt $EXPECTED_QA_SCRIPTS ]]; then
  echo "[X] ERROR: Found $ACTUAL_QA_SCRIPTS QA scripts, expected $EXPECTED_QA_SCRIPTS"
  echo ""
  echo "    Scripts have not been extracted. Run this first:"
  echo "    bash docs/qa-splitter.sh"
  echo ""
  exit 1
fi

bash scripts/qa-acquire-tokens.sh || exit 1
source /tmp/qa-tokens.sh

# Infrastructure
bash scripts/qa-health-check.sh
bash scripts/qa-auth-endpoints.sh

# Business surface
bash scripts/qa-crud-smoke.sh

# Response quality
bash scripts/qa-response-format.sh

# Optional features
bash scripts/qa-file-upload-mime.sh

# Security
bash scripts/qa-unauthenticated-access.sh
bash scripts/qa-role-protection.sh
bash scripts/qa-input-validation.sh
bash scripts/qa-tenancy-isolation.sh

# Web integration
bash scripts/qa-cors-preflight.sh

echo "[OK] QA suite complete (12 scripts)"
exit 0
