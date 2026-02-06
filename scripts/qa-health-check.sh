#!/bin/bash
# scripts/qa-health-check.sh
set -euo pipefail

echo "=== QA: Health Check Validation ==="

source /tmp/qa-tokens.sh

# Select by purpose (framework constant), not by path substring
HEALTH_PATH=$(jq -r '.endpoints[] |
  select(.serviceContract.purpose == "healthCheck") |
  .path' docs/service-contracts.json | head -1)

if [ -z "$HEALTH_PATH" ]; then
  echo "[SKIP] No health endpoint defined (purpose=healthCheck)"
  exit 0
fi

RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}${HEALTH_PATH}")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" != "200" ]; then
  echo "[X] FAIL: Health check returned $HTTP_CODE"
  exit 1
fi

# Validate response is valid JSON (structure varies per app)
if ! echo "$BODY" | jq -e '.' >/dev/null 2>&1; then
  echo "[X] FAIL: Health check returned non-JSON response"
  exit 1
fi

echo "[OK] Health check returned 200 with valid JSON"
exit 0
