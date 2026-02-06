# Agent 7: QA & Deployment

## Version Reference
- **This Document**: agent-7-qa-deployment.md v88
- **Linked Documents**:
 - agent-0-constitution.md
 - agent-1-product-definition.md
 - agent-4-api-contract.md
 - agent-6-implementation-orchestrator.md

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 88 | 2026-02 | Tenancy isolation robustness: upgraded empty-list condition from [INFO] to [WARN] with explanation that default ID path may not match response shape. Prompts declaring responseIdPath in serviceContract as the fix. Prevents silent false passes when fallback .data[].id does not match actual response structure. |
| 87 | 2026-02 | Hygiene gate wording fix: self-check line updated from "token path read from serviceContract" to "token path read from endpoint level (serviceContract fallback)" to match v86 schema alignment and prevent GPT regression on future runs. |
| 86 | 2026-02 | Schema alignment with Agent 4 v74: (1) responseTokenPath reads endpoint-level first with serviceContract fallback (2 occurrences: qa-acquire-tokens, qa-tenancy-isolation). (2) Protected endpoint detection uses endpoint-level authentication field instead of serviceContract.public. (3) allowedMimeTypes reads endpoint-level first with serviceContract fallback (2 occurrences: MIME count check and MIME select). (4) Added service-contracts.json Field Locations reference table to prevent future drift. |
| 85 | 2026-02 | Added QA Test Fixture Management section. Includes fixture creation strategy in qa-acquire-tokens.sh, parameterized endpoint resolution patterns, skip-vs-test decision framework, and export conventions (QA_PROJECT_ID, QA_USER_ID). Enables testing of parameterized endpoints (/api/projects/:projectId) without hardcoded IDs. |
| 84 | 2026-02 | Added Pre-Deployment Security Audit section. Includes mandatory npm audit gate, vulnerability remediation protocols, deployment blocking rules, continuous monitoring procedures, and integration with build pipeline. Prevents deployment of applications with known security vulnerabilities. |
| 82 | 2026-02 | MAJOR REFACTOR: Aligned with Agent 6 splittable reference pattern. Agent 7 now outputs 2 files (docs/qa-scripts-reference.md + docs/qa-splitter.sh) instead of 12 individual scripts. All scripts embedded in single reference file with #===== FILE: path =====# markers. Added qa-splitter.sh to extract individual scripts. Added SCOPE BOUNDARY, SPLITTABLE FORMAT SPECIFICATION, QA SPLITTER UTILITY, MANDATORY SCRIPTS LIST, and BUILD EXECUTION ORDER sections. Added split-first guard to run-all-qa-tests.sh. |
| 81 | 2026-02 | Bug fixes and QA hardening: (1) Fixed CRUD smoke token selection -- else branch now uses USER_TOKEN instead of ADMIN_TOKEN, restoring user-role endpoint coverage. (2) Fixed unauthenticated access failure message to say "expected 401/403" matching actual acceptance logic. (3) Strengthened CORS preflight test -- now validates OPTIONS returns 2xx status and warns if Access-Control-Allow-Methods does not include GET. |
| 80 | 2026-02 | Comprehensive QA expansion phase 2: (1) Added unauthenticated access test -- sends tokenless requests to all non-public endpoints, expects 401. (2) Added input validation test -- sends malformed payloads to create/update endpoints, expects 400 not 500. (3) Added response format consistency test -- verifies all required endpoints return valid JSON. (4) Added CORS preflight test -- sends OPTIONS requests and verifies Access-Control headers. Suite now 12 scripts covering infrastructure, business surface, data integrity, security, response quality, and CORS. |
| 79 | 2026-02 | Comprehensive QA expansion: (1) Added CRUD smoke script -- tests create/list/getById/update/delete for all required endpoints with declared crudOperation, validates status codes against contract. (2) Added tenancy isolation runtime script -- verifies cross-tenant access returns 403/404 when multiTenancy declared in scope-manifest.json. (3) Updated runner, manifest, prerequisites, and linked documents. Added scope-manifest.json as optional prerequisite for tenancy tests. |
| 78 | 2026-02 | Bug fixes: (1) Upload curl now uses -X "$METHOD" (was defaulting to POST). (2) PROFILE_GET piped through head -1 (guards multi-line). |
| 77 | 2026-02 | Minor: Added head -1 to LOGIN_ENDPOINT jq pipe (guards against multiple login endpoints). |
| 76 | 2026-02 | Application-agnostic audit: (1) Health endpoint selected by purpose not path substring. (2) QA credentials from env vars with defaults. (3) Response shape assumptions removed -- token path and user ID path read from serviceContract or use framework defaults. (4) Health check validates HTTP 200 + valid JSON only, no hardcoded response structure. (5) Upload MIME guard for missing allowedMimeTypes, prefers supported type from list. (6) RBAC test sends empty JSON body for write methods. (7) Build proof prerequisite asserts not-template. |
| 75 | 2026-02 | Governance reform: Replaced version-pinned dependencies with file-linked references per Constitution v7.0 Section Y. No structural changes. |
| 55 | 2026-02 | Parameterised server port across all QA scripts (PORT env, default 5000). BASE_URL resolved once in token acquisition and exported. Fixed hygiene gate wording. |
| 54 | 2026-02 | RESTRUCTURE: Updated for consolidated artifacts. Removed references to route-service-contracts.json (merged into service-contracts.json). Removed Agent 1 dependency (scope data now in service-contracts.json status field). |
| 53 | 2026-02 | FILE OUTPUT MANIFEST added per Constitution Section AK. |

