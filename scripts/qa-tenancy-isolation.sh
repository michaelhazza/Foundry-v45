#!/bin/bash
# scripts/qa-tenancy-isolation.sh
set -euo pipefail

echo "=== QA: Tenancy Isolation ==="

source /tmp/qa-tokens.sh

# Check if multiTenancy is declared in scope manifest
if [[ ! -f docs/scope-manifest.json ]]; then
  echo "[SKIP] No scope-manifest.json -- tenancy isolation test skipped"
  exit 0
fi

ISOLATION_FIELD=$(jq -r '.platformConstraints.multiTenancy.isolationField // empty' docs/scope-manifest.json)

if [ -z "$ISOLATION_FIELD" ]; then
  echo "[SKIP] No multiTenancy.isolationField declared -- tenancy test skipped"
  exit 0
fi

echo "[INFO] Isolation field: $ISOLATION_FIELD"

# Acquire a second tenant token
TENANT_B_EMAIL="${QA_TENANT_B_EMAIL:-tenant-b@test.local}"
TENANT_B_PASSWORD="${QA_TENANT_B_PASSWORD:-TenantBPass123!}"

LOGIN_ENDPOINT=$(jq -r '.endpoints[] |
  select(.serviceContract.purpose == "login") |
  select(.method == "POST") |
  .path' docs/service-contracts.json | head -1)

TOKEN_PATH=$(jq -r '.endpoints[] |
  select(.serviceContract.purpose == "login") |
  (.responseTokenPath // .serviceContract.responseTokenPath // ".data.accessToken")' docs/service-contracts.json | head -1)

TENANT_B_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TENANT_B_EMAIL}\",\"password\":\"${TENANT_B_PASSWORD}\"}" \
  "${BASE_URL}${LOGIN_ENDPOINT}")

TENANT_B_TOKEN=$(echo "$TENANT_B_RESPONSE" | jq -r "${TOKEN_PATH} // empty")

if [ -z "$TENANT_B_TOKEN" ]; then
  echo "[SKIP] Tenant B login failed -- tenancy isolation test requires two tenants"
  echo "       Set QA_TENANT_B_EMAIL and QA_TENANT_B_PASSWORD, or seed a second tenant"
  exit 0
fi

echo "[OK] Tenant B token acquired"

# Find list endpoints that should be tenant-scoped
TENANT_SCOPED=$(jq -c '.endpoints[] |
  select(.status == "required") |
  select(.serviceContract.crudOperation == "list") |
  select(.serviceContract.tenantScoped == true)' docs/service-contracts.json 2>/dev/null)

if [ -z "$TENANT_SCOPED" ]; then
  echo "[SKIP] No tenant-scoped list endpoints declared"
  exit 0
fi

FAILURES=0

while read -r endpoint_json; do
  [ -z "$endpoint_json" ] && continue

  ROUTE_PATH=$(echo "$endpoint_json" | jq -r '.path')

  # Get tenant A's list
  RESPONSE_A=$(curl -s \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "${BASE_URL}${ROUTE_PATH}")

  # Get tenant B's list
  RESPONSE_B=$(curl -s \
    -H "Authorization: Bearer $TENANT_B_TOKEN" \
    "${BASE_URL}${ROUTE_PATH}")

  # Both should return valid JSON
  if ! echo "$RESPONSE_A" | jq -e '.' >/dev/null 2>&1; then
    echo "[X] FAIL: Tenant A list for $ROUTE_PATH is not valid JSON"
    FAILURES=$((FAILURES + 1))
    continue
  fi

  if ! echo "$RESPONSE_B" | jq -e '.' >/dev/null 2>&1; then
    echo "[X] FAIL: Tenant B list for $ROUTE_PATH is not valid JSON"
    FAILURES=$((FAILURES + 1))
    continue
  fi

  # Extract IDs from both responses (using responseIdPath if declared)
  ID_PATH=$(echo "$endpoint_json" | jq -r '.serviceContract.responseIdPath // ".data[].id"')

  IDS_A=$(echo "$RESPONSE_A" | jq -r "${ID_PATH} // empty" 2>/dev/null | sort)
  IDS_B=$(echo "$RESPONSE_B" | jq -r "${ID_PATH} // empty" 2>/dev/null | sort)

  if [ -z "$IDS_A" ] && [ -z "$IDS_B" ]; then
    echo "[WARN] $ROUTE_PATH: Both tenants returned empty ID lists -- cannot verify isolation"
    echo "       If data exists, the default ID path ($ID_PATH) may not match the response shape."
    echo "       Declare responseIdPath in serviceContract to fix."
    continue
  fi

  # Check for overlap -- any shared IDs indicate a tenancy leak
  OVERLAP=$(comm -12 <(echo "$IDS_A") <(echo "$IDS_B"))

  if [ -n "$OVERLAP" ]; then
    OVERLAP_COUNT=$(echo "$OVERLAP" | wc -l)
    echo "[X] FAIL: Tenancy leak on $ROUTE_PATH -- $OVERLAP_COUNT shared IDs between tenants"
    FAILURES=$((FAILURES + 1))
  else
    echo "[OK] Tenant isolation verified: $ROUTE_PATH (no shared IDs)"
  fi
done <<< "$TENANT_SCOPED"

if [ $FAILURES -gt 0 ]; then
  echo "[X] TENANCY ISOLATION QA FAILED: $FAILURES endpoints leaked data"
  exit 1
fi

echo "[OK] Tenancy isolation enforced"
exit 0
