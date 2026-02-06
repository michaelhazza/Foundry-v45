#!/bin/bash
# scripts/qa-cors-preflight.sh
set -euo pipefail

echo "=== QA: CORS Preflight ==="

source /tmp/qa-tokens.sh

# Read allowed origin from env-manifest.json if available, fall back to wildcard check
ALLOWED_ORIGIN=""
if [[ -f docs/env-manifest.json ]]; then
  ALLOWED_ORIGIN=$(jq -r '.required[] |
    select(.name == "CORS_ORIGIN" or .name == "ALLOWED_ORIGINS" or .name == "CLIENT_URL") |
    .defaultValue // empty' docs/env-manifest.json | head -1)
fi

if [ -z "$ALLOWED_ORIGIN" ]; then
  ALLOWED_ORIGIN="http://localhost:3000"
  echo "[INFO] No CORS origin found in env-manifest.json, using default: $ALLOWED_ORIGIN"
fi

# Pick a representative set of paths: one from each purpose type
TEST_PATHS=$(jq -r '.endpoints[] |
  select(.status == "required") |
  .path' docs/service-contracts.json | sort -u | head -5)

if [ -z "$TEST_PATHS" ]; then
  echo "[SKIP] No required endpoints to test CORS against"
  exit 0
fi

FAILURES=0
TESTED=0

while read -r route_path; do
  [ -z "$route_path" ] && continue

  # Skip parameterised paths
  if echo "$route_path" | grep -q ':'; then
    continue
  fi

  TESTED=$((TESTED + 1))

  # Send OPTIONS preflight
  RESPONSE_HEADERS=$(curl -s -D - -o /dev/null \
    -X OPTIONS \
    -H "Origin: $ALLOWED_ORIGIN" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: Authorization, Content-Type" \
    "${BASE_URL}${route_path}")

  HTTP_CODE=$(echo "$RESPONSE_HEADERS" | grep -i "^HTTP/" | tail -1 | awk '{print $2}')

  # Check for CORS headers
  HAS_ALLOW_ORIGIN=$(echo "$RESPONSE_HEADERS" | grep -ci "access-control-allow-origin" || true)
  HAS_ALLOW_METHODS=$(echo "$RESPONSE_HEADERS" | grep -ci "access-control-allow-methods" || true)
  HAS_ALLOW_HEADERS=$(echo "$RESPONSE_HEADERS" | grep -ci "access-control-allow-headers" || true)

  if [ "$HAS_ALLOW_ORIGIN" -eq 0 ]; then
    echo "[X] FAIL: OPTIONS $route_path missing Access-Control-Allow-Origin"
    FAILURES=$((FAILURES + 1))
  elif [ "$HAS_ALLOW_METHODS" -eq 0 ]; then
    echo "[X] FAIL: OPTIONS $route_path missing Access-Control-Allow-Methods"
    FAILURES=$((FAILURES + 1))
  elif [ "$HAS_ALLOW_HEADERS" -eq 0 ]; then
    echo "[X] FAIL: OPTIONS $route_path missing Access-Control-Allow-Headers"
    FAILURES=$((FAILURES + 1))
  else
    # Verify OPTIONS returned a successful status (2xx)
    if ! echo "$HTTP_CODE" | grep -qE '^2[0-9]{2}$'; then
      echo "[X] FAIL: OPTIONS $route_path returned $HTTP_CODE (expected 2xx)"
      FAILURES=$((FAILURES + 1))
      continue
    fi

    # Verify Allow-Methods includes GET
    ALLOW_METHODS=$(echo "$RESPONSE_HEADERS" | grep -i "access-control-allow-methods" | head -1)
    if ! echo "$ALLOW_METHODS" | grep -qi "GET"; then
      echo "[WARN] OPTIONS $route_path Access-Control-Allow-Methods does not include GET"
    fi

    # Verify origin is not wildcard if we have a specific expected origin
    ACTUAL_ORIGIN=$(echo "$RESPONSE_HEADERS" | grep -i "access-control-allow-origin" | head -1 | awk '{print $2}' | tr -d '\r')
    if [ "$ACTUAL_ORIGIN" = "*" ]; then
      echo "[WARN] OPTIONS $route_path uses wildcard origin (*) -- acceptable in dev, not production"
    else
      echo "[OK] OPTIONS $route_path -- CORS headers present, 2xx status (origin: $ACTUAL_ORIGIN)"
    fi
  fi
done <<< "$TEST_PATHS"

echo ""
echo "=== CORS Preflight Summary: $TESTED paths tested, $FAILURES failures ==="

if [ $FAILURES -gt 0 ]; then
  echo "[X] CORS QA FAILED: $FAILURES endpoints missing CORS headers"
  exit 1
fi

echo "[OK] CORS preflight headers present on all tested endpoints"
exit 0
