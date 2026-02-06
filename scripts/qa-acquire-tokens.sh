#!/bin/bash
# scripts/qa-acquire-tokens.sh
set -euo pipefail

echo "=== Token Acquisition for QA Tests ==="

# Resolve server base URL once - all QA scripts source this
SERVER_PORT="${PORT:-5000}"
BASE_URL="${BASE_URL:-http://localhost:${SERVER_PORT}}"

# Verify build proof exists and is not a template
if [[ ! -f docs/build-gate-results.json ]]; then
  echo "[X] FAIL: docs/build-gate-results.json not found -- run gates first"
  exit 1
fi

BUILD_TOTAL=$(jq -r '.summary.total' docs/build-gate-results.json)
BUILD_ID=$(jq -r '.buildId' docs/build-gate-results.json)
if [[ "$BUILD_TOTAL" == "0" || "$BUILD_ID" == "GENERATED_AT_RUNTIME" ]]; then
  echo "[X] FAIL: build-gate-results.json is still a template -- run gates first"
  exit 1
fi

# Credentials from env vars with defaults
ADMIN_EMAIL="${QA_ADMIN_EMAIL:-admin@test.local}"
ADMIN_PASSWORD="${QA_ADMIN_PASSWORD:-AdminPass123!}"
USER_EMAIL="${QA_USER_EMAIL:-user@test.local}"
USER_PASSWORD="${QA_USER_PASSWORD:-UserPass123!}"

LOGIN_ENDPOINT=$(jq -r '.endpoints[] |
  select(.serviceContract.purpose == "login") |
  select(.method == "POST") |
  .path' docs/service-contracts.json | head -1)

if [ -z "$LOGIN_ENDPOINT" ]; then
  echo "[X] FAIL: No login endpoint found (purpose=login)"
  exit 1
fi

# Read token extraction path from endpoint level (Agent 4 schema), default to .data.accessToken
TOKEN_PATH=$(jq -r '.endpoints[] |
  select(.serviceContract.purpose == "login") |
  (.responseTokenPath // .serviceContract.responseTokenPath // ".data.accessToken")' docs/service-contracts.json | head -1)

ADMIN_LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}" \
  "${BASE_URL}${LOGIN_ENDPOINT}")

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r "${TOKEN_PATH} // empty")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "[X] FAIL: Admin login failed (tried path: $TOKEN_PATH)"
  echo "Response: $ADMIN_LOGIN_RESPONSE"
  exit 1
fi

USER_LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${USER_EMAIL}\",\"password\":\"${USER_PASSWORD}\"}" \
  "${BASE_URL}${LOGIN_ENDPOINT}")

USER_TOKEN=$(echo "$USER_LOGIN_RESPONSE" | jq -r "${TOKEN_PATH} // empty")

if [ -z "$USER_TOKEN" ]; then
  echo "[X] FAIL: User login failed (tried path: $TOKEN_PATH)"
  echo "Response: $USER_LOGIN_RESPONSE"
  exit 1
fi

cat > /tmp/qa-tokens.sh <<EOF
export ADMIN_TOKEN="$ADMIN_TOKEN"
export USER_TOKEN="$USER_TOKEN"
export TEST_TOKEN="$ADMIN_TOKEN"
export BASE_URL="$BASE_URL"
EOF

echo "[OK] Tokens acquired successfully (BASE_URL: $BASE_URL)"
exit 0