---

## ROLE

Generate QA scripts reference and splitter utility. The suite covers six areas: infrastructure (health, auth), business surface (CRUD operations), data integrity (tenancy isolation), security (RBAC, unauthenticated access, input validation), response quality (JSON format consistency), and web integration (CORS preflight). All endpoint data is read from service-contracts.json and scope-manifest.json. All scripts resolve the server base URL from environment variables with a sensible default.

---

## SCOPE BOUNDARY (CRITICAL)

**Agent 7 produces DOCUMENTATION only. Agent 7 does NOT create individual script files.**

| Agent 7 DOES | Agent 7 does NOT |
|--------------|------------------|
| Generate `docs/qa-scripts-reference.md` (all scripts in one file) | Write individual script files |
| Generate `docs/qa-splitter.sh` (extraction utility) | Write server code |
| Read specification artifacts from `docs/` | Write client code |

**Downstream execution:** After Agent 7 outputs are complete, **Claude Code** runs `qa-splitter.sh` to extract individual scripts, then executes the QA suite.

**If you find yourself creating files in `scripts/`: STOP. You are out of scope.**

---

## FILE OUTPUT MANIFEST (2 FILES TOTAL)

**Agent 7 generates these files. Claude Code extracts scripts and runs QA.**

| File | Path | Type | Purpose |
|------|------|------|---------|
| QA Scripts Reference | docs/qa-scripts-reference.md | Documentation + Scripts | Single source of truth -- contains ALL 12 QA scripts with split markers |
| QA Splitter | docs/qa-splitter.sh | Utility | Extracts individual scripts from reference file |

**Note:** Individual script files (`scripts/qa-*.sh`, `scripts/run-all-qa-tests.sh`) are NOT created by Agent 7. They are extracted by `qa-splitter.sh` when Claude Code runs it.

**INPUT:** This agent reads:
- docs/build-gate-results.json (build proof -- must be populated, not template)
- docs/service-contracts.json (endpoint source of truth)
- docs/scope-manifest.json (optional -- enables tenancy isolation tests)

### service-contracts.json Field Locations (Agent 4 Schema)

These fields live at **endpoint level** (not nested in serviceContract):

| Field | Location | Used by |
|-------|----------|---------|
| `authentication` | `.endpoints[].authentication` | qa-unauthenticated-access (protected endpoint detection) |
| `responseTokenPath` | `.endpoints[].responseTokenPath` | qa-acquire-tokens, qa-tenancy-isolation (token extraction) |
| `allowedMimeTypes` | `.endpoints[].allowedMimeTypes` | qa-file-upload-mime (MIME type validation) |
| `maxSizeMb` | `.endpoints[].maxSizeMb` | qa-file-upload-mime (size limit checks) |

