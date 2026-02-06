#!/bin/bash
# scripts/qa-response-format.sh
set -euo pipefail

echo "=== QA: Response Format Consistency ==="

source /tmp/qa-tokens.sh

# Test all required GET endpoints for valid JSON responses
GET_ENDPOINTS=$(jq -r '.endpoints[] |
  select(.status == "required") |
  select(.method == "GET") |
  .path' docs/service-contracts.json)

if [ -z "$GET_ENDPOINTS" ]; then
  echo "[SKIP] No required GET endpoints found"
  exit 0
fi

FAILURES=0
TESTED=0

while read -r route_path; do
  [ -z "$route_path" ] && continue

  # Skip parameterised paths (contain :id or similar) -- these need live IDs
  if echo "$route_path" | grep -q ':'; then
    echo "[INFO] Skipping parameterised path: $route_path"
    continue
  fi

  TESTED=$((TESTED + 1))

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "${BASE_URL}${route_path}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  # Check HTTP status is not 500
  if [ "$HTTP_CODE" = "500" ]; then
    echo "[X] FAIL: GET $route_path returned 500"
    FAILURES=$((FAILURES + 1))
    continue
  fi

  # Check response is valid JSON
  if ! echo "$BODY" | jq -e '.' >/dev/null 2>&1; then
    echo "[X] FAIL: GET $route_path returned non-JSON response (HTTP $HTTP_CODE)"
    echo "    Body preview: ${BODY:0:100}"
    FAILURES=$((FAILURES + 1))
    continue
  fi

  # Check response is not an HTML error page (common Express failure mode)
  if echo "$BODY" | grep -qi '<!DOCTYPE\|<html'; then
    echo "[X] FAIL: GET $route_path returned HTML instead of JSON"
    FAILURES=$((FAILURES + 1))
    continue
  fi

  echo "[OK] GET $route_path ($HTTP_CODE, valid JSON)"
done <<< "$GET_ENDPOINTS"

echo ""
echo "=== Response Format Summary: $TESTED endpoints tested, $FAILURES failures ==="

if [ $FAILURES -gt 0 ]; then
  echo "[X] RESPONSE FORMAT QA FAILED: $FAILURES endpoints returned invalid responses"
  exit 1
fi

echo "[OK] All required GET endpoints return valid JSON"
exit 0
