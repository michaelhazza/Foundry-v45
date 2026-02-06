#!/bin/bash
# scripts/qa-file-upload-mime.sh
set -euo pipefail

echo "=== QA: File Upload MIME Validation ==="

source /tmp/qa-tokens.sh

# Supported MIME types for automated QA testing
SUPPORTED_MIMES="text/csv application/json text/plain"

UPLOAD_ENDPOINTS=$(jq -c '.endpoints[] |
  select(.serviceContract.fileUpload == true)' docs/service-contracts.json 2>/dev/null)

if [ -z "$UPLOAD_ENDPOINTS" ]; then
  echo "[SKIP] No upload endpoints defined"
  exit 0
fi

FAILURES=0

while read -r endpoint_json; do
  [ -z "$endpoint_json" ] && continue

  METHOD=$(echo "$endpoint_json" | jq -r '.method')
  ROUTE_PATH=$(echo "$endpoint_json" | jq -r '.path')
  STATUS=$(echo "$endpoint_json" | jq -r '.status')

  SKIP_VALIDATION=$(echo "$endpoint_json" | jq -r '.serviceContract.skipQAValidation // false')
  if [ "$SKIP_VALIDATION" = "true" ]; then
    echo "[INFO] Skipping $METHOD $ROUTE_PATH (manual QA only)"
    continue
  fi

  # Skip parameterised paths
  if echo "$ROUTE_PATH" | grep -q ':'; then
    echo "[SKIP] $ROUTE_PATH (parameterized endpoint - requires test fixtures)"
    continue
  fi

  # Guard: check allowedMimeTypes exists and is non-empty (endpoint-level per Agent 4 schema, fallback to serviceContract)
  MIME_COUNT=$(echo "$endpoint_json" | jq '(.allowedMimeTypes // .serviceContract.allowedMimeTypes // []) | length')
  if [ "$MIME_COUNT" = "0" ] || [ "$MIME_COUNT" = "null" ]; then
    echo "[SKIP] $METHOD $ROUTE_PATH: no allowedMimeTypes declared"
    continue
  fi

  # Find first supported MIME type from the endpoint's allowed list
  TEST_MIME=""
  for candidate in $SUPPORTED_MIMES; do
    FOUND=$(echo "$endpoint_json" | jq -r --arg m "$candidate" '(.allowedMimeTypes // .serviceContract.allowedMimeTypes // [])[] | select(. == $m)')
    if [ -n "$FOUND" ]; then
      TEST_MIME="$candidate"
      break
    fi
  done

  if [ -z "$TEST_MIME" ]; then
    echo "[SKIP] $METHOD $ROUTE_PATH: no QA-supported MIME type in allowed list"
    continue
  fi

  # Create test file for the selected MIME type
  case "$TEST_MIME" in
    "text/csv")
      echo "name,value" > /tmp/test-upload.csv
      echo "test,123" >> /tmp/test-upload.csv
      TEST_FILE="/tmp/test-upload.csv"
      ;;
    "application/json")
      echo '{"test": "data"}' > /tmp/test-upload.json
      TEST_FILE="/tmp/test-upload.json"
      ;;
    "text/plain")
      echo "test data" > /tmp/test-upload.txt
      TEST_FILE="/tmp/test-upload.txt"
      ;;
  esac

  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X "$METHOD" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -F "file=@${TEST_FILE};type=${TEST_MIME}" \
    "${BASE_URL}${ROUTE_PATH}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)

  if [ "$STATUS" = "required" ]; then
    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
      echo "[X] FAIL: $METHOD $ROUTE_PATH returned $HTTP_CODE (required endpoint)"
      FAILURES=$((FAILURES + 1))
    else
      echo "[OK] Upload succeeded: $METHOD $ROUTE_PATH ($HTTP_CODE, $TEST_MIME)"
    fi
  else
    echo "[OK] Upload returned $HTTP_CODE for $METHOD $ROUTE_PATH (not required)"
  fi
done <<< "$UPLOAD_ENDPOINTS"

if [ $FAILURES -gt 0 ]; then
  echo "[X] UPLOAD QA FAILED: $FAILURES required endpoints failed"
  exit 1
fi

echo "[OK] All required upload endpoints validated"
exit 0