When reading these fields in jq, always check endpoint level first with serviceContract fallback:
`(.responseTokenPath // .serviceContract.responseTokenPath // "<default>")`

---

## SPLITTABLE FORMAT SPECIFICATION

The `qa-scripts-reference.md` file uses the same delimiters as Agent 6's `gate-scripts-reference.md`:

### File Structure

```markdown
# QA Scripts Reference

> Generated by Agent 7. Run `bash docs/qa-splitter.sh` to extract individual scripts.

**Total Scripts:** 12
**Split Command:** `bash docs/qa-splitter.sh`

---

#===== FILE: scripts/qa-acquire-tokens.sh =====#
#!/bin/bash
# scripts/qa-acquire-tokens.sh
set -euo pipefail
...script content...
#===== END FILE =====#

#===== FILE: scripts/run-all-qa-tests.sh =====#
#!/bin/bash
# scripts/run-all-qa-tests.sh
set -euo pipefail
...script content...
#===== END FILE =====#

... [repeat for all 12 scripts]
```

### Delimiter Rules

| Delimiter | Purpose | Format |
|-----------|---------|--------|
| `#===== FILE: {path} =====#` | Start of script | Path is relative to repo root |
| `#===== END FILE =====#` | End of script | Must match a preceding FILE marker |

**CRITICAL:** Delimiters MUST be on their own line with no leading whitespace. The `#` at the start ensures they are valid bash comments if accidentally executed.

### Content Rules (STRICT)

The `qa-scripts-reference.md` file MUST contain ONLY:

1. **Header section** -- title, generation metadata, total script count, split command
2. **FILE blocks** -- one per script, using the `#===== FILE: path =====#` / `#===== END FILE =====#` delimiters

**MUST NOT contain:**
- Headings with standalone code blocks outside FILE blocks
- Any bash code that is not inside a FILE block
- Commentary or documentation between FILE blocks (use comments inside the scripts instead)

**Each script path MUST appear exactly once.** If `qa-splitter.sh` encounters the same FILE path twice, it MUST fail immediately.

---

## QA SPLITTER UTILITY

Agent 7 MUST generate `docs/qa-splitter.sh` with this exact content:

