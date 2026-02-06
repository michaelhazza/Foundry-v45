#!/bin/bash
# scripts/qa-unauthenticated-access.sh
set -euo pipefail

echo "=== QA: Unauthenticated Access ==="

source /tmp/qa-tokens.sh

# Find all endpoints that are NOT public (should reject unauthenticated requests)
PROTECTED_ENDPOINTS=$(jq -r '.endpoints[] |
  select(.authentication != "public") |
  select(.serviceContract.purpose != "login") |
  select(.serviceContract.purpose != "healthCheck") |
  "\(.method) \(.path)"' docs/service-contracts.json)

if [ -z "$PROTECTED_ENDPOINTS" ]; then
  echo "[SKIP] No protected endpoints found"
  exit 0
fi

FAILURES=0
TESTED=0

while read -r endpoint; do
  [ -z "$endpoint" ] && continue

  METHOD=$(echo "$endpoint" | awk '{print $1}')
  ROUTE_PATH=$(echo "$endpoint" | awk '{print $2}')
  TESTED=$((TESTED + 1))

  # Send request with NO Authorization header
  case "$METHOD" in
    POST|PUT|PATCH)
      HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null \
        -X "$METHOD" \
        -H "Content-Type: application/json" \
        -d '{}' \
        "${BASE_URL}${ROUTE_PATH}")
      ;;
    *)
      HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null \
        -X "$METHOD" \
        "${BASE_URL}${ROUTE_PATH}")
      ;;
  esac

  if [ "$HTTP_CODE" = "401" ]; then
    echo "[OK] Correctly rejected unauthenticated $METHOD $ROUTE_PATH (401)"
  elif [ "$HTTP_CODE" = "403" ]; then
    echo "[OK] Rejected unauthenticated $METHOD $ROUTE_PATH (403)"
  else
    echo "[X] FAIL: Unauthenticated $METHOD $ROUTE_PATH returned $HTTP_CODE (expected 401/403)"
    FAILURES=$((FAILURES + 1))
  fi
done <<< "$PROTECTED_ENDPOINTS"

echo ""
echo "=== Unauthenticated Access Summary: $TESTED endpoints tested, $FAILURES failures ==="

if [ $FAILURES -gt 0 ]; then
  echo "[X] UNAUTHENTICATED ACCESS QA FAILED: $FAILURES endpoints unprotected"
  exit 1
fi

echo "[OK] All protected endpoints reject unauthenticated requests"
exit 0
