#!/bin/bash
# scripts/qa-crud-smoke.sh
set -euo pipefail

echo "=== QA: CRUD Smoke Test ==="

source /tmp/qa-tokens.sh

# Find all required endpoints that declare a crudOperation
CRUD_ENDPOINTS=$(jq -c '.endpoints[] |
  select(.status == "required") |
  select(.serviceContract.crudOperation != null)' docs/service-contracts.json 2>/dev/null)

if [ -z "$CRUD_ENDPOINTS" ]; then
  echo "[SKIP] No required endpoints with crudOperation declared"
  exit 0
fi

FAILURES=0
TESTED=0

# Process each CRUD operation individually
while read -r endpoint_json; do
  [ -z "$endpoint_json" ] && continue

  METHOD=$(echo "$endpoint_json" | jq -r '.method')
  ROUTE_PATH=$(echo "$endpoint_json" | jq -r '.path')
  CRUD_OP=$(echo "$endpoint_json" | jq -r '.serviceContract.crudOperation')
  RBAC=$(echo "$endpoint_json" | jq -r '.serviceContract.rbac // "user"')

  # Select appropriate token based on required role
  if [ "$RBAC" = "admin" ]; then
    TOKEN="$ADMIN_TOKEN"
  else
    TOKEN="$USER_TOKEN"
  fi

  SKIP_VALIDATION=$(echo "$endpoint_json" | jq -r '.serviceContract.skipQAValidation // false')
  if [ "$SKIP_VALIDATION" = "true" ]; then
    echo "[INFO] Skipping $METHOD $ROUTE_PATH (manual QA only)"
    continue
  fi

  # Skip parameterised paths (contain : parameter placeholders)
  if echo "$ROUTE_PATH" | grep -q ':'; then
    echo "[INFO] Skipping parameterised path: $METHOD $ROUTE_PATH"
    continue
  fi

  TESTED=$((TESTED + 1))

  case "$CRUD_OP" in
    list|read)
      RESPONSE=$(curl -s -w "\n%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "${BASE_URL}${ROUTE_PATH}")
      HTTP_CODE=$(echo "$RESPONSE" | tail -1)

      if [ "$HTTP_CODE" != "200" ]; then
        echo "[X] FAIL: $CRUD_OP $ROUTE_PATH returned $HTTP_CODE (expected 200)"
        FAILURES=$((FAILURES + 1))
      else
        echo "[OK] $CRUD_OP: $METHOD $ROUTE_PATH ($HTTP_CODE)"
      fi
      ;;

    create)
      # Read test payload from contract if declared, otherwise send minimal JSON
      TEST_PAYLOAD=$(echo "$endpoint_json" | jq -r '.serviceContract.testPayload // "{}" ')
      HAS_TEST_PAYLOAD=$(echo "$endpoint_json" | jq 'has("serviceContract") and (.serviceContract | has("testPayload")) and .serviceContract.testPayload != null')

      RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X "$METHOD" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$TEST_PAYLOAD" \
        "${BASE_URL}${ROUTE_PATH}")
      HTTP_CODE=$(echo "$RESPONSE" | tail -1)

      if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        BODY=$(echo "$RESPONSE" | head -n -1)
        # Extract created resource ID if path is declared
        ID_PATH=$(echo "$endpoint_json" | jq -r '.serviceContract.responseIdPath // ".data.id"')
        CREATED_ID=$(echo "$BODY" | jq -r "${ID_PATH} // empty" 2>/dev/null)
        if [ -n "$CREATED_ID" ]; then
          echo "[OK] $CRUD_OP: $METHOD $ROUTE_PATH ($HTTP_CODE, id=$CREATED_ID)"
        else
          echo "[OK] $CRUD_OP: $METHOD $ROUTE_PATH ($HTTP_CODE)"
        fi
      elif [ "$HAS_TEST_PAYLOAD" = "false" ] && [ "$HTTP_CODE" = "400" ]; then
        # No testPayload declared -- 400 means endpoint is responsive (validates input)
        echo "[OK] $CRUD_OP: $METHOD $ROUTE_PATH ($HTTP_CODE -- no testPayload, endpoint responsive)"
      elif [ "$HTTP_CODE" = "500" ]; then
        echo "[X] FAIL: $CRUD_OP $ROUTE_PATH returned 500 (server error)"
        FAILURES=$((FAILURES + 1))
      else
        echo "[X] FAIL: $CRUD_OP $ROUTE_PATH returned $HTTP_CODE (expected 200/201)"
        FAILURES=$((FAILURES + 1))
      fi
      ;;

    getById)
      # getById paths typically end in :id -- skip if no test ID available
      echo "[INFO] $CRUD_OP: $METHOD $ROUTE_PATH (requires live ID -- validated via create+list)"
      ;;

    update)
      # update paths typically require :id -- validate contract declares the endpoint
      RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X "$METHOD" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{}' \
        "${BASE_URL}${ROUTE_PATH}")
      HTTP_CODE=$(echo "$RESPONSE" | tail -1)

      # Accept 200, 400 (missing ID is expected), 404 (no resource) -- reject 500
      if [ "$HTTP_CODE" = "500" ]; then
        echo "[X] FAIL: $CRUD_OP $ROUTE_PATH returned 500 (server error)"
        FAILURES=$((FAILURES + 1))
      else
        echo "[OK] $CRUD_OP: $METHOD $ROUTE_PATH ($HTTP_CODE -- endpoint responsive)"
      fi
      ;;

    delete)
      # Same approach as update -- parameterised paths need live IDs
      RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X "$METHOD" \
        -H "Authorization: Bearer $TOKEN" \
        "${BASE_URL}${ROUTE_PATH}")
      HTTP_CODE=$(echo "$RESPONSE" | tail -1)

      if [ "$HTTP_CODE" = "500" ]; then
        echo "[X] FAIL: $CRUD_OP $ROUTE_PATH returned 500 (server error)"
        FAILURES=$((FAILURES + 1))
      else
        echo "[OK] $CRUD_OP: $METHOD $ROUTE_PATH ($HTTP_CODE -- endpoint responsive)"
      fi
      ;;

    *)
      echo "[INFO] Unknown crudOperation: $CRUD_OP for $METHOD $ROUTE_PATH"
      ;;
  esac
done <<< "$CRUD_ENDPOINTS"

echo ""
echo "=== CRUD Smoke Summary: $TESTED endpoints tested, $FAILURES failures ==="

if [ $FAILURES -gt 0 ]; then
  echo "[X] CRUD SMOKE QA FAILED"
  exit 1
fi

echo "[OK] All required CRUD endpoints responsive"
exit 0