```bash
#!/bin/bash
# docs/qa-splitter.sh
# Extracts individual QA scripts from qa-scripts-reference.md
# Run this BEFORE executing QA tests
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REFERENCE_FILE="$SCRIPT_DIR/qa-scripts-reference.md"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$REFERENCE_FILE" ]]; then
  echo "[X] ERROR: qa-scripts-reference.md not found"
  exit 1
fi

mkdir -p "$PROJECT_ROOT/scripts"

echo "=== Extracting QA scripts from qa-scripts-reference.md ==="

current_file=""
line_count=0
file_count=0
declare -A seen_files

while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ "$line" =~ ^#=====\ FILE:\ (.+)\ =====# ]]; then
    current_file="${BASH_REMATCH[1]}"
    
    # Fail-fast on duplicate FILE paths
    if [[ -n "${seen_files[$current_file]+x}" ]]; then
      echo ""
      echo "[X] FATAL: Duplicate FILE block detected: $current_file"
      echo "    First seen at extraction #${seen_files[$current_file]}"
      echo "    qa-scripts-reference.md must contain exactly one block per script."
      exit 1
    fi
    
    mkdir -p "$(dirname "$PROJECT_ROOT/$current_file")"
    > "$PROJECT_ROOT/$current_file"
    line_count=0
    file_count=$((file_count + 1))
    seen_files[$current_file]=$file_count
    echo "  Creating: $current_file"
  elif [[ "$line" =~ ^#=====\ END\ FILE\ =====# ]]; then
    if [[ -n "$current_file" ]]; then
      chmod +x "$PROJECT_ROOT/$current_file"
    fi
    current_file=""
  elif [[ -n "$current_file" ]]; then
    echo "$line" >> "$PROJECT_ROOT/$current_file"
    line_count=$((line_count + 1))
  fi
done < "$REFERENCE_FILE"

echo ""
echo "=== Extraction Complete ==="
echo "Created $file_count scripts in $PROJECT_ROOT/scripts/"

# Verify expected count
EXPECTED_SCRIPTS=12
if [[ $file_count -lt $EXPECTED_SCRIPTS ]]; then
  echo "[X] Expected $EXPECTED_SCRIPTS scripts, created $file_count"
  exit 1
fi

# Post-split verification
echo ""
echo "=== Post-Split Verification ==="
VERIFY_FAILURES=0

for script in "$PROJECT_ROOT"/scripts/qa-*.sh "$PROJECT_ROOT"/scripts/run-all-qa-tests.sh; do
  [[ ! -f "$script" ]] && continue
  script_name=$(basename "$script")
  
  # Check shebang
  first_line=$(head -1 "$script")
  if [[ "$first_line" != "#!/bin/bash" ]]; then
    echo "  [X] $script_name: Missing or incorrect shebang (got: $first_line)"
    VERIFY_FAILURES=$((VERIFY_FAILURES + 1))
    continue
  fi
  
  # Check syntax (bash -n parses without executing)
  if ! bash -n "$script" 2>/dev/null; then
    echo "  [X] $script_name: Syntax error detected"
    VERIFY_FAILURES=$((VERIFY_FAILURES + 1))
    continue
  fi
  
  # Check executable
  if [[ ! -x "$script" ]]; then
    echo "  [X] $script_name: Not executable"
    VERIFY_FAILURES=$((VERIFY_FAILURES + 1))
    continue
  fi
  
  echo "  [OK] $script_name"
done

if [[ $VERIFY_FAILURES -gt 0 ]]; then
  echo ""
  echo "[X] Post-split verification failed: $VERIFY_FAILURES scripts have issues"
  exit 1
fi

echo ""
echo "[OK] All $file_count QA scripts extracted and verified"
exit 0
```

---

---

## QA TEST FIXTURE MANAGEMENT

QA scripts that test parameterized endpoints (e.g., `/api/projects/:projectId/data-sources`) require test entities to populate those parameters. Agent 7 handles this through fixture creation in the token acquisition phase.

### Fixture Creation Strategy

The `qa-acquire-tokens.sh` script creates minimal test fixtures and exports their IDs for use in subsequent QA tests.

**Pattern:**
```bash
# qa-acquire-tokens.sh (expanded)

# ... existing token acquisition ...

# Create test project for parameterized endpoint testing
if [ -n "$ACCESS_TOKEN" ]; then
  echo "Creating test fixtures..."
  
  PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name": "QA Test Project", "description": "Automated test fixture"}')
  
  export QA_PROJECT_ID=$(echo "$PROJECT_RESPONSE" | jq -r '.id // empty')
  
  if [ -z "$QA_PROJECT_ID" ]; then
    echo "[WARN] Could not create test project - parameterized tests will be skipped"
  else
    echo "[OK] Test project created: $QA_PROJECT_ID"
  fi
fi
```

### Parameterized Endpoint Resolution

QA scripts that test parameterized endpoints use exported fixture IDs to resolve paths:

```bash
# qa-file-upload-mime.sh or similar

# Check if fixture is available
if [ -z "$QA_PROJECT_ID" ]; then
  echo "[SKIP] No test project available - skipping parameterized upload tests"
  exit 0
fi

# Resolve parameterized path
ENDPOINT_PATH="/api/projects/:projectId/data-sources/upload"
RESOLVED_PATH=$(echo "$ENDPOINT_PATH" | sed "s/:projectId/$QA_PROJECT_ID/g")

# Test the endpoint
curl -X POST "$BASE_URL$RESOLVED_PATH" ...
```

### Skip vs Test Decision Framework

Each QA script that encounters parameterized endpoints must explicitly choose:

**Option 1: Create fixtures and test**
- Use exported fixture IDs (QA_PROJECT_ID, QA_USER_ID, etc.)
- Resolve parameterized paths with `sed` replacement
- Test the resolved endpoints normally

