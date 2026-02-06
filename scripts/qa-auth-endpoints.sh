#!/bin/bash
# scripts/qa-auth-endpoints.sh
set -euo pipefail

echo "=== QA: Authentication Endpoints ==="

source /tmp/qa-tokens.sh

PROFILE_GET=$(jq -r '.endpoints[] |
  select(.serviceContract.purpose == "currentUser") |
  select(.method == "GET") |
  .path' docs/service-contracts.json | head -1)

if [ -z "$PROFILE_GET" ]; then
  echo "[SKIP] No currentUser endpoint defined"
  exit 0
fi

PROFILE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  "${BASE_URL}${PROFILE_GET}")

HTTP_CODE=$(echo "$PROFILE_RESPONSE" | tail -1)
BODY=$(echo "$PROFILE_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" != "200" ]; then
  echo "[X] FAIL: Current user endpoint returned $HTTP_CODE"
  exit 1
fi

# Validate response is valid JSON with non-empty body (structure varies per app)
if ! echo "$BODY" | jq -e '.' >/dev/null 2>&1; then
  echo "[X] FAIL: Current user endpoint returned non-JSON response"
  exit 1
fi

if [ "$(echo "$BODY" | jq 'length')" = "0" ]; then
  echo "[X] FAIL: Current user endpoint returned empty response"
  exit 1
fi

echo "[OK] Auth endpoints validated (200 with valid JSON)"
exit 0
