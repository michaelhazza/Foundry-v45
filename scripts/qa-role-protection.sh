#!/bin/bash
# scripts/qa-role-protection.sh
set -euo pipefail

echo "=== QA: Role Protection ==="

source /tmp/qa-tokens.sh

ADMIN_ENDPOINTS=$(jq -r '.endpoints[] |
  select(.serviceContract.rbac == "admin") |
  "\(.method) \(.path)"' docs/service-contracts.json)

if [ -z "$ADMIN_ENDPOINTS" ]; then
  echo "[SKIP] No admin-protected endpoints"
  exit 0
fi

FAILURES=0

while read -r endpoint; do
  [ -z "$endpoint" ] && continue

  METHOD=$(echo "$endpoint" | awk '{print $1}')
  ROUTE_PATH=$(echo "$endpoint" | awk '{print $2}')

  # Write methods need a body to avoid 400 (which masks the auth check)
  case "$METHOD" in
    POST|PUT|PATCH)
      HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null \
        -X "$METHOD" \
        -H "Authorization: Bearer $USER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{}' \
        "${BASE_URL}${ROUTE_PATH}")
      ;;
    *)
      HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null \
        -X "$METHOD" \
        -H "Authorization: Bearer $USER_TOKEN" \
        "${BASE_URL}${ROUTE_PATH}")
      ;;
  esac

  if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "[OK] Correctly rejected user access to $METHOD $ROUTE_PATH ($HTTP_CODE)"
  else
    echo "[X] FAIL: User accessed admin endpoint $METHOD $ROUTE_PATH (returned $HTTP_CODE)"
    FAILURES=$((FAILURES + 1))
  fi
done <<< "$ADMIN_ENDPOINTS"

if [ $FAILURES -gt 0 ]; then
  echo "[X] ROLE PROTECTION QA FAILED: $FAILURES endpoints not protected"
  exit 1
fi

echo "[OK] Role protection enforced"
exit 0