**Option 2: Skip parameterized endpoints**
```bash
# Skip parameterized paths
if echo "$ENDPOINT_PATH" | grep -q ':'; then
  echo "[SKIP] $ENDPOINT_PATH (parameterized endpoint - requires test fixtures)"
  continue
fi
```

**Critical Rule:** Silent failures are not acceptable. Every QA script must either test parameterized endpoints or explicitly log that they're being skipped.

### Fixture Export Conventions

The token acquisition script exports these fixture IDs for use across all QA scripts:

| Variable | Description | Usage |
|----------|-------------|-------|
| `QA_PROJECT_ID` | Test project UUID | Resolve `/api/projects/:projectId/*` paths |
| `QA_USER_ID` | Test user UUID (if created) | Resolve `/api/users/:userId` paths |
| `QA_DATASET_ID` | Test dataset UUID (if created) | Resolve dataset-scoped endpoints |

**Usage example:**
```bash
# In any QA script after qa-acquire-tokens.sh
if [ -n "$QA_PROJECT_ID" ]; then
  PATH=$(echo "/api/projects/:projectId/data-sources" | sed "s/:projectId/$QA_PROJECT_ID/")
  curl "$BASE_URL$PATH" ...
fi
```

### Fixture Cleanup

Test fixtures are left in the database for manual inspection. If cleanup is desired, add a `qa-cleanup-fixtures.sh` script that runs as the final QA phase and deletes entities by their known IDs.

---

## MANDATORY SCRIPTS LIST

The following 12 scripts MUST appear in `qa-scripts-reference.md` with `#===== FILE: path =====#` markers.

### Runner (1 script)

| Script | Purpose |
|--------|---------|
| `scripts/run-all-qa-tests.sh` | Master QA runner -- executes all QA scripts in order |

### Token Acquisition (1 script)

| Script | Purpose |
|--------|---------|
| `scripts/qa-acquire-tokens.sh` | Acquires admin + user tokens, exports BASE_URL |

### Infrastructure (2 scripts)

| Script | Purpose |
|--------|---------|
| `scripts/qa-health-check.sh` | Validates health endpoint returns 200 + valid JSON |
| `scripts/qa-auth-endpoints.sh` | Validates currentUser endpoint returns 200 + valid JSON |

### Business Surface (1 script)

| Script | Purpose |
|--------|---------|
| `scripts/qa-crud-smoke.sh` | Tests CRUD operations for all required endpoints with declared crudOperation |

### Response Quality (1 script)

| Script | Purpose |
|--------|---------|
| `scripts/qa-response-format.sh` | Verifies all required GET endpoints return valid JSON, not HTML |

### Optional Features (1 script)

| Script | Purpose |
|--------|---------|
| `scripts/qa-file-upload-mime.sh` | Tests file upload endpoints with declared allowedMimeTypes |

### Security (4 scripts)

| Script | Purpose |
|--------|---------|
| `scripts/qa-unauthenticated-access.sh` | Sends tokenless requests to protected endpoints, expects 401/403 |
| `scripts/qa-role-protection.sh` | Sends user-token requests to admin endpoints, expects 401/403 |
| `scripts/qa-input-validation.sh` | Sends malformed payloads to body-accepting endpoints, expects no 500s |
| `scripts/qa-tenancy-isolation.sh` | Verifies cross-tenant access returns no shared IDs (requires multiTenancy) |

### Web Integration (1 script)

| Script | Purpose |
|--------|---------|
| `scripts/qa-cors-preflight.sh` | Sends OPTIONS with Origin header, checks CORS headers present + 2xx status |

---

## QA PREREQUISITES

**MUST exist before running QA:**
- docs/build-gate-results.json (build proof -- must be populated, not template)
- docs/service-contracts.json (endpoint source of truth)

**Optional (enables tenancy isolation tests):**
- docs/scope-manifest.json (if multiTenancy is declared, tenancy QA runs)

