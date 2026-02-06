#!/bin/bash
# scripts/qa-input-validation.sh
set -euo pipefail

echo "=== QA: Input Validation ==="

source /tmp/qa-tokens.sh

# Find endpoints that accept request bodies (create/update operations)
BODY_ENDPOINTS=$(jq -c '.endpoints[] |
  select(.status == "required") |
  select(.method == "POST" or .method == "PUT" or .method == "PATCH") |
  select(.serviceContract.purpose != "login") |
  select(.serviceContract.fileUpload != true)' docs/service-contracts.json 2>/dev/null)

if [ -z "$BODY_ENDPOINTS" ]; then
  echo "[SKIP] No required body-accepting endpoints found"
  exit 0
fi

FAILURES=0
TESTED=0

# Malformed payloads that should trigger 400, never 500
MALFORMED_PAYLOADS=(
  'not-json-at-all'
  '{"unclosed": '
  '[]'
  'null'
  ''
)

while read -r endpoint_json; do
  [ -z "$endpoint_json" ] && continue

  METHOD=$(echo "$endpoint_json" | jq -r '.method')
  ROUTE_PATH=$(echo "$endpoint_json" | jq -r '.path')

  SKIP_VALIDATION=$(echo "$endpoint_json" | jq -r '.serviceContract.skipQAValidation // false')
  if [ "$SKIP_VALIDATION" = "true" ]; then
    echo "[INFO] Skipping $METHOD $ROUTE_PATH (manual QA only)"
    continue
  fi

  TESTED=$((TESTED + 1))
  ENDPOINT_FAILED=false

  for payload in "${MALFORMED_PAYLOADS[@]}"; do
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null \
      -X "$METHOD" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "${BASE_URL}${ROUTE_PATH}")

    if [ "$HTTP_CODE" = "500" ]; then
      # Truncate payload for display
      DISPLAY_PAYLOAD="${payload:0:30}"
      echo "[X] FAIL: $METHOD $ROUTE_PATH returned 500 on malformed input (payload: $DISPLAY_PAYLOAD)"
      ENDPOINT_FAILED=true
      break
    fi
  done

  if [ "$ENDPOINT_FAILED" = true ]; then
    FAILURES=$((FAILURES + 1))
  else
    echo "[OK] $METHOD $ROUTE_PATH handles malformed input gracefully (no 500s)"
  fi
done <<< "$BODY_ENDPOINTS"

echo ""
echo "=== Input Validation Summary: $TESTED endpoints tested, $FAILURES failures ==="

if [ $FAILURES -gt 0 ]; then
  echo "[X] INPUT VALIDATION QA FAILED: $FAILURES endpoints return 500 on bad input"
  exit 1
fi

echo "[OK] All body-accepting endpoints handle malformed input without 500"
exit 0