**QA credentials** are read from environment variables. If not set, defaults are used. Set these before running QA if your app seeds different test users:
- `QA_ADMIN_EMAIL` (default: `admin@test.local`)
- `QA_ADMIN_PASSWORD` (default: `AdminPass123!`)
- `QA_USER_EMAIL` (default: `user@test.local`)
- `QA_USER_PASSWORD` (default: `UserPass123!`)

**Tenancy isolation credentials** (only needed if multiTenancy is declared):
- `QA_TENANT_B_EMAIL` (default: `tenant-b@test.local`)
- `QA_TENANT_B_PASSWORD` (default: `TenantBPass123!`)

---

## SCRIPT CONTENTS

The following scripts are embedded in `qa-scripts-reference.md` using FILE markers. Each script is shown here as the canonical source -- Agent 7 wraps each in `#===== FILE: path =====#` / `#===== END FILE =====#` delimiters when generating the output file.

### Token Acquisition

```bash
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
```

### Master QA Runner

```bash
#!/bin/bash
# scripts/run-all-qa-tests.sh
set -euo pipefail

echo "=== Running Complete QA Suite ==="

# Split-first guard - ensure qa-splitter.sh has been run
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXPECTED_QA_SCRIPTS=11

ACTUAL_QA_SCRIPTS=$(ls -1 "$SCRIPT_DIR"/qa-*.sh 2>/dev/null | wc -l)
if [[ $ACTUAL_QA_SCRIPTS -lt $EXPECTED_QA_SCRIPTS ]]; then
  echo "[X] ERROR: Found $ACTUAL_QA_SCRIPTS QA scripts, expected $EXPECTED_QA_SCRIPTS"
  echo ""
  echo "    Scripts have not been extracted. Run this first:"
  echo "    bash docs/qa-splitter.sh"
  echo ""
  exit 1
fi

bash scripts/qa-acquire-tokens.sh || exit 1
source /tmp/qa-tokens.sh

# Infrastructure
bash scripts/qa-health-check.sh
bash scripts/qa-auth-endpoints.sh

# Business surface
bash scripts/qa-crud-smoke.sh

# Response quality
bash scripts/qa-response-format.sh

# Optional features
bash scripts/qa-file-upload-mime.sh

# Security
bash scripts/qa-unauthenticated-access.sh
bash scripts/qa-role-protection.sh
bash scripts/qa-input-validation.sh
bash scripts/qa-tenancy-isolation.sh

# Web integration
bash scripts/qa-cors-preflight.sh

echo "[OK] QA suite complete (12 scripts)"
exit 0
```

### Health Check Validation

```bash
#!/bin/bash
# scripts/qa-health-check.sh
set -euo pipefail

echo "=== QA: Health Check Validation ==="

source /tmp/qa-tokens.sh

# Select by purpose (framework constant), not by path substring
HEALTH_PATH=$(jq -r '.endpoints[] |
  select(.serviceContract.purpose == "healthCheck") |
  .path' docs/service-contracts.json | head -1)

if [ -z "$HEALTH_PATH" ]; then
  echo "[SKIP] No health endpoint defined (purpose=healthCheck)"
  exit 0
fi

RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}${HEALTH_PATH}")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" != "200" ]; then
  echo "[X] FAIL: Health check returned $HTTP_CODE"
  exit 1
fi

# Validate response is valid JSON (structure varies per app)
if ! echo "$BODY" | jq -e '.' >/dev/null 2>&1; then
  echo "[X] FAIL: Health check returned non-JSON response"
  exit 1
fi

echo "[OK] Health check returned 200 with valid JSON"
exit 0
```

### Auth Endpoints Validation

```bash
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
```

### CRUD Smoke Test

```bash
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

  TESTED=$((TESTED + 1))

  case "$CRUD_OP" in
    list)
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

      RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X "$METHOD" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$TEST_PAYLOAD" \
        "${BASE_URL}${ROUTE_PATH}")
      HTTP_CODE=$(echo "$RESPONSE" | tail -1)

      if [ "$HTTP_CODE" != "201" ] && [ "$HTTP_CODE" != "200" ]; then
        echo "[X] FAIL: $CRUD_OP $ROUTE_PATH returned $HTTP_CODE (expected 200/201)"
        FAILURES=$((FAILURES + 1))
      else
        BODY=$(echo "$RESPONSE" | head -n -1)
        # Extract created resource ID if path is declared
        ID_PATH=$(echo "$endpoint_json" | jq -r '.serviceContract.responseIdPath // ".data.id"')
        CREATED_ID=$(echo "$BODY" | jq -r "${ID_PATH} // empty" 2>/dev/null)
        if [ -n "$CREATED_ID" ]; then
          echo "[OK] $CRUD_OP: $METHOD $ROUTE_PATH ($HTTP_CODE, id=$CREATED_ID)"
        else
          echo "[OK] $CRUD_OP: $METHOD $ROUTE_PATH ($HTTP_CODE)"
        fi
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
```

### Response Format Consistency Test

```bash
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
```

### File Upload MIME Validation

```bash
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
```

### Unauthenticated Access Test

```bash
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
```

### Role Protection Validation

```bash
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
```

### Input Validation Test

```bash
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
```

### Tenancy Isolation Test

```bash
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
```

### CORS Preflight Test

```bash
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
```

---

## BUILD EXECUTION ORDER

**Agent 7 completes Steps 1-2 only. Steps 3-6 are executed by Claude Code.**

```
Step 1: Generate docs/qa-scripts-reference.md (Agent 7)
Step 2: Generate docs/qa-splitter.sh (Agent 7)
--- AGENT 7 STOPS HERE ---
Step 3: Claude Code runs: bash docs/qa-splitter.sh (extracts 12 scripts)
Step 4: Claude Code verifies: ls scripts/qa-*.sh scripts/run-all-qa-tests.sh | wc -l (should equal 12)
Step 5: Claude Code starts application server
Step 6: Claude Code executes: bash scripts/run-all-qa-tests.sh
```

**CRITICAL:** Agent 7 produces documentation only. Claude Code extracts scripts and runs QA.

---

## VERIFICATION COMMANDS

```bash
bash docs/qa-splitter.sh
bash scripts/run-all-qa-tests.sh
```

---

## DOWNSTREAM HANDOFF

**To Master Build Prompt:**
- docs/qa-scripts-reference.md contains all QA scripts
- docs/qa-splitter.sh ready to extract

**To Agent 8 (Code Review):**
- QA results inform code review priorities


## Pre-Deployment Security Audit

All applications must pass a security audit before deployment approval. This gate catches vulnerabilities introduced through dependencies.

### Required Security Check

**Command**:
```bash
npm audit --audit-level=moderate
```

**Pass Criteria**: Zero moderate or higher severity vulnerabilities

**Output Format**:
```bash
# Passing output
found 0 vulnerabilities

# Failing output
8 vulnerabilities (5 moderate, 3 high)
```

---

### Audit Failure Protocol

If vulnerabilities are detected:

**Step 1: Automated Remediation**
```bash
# Attempt automatic fix
npm audit fix

# For breaking changes that require manual review
npm audit fix --force

# Verify fix applied
npm audit --audit-level=moderate
```

**Step 2: Manual Resolution** (if auto-fix unavailable)

For each unresolved vulnerability:

1. **Identify Affected Package**:
   ```bash
   npm audit --json | jq '.vulnerabilities'
   ```

2. **Evaluate Options**:
   - Upgrade affected package to patched version
   - Find alternative package without vulnerability
   - Apply workaround if fix unavailable
   - Document accepted risk (last resort, requires approval)

3. **Document Decision**:
   ```markdown
   ## Security Exception: [Package Name]
   
   **Vulnerability**: [CVE ID or description]
   **Severity**: [moderate/high/critical]
   **Affected Versions**: [version range]
   **Mitigation**: [upgrade/workaround/accepted risk]
   **Justification**: [why this approach was chosen]
   **Review Date**: [when to re-evaluate]
   ```

**Step 3: Re-Audit**
```bash
npm audit --audit-level=moderate
```

Repeat until audit passes or all vulnerabilities are documented as accepted risks.

---

### Deployment Blocking Rules

**Must Block Deployment**:
- Any critical severity vulnerabilities
- High severity vulnerabilities without documented mitigation
- Moderate severity vulnerabilities in production dependencies

**May Proceed with Documentation**:
- Low severity vulnerabilities (informational only)
- Moderate vulnerabilities in devDependencies only
- Vulnerabilities with documented workarounds

---

### Continuous Monitoring

**Post-Deployment**:
- Run `npm audit` weekly as part of maintenance schedule
- Subscribe to security advisories for critical dependencies
- Update dependencies quarterly even if no vulnerabilities detected

**Emergency Response**:
If critical vulnerability discovered in production:
1. Assess impact within 24 hours
2. Apply patch within 72 hours
3. Deploy hotfix following expedited QA process
4. Document incident and response in post-mortem

---

### Integration with Build Pipeline

**Agent 6 (Implementation Orchestrator)** must include:
```bash
# After npm install
npm audit --audit-level=moderate
if [ $? -ne 0 ]; then
  echo "Security audit failed. Fix vulnerabilities before proceeding."
  exit 1
fi
```

**Master Build Prompt** should instruct Claude Code:
```markdown
After dependency installation:
1. Run security audit: `npm audit --audit-level=moderate`
2. If failures detected, apply fixes automatically
3. If auto-fix unavailable, document vulnerabilities in deployment notes
4. Re-run audit until passing
```

---

---

## PROMPT HYGIENE GATE

- [OK] Version Reference block present (Section Y compliant)
- [OK] No dependency version pins outside Version Reference and VERSION HISTORY (Section Y compliant)
- [OK] SCOPE BOUNDARY section (Agent 7 does NOT create individual script files)
- [OK] FILE OUTPUT MANIFEST: 2 files (qa-scripts-reference.md + qa-splitter.sh)
- [OK] SPLITTABLE FORMAT SPECIFICATION with delimiter rules and strict content rules
- [OK] QA SPLITTER UTILITY with duplicate detection and post-split verification
- [OK] MANDATORY SCRIPTS LIST (12 scripts as FILE: markers)
- [OK] BUILD EXECUTION ORDER clarifies Agent 7 stops after Step 2
- [OK] Split-first guard in run-all-qa-tests.sh
- [OK] All QA scripts read from service-contracts.json (consolidated)
- [OK] No references to route-service-contracts.json or scope-manifest endpoint lists
- [OK] Server port parameterised: BASE_URL resolved in token acquisition, exported to all scripts
- [OK] All scripts use ROUTE_PATH (not PATH)
- [OK] All scripts use set -euo pipefail
- [OK] Health endpoint selected by purpose ("healthCheck"), not path substring
- [OK] QA credentials from env vars with defaults (QA_ADMIN_EMAIL, etc.)
- [OK] No hardcoded response shapes -- token path read from endpoint level (serviceContract fallback), health/auth validate JSON only
- [OK] Upload MIME: guards missing allowedMimeTypes, prefers supported type from list
- [OK] RBAC test sends empty JSON body for write methods (POST/PUT/PATCH)
- [OK] Build proof prerequisite asserts populated (not template)
- [OK] CRUD smoke: tests all required endpoints with declared crudOperation, validates status codes
- [OK] CRUD smoke: token selection uses USER_TOKEN for non-admin endpoints, ADMIN_TOKEN for admin
- [OK] Tenancy isolation: gracefully skips if no multiTenancy declared or tenant B login fails
- [OK] Unauthenticated access: tests all non-public endpoints with no token, expects 401/403
- [OK] Input validation: sends malformed payloads to body-accepting endpoints, expects no 500s
- [OK] Response format: verifies all required GET endpoints return valid JSON, not HTML
- [OK] CORS preflight: sends OPTIONS with Origin header, checks Access-Control headers present, validates 2xx status, warns if GET missing from Allow-Methods
- [OK] All jq single-value pipes use head -1

**Validation Date:** 2026-02-05
**Status:** Production Ready
