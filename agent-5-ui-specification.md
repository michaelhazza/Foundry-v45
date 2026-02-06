# Agent 5: UI/UX Specification

## Version Reference
- **This Document**: agent-5-ui-specification.md v64
- **Linked Documents**:
 - agent-0-constitution.md
 - agent-1-product-definition.md
 - agent-4-api-contract.md

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 64 | 2026-02 | BLOCKER FIXES: Added CRITICAL RECURRING DEFECT warning for three common violations. Fixed example JSON (AcceptInvitePage now correctly shows required:false for deferred scope). Strengthened Rule 2 (dependsOn is MUST, not implicit). Strengthened Rule 4 (deferred pages MUST have required:false on ALL calls). Added inline checkpoint requirement. Updated Scan 2 and Scan 3 with explicit defect language. |
| 63 | 2026-02 | Governance reform: Replaced version-pinned dependencies with file-linked references per Constitution v7.0 Section Y. No structural changes. |
| 62 | 2026-02 | Added rule 6: capability UI coverage (every manage-* capability must have a UI surface). Added rule 7: tenant container UI rule (reads tenantContainer.uiStrategy from scope-manifest). Added Scan 7: capability and tenant container coverage. |
| 61 | 2026-02 | SECTION 5: DEPENDENCY DISCIPLINE RULES (5 rules). Extended schema with optional fields (queryParams, dependsOn, notes). Strengthened deferred page semantics: deferred pages must not mark API calls as required. Added SECTION 6: PRE-OUTPUT SELF-VERIFICATION (6 scans). Added MANDATORY OUTPUT FORMAT and FILE DELIVERY REQUIREMENT. |
| 60 | 2026-02 | Dependency pin: Agent 4 v63 -> v64. |
| 59 | 2026-02 | Dependency pin: Agent 4 v62 -> v63. |
| 58 | 2026-02 | Dependency pin: Agent 4 v61 -> v62 (tenant-scoping middleware, convention enforcement). |
| 57 | 2026-02 | Dependency pin: Agent 4 v60 -> v61. No structural changes. |
| 56 | 2026-02 | Dependency pins: Constitution v6.1 -> v6.2 (file delivery requirement), Agent 4 v59 -> v60 (inline checkpoint, file delivery). |
| 55 | 2026-02 | Dependency pin: Agent 4 v58 -> v59. No structural changes. |
| 54 | 2026-02 | Dependency pin: Agent 4 v57 -> v58. No structural changes. |
| 53 | 2026-02 | Dependency pin: Agent 4 v56 -> v57. No structural changes. |
| 52 | 2026-02 | Dependency pin: Agent 4 v55 -> v56. No structural changes. |
| 51 | 2026-02 | Dependency pin: Agent 4 v54 -> v55. No structural changes. |
| 50 | 2026-02 | Dependency pin: Agent 4 v53 -> v54. No structural changes. |
| 49 | 2026-02 | Dependency pin: Agent 4 v52 -> v53. No structural changes. |
| 48 | 2026-02 | Dependency pin: Agent 4 v51 -> v52. No structural changes. |
| 47 | 2026-02 | Dependency pin: Agent 4 v50 -> v51. No structural changes. |
| 46 | 2026-02 | Dependency pins: Agent 1 v30 -> v31, Agent 4 v49 -> v50. No structural changes. |
| 45 | 2026-02 | Dependency pins: Agent 1 v29 -> v30, Agent 4 v48 -> v49. No structural changes. |
| 44 | 2026-02 | Updated to Agent 1 v29. Agent 5 now additionally reads performanceIntent (avoid real-time UI patterns when noRealTimeGuarantees is true). |
| 43 | 2026-02 | Updated to Agent 1 v28 (scope-manifest v5). Agent 5 now additionally reads productIntent (UX complexity calibration), supportedUseCases (workflow prioritisation), explicitNonGoals (avoid out-of-scope UI), and platformConstraints.configurationModel (ensure UI-accessible config). |
| 42 | 2026-02 | Updated to Agent 1 v26 (scope-manifest v4). Agent 5 now reads userRoles (UI visibility gating), onboarding.firstRunFlow (page sequence), and entityContracts.states (UI state displays) from scope-manifest.json. |
| 41 | 2026-02 | RESTRUCTURE: Dropped 05-UI-SPECIFICATION.md and routes-pages-manifest.json (Constitution Section AL). Single output: ui-api-deps.json with merged routing data. Schema v2 with totalPages and scope field. |
| 40 | 2026-02 | FILE OUTPUT MANIFEST added per Constitution Section AK. |

---

## FILE OUTPUT MANIFEST

**Execution context:** GPT (specification agent). Output to `docs/` only.

| File | Path | Type | Required |
|------|------|------|----------|
| UI-API Dependencies | docs/ui-api-deps.json | Machine artifact | YES |

**IMPORTANT - OUTPUT BOUNDARY:** This agent outputs ONLY the file listed above. The bash script blocks in this document are **specifications for Agent 6 to extract and generate** as `scripts/verify-*.sh` files during the build. This agent MUST NOT create markdown spec files, separate routes-pages files, or script files.

**FILE DELIVERY REQUIREMENT:** Every file listed above MUST be prepared as a downloadable file and presented to the user for download. Do NOT output file contents as inline code blocks in the chat - always create the actual file and offer it for download. If the platform supports file creation (e.g., ChatGPT file output, Claude artifacts), use that mechanism. The user should receive a clickable download link, not a code block they have to manually copy into a file.

---

## ROLE

Transform product and API contract requirements into a single ui-api-deps.json that defines every UI page: its file path, route, scope status, authentication requirements, and API call dependencies.

**MANDATORY OUTPUT FORMAT - YOU MUST FOLLOW THIS SEQUENCE:**

1. Generate ui-api-deps.json content (working draft - do NOT deliver yet).
2. Execute ALL 7 scans from SECTION 6: PRE-OUTPUT SELF-VERIFICATION against the working draft.
3. Output the verification summary table showing counts and pass/fail for each scan.
4. If ANY scan fails, fix the defects in the working draft and re-run that scan.
5. ONLY AFTER all 7 scans pass, deliver the final ui-api-deps.json as a downloadable file.

** CRITICAL RECURRING DEFECT - READ BEFORE GENERATING ANY PAGE:**

The following three defects have recurred across multiple audit rounds. They MUST NOT appear in your output:

1. **Deferred pages with `required: true` API calls:** ANY page with `scope: "deferred"` MUST have ALL its API calls set to `required: false`. There are ZERO exceptions. Deferred endpoints don't exist in the MVP backend - marking them required creates false contracts that fail smoke tests. If you need to document which calls would be required when enabled, use the page-level `notes` field.

2. **Missing `dependsOn` for non-route parameters:** ANY API call whose path contains a dynamic parameter (e.g., `:userId`) that is NOT in the page's `routePath` MUST include a `dependsOn` field identifying where that parameter comes from. Example: SettingsPage (`/settings`) calling `PATCH /api/users/:userId` MUST have `"dependsOn": "/api/auth/me"` because userId comes from the auth response, not the URL.

3. **Capability without UI surface:** Every `manage-*` capability in the scope-manifest's `userRoles` MUST have a corresponding UI page (or documented section within a page) that exercises it. If the scope-manifest declares `manage-organisation` but no page includes organisation GET/PATCH endpoints, it is a defect. For capabilities served by a section within another page (e.g., Settings), include a `notes` field documenting the mapping.

Apply the inline checkpoint below to EVERY page before adding it to the output.

**INLINE CHECKPOINT (per page):**
Before adding each page to the pages array, verify:
- [ ] If `scope: "deferred"` -> ALL apiCalls have `required: false`
- [ ] For each apiCall with a path param not in routePath -> `dependsOn` is present
- [ ] If page exercises a `manage-*` capability -> `notes` field documents this (unless obvious from page name)

Failure to comply with these checks has been the most common defect category in this framework's history.

**PRIMARY INPUTS:**
- `docs/scope-manifest.json` (from Agent 1): Read `userRoles` for UI visibility and permission gating, `onboarding.firstRunFlow` for first-run page sequence design, `entityContracts[].states` for UI state displays (badges, filters, status indicators), `deferralDeclarations.*.ui.pages` for deferred page scope, `productIntent` to calibrate UX complexity to target user profile, `supportedUseCases` to prioritise which workflows and page designs matter most, `explicitNonGoals` to avoid building UI for out-of-scope features, `platformConstraints.configurationModel` to ensure all configuration is UI-accessible when approach is "ui-driven", `performanceIntent` (if present) to avoid real-time UI patterns when `noRealTimeGuarantees` is true, `platformConstraints.multiTenancy.tenantContainer` for tenant UI strategy
- `docs/service-contracts.json` (from Agent 4): Read endpoints for API call dependencies per page

---

## SECTION 1: UI-API DEPENDENCIES SCHEMA (v2 - CONSOLIDATED)

**File:** `docs/ui-api-deps.json`

```json
{
 "$schema": "ui-api-deps-v2",
 "totalPages": 18,
 "canonicalPaths": {
 "apiClient": "client/src/lib/api.ts",
 "errorBoundary": "client/src/lib/ErrorBoundary.tsx",
 "appComponent": "client/src/App.tsx"
 },
 "pages": [
 {
 "filePath": "client/src/pages/LoginPage.tsx",
 "routePath": "/login",
 "scope": "required",
 "authenticated": false,
 "apiCalls": [
 {
 "method": "POST",
 "path": "/api/auth/login",
 "required": true,
 "authRequired": false
 }
 ]
 },
 {
 "filePath": "client/src/pages/SettingsPage.tsx",
 "routePath": "/settings",
 "scope": "required",
 "authenticated": true,
 "notes": "manage-organisation capability served here via GET/PATCH /api/organisation. User profile update uses userId from /api/auth/me response.",
 "apiCalls": [
 {
 "method": "GET",
 "path": "/api/auth/me",
 "required": true,
 "authRequired": true
 },
 {
 "method": "PATCH",
 "path": "/api/users/:userId",
 "required": true,
 "authRequired": true,
 "dependsOn": "/api/auth/me"
 },
 {
 "method": "GET",
 "path": "/api/organisation",
 "required": true,
 "authRequired": true
 },
 {
 "method": "PATCH",
 "path": "/api/organisation",
 "required": true,
 "authRequired": true
 }
 ]
 },
 {
 "filePath": "client/src/pages/AcceptInvitePage.tsx",
 "routePath": "/accept-invite/:token",
 "scope": "deferred",
 "authenticated": false,
 "notes": "When invite feature enabled, GET becomes required.",
 "apiCalls": [
 {
 "method": "GET",
 "path": "/api/invitations/:token",
 "required": false,
 "authRequired": false
 }
 ]
 }
 ]
}
```

**NOTE:** The AcceptInvitePage example above demonstrates correct deferred page handling: `scope: "deferred"` with `required: false` on all API calls. The SettingsPage example demonstrates correct `dependsOn` usage and capability documentation via `notes`.

### Mandatory Top-Level Fields

- **$schema** (string): Must be "ui-api-deps-v2"
- **totalPages** (integer): Total count of pages (must equal pages array length)
- **canonicalPaths** (object): Frozen frontend file paths (api client, error boundary, app component)
- **pages** (array): All UI pages with their specifications

### Mandatory Page Fields

- **filePath** (string): Repo-relative path to page component (e.g., "client/src/pages/LoginPage.tsx")
- **routePath** (string): URL route path (e.g., "/login")
- **scope** (string): "required" or "deferred"
- **authenticated** (boolean): Whether page requires authentication
- **apiCalls** (array): API endpoints this page calls
- **notes** (string, optional): Page-level context for implementation agents. MUST be included when: (a) page exercises a capability not obvious from page name, (b) page serves tenant container UI per settingsEmbedded strategy, or (c) deferred page needs to document which calls would be required when enabled.

### Mandatory API Call Fields

- **method** (string): HTTP method
- **path** (string): API endpoint path (must match a path in service-contracts.json)
- **required** (boolean): Whether this call is essential for page functionality. **For deferred-scope pages, this MUST be `false` on ALL calls** - see Rule 4.
- **authRequired** (boolean): Whether the API call requires authentication

### Optional API Call Fields

- **queryParams** (array of strings, optional): Meaningful query parameters the endpoint accepts that affect UI behaviour (e.g., `["datasetType", "status"]`). Include when the endpoint supports filtering, sorting, or pagination parameters that the UI should expose. Omit for endpoints with no meaningful query parameters.
- **dependsOn** (string, optional): Path of another API call on the same page whose response provides a dynamic parameter for this call. **MUST be included** when a path parameter (e.g., `:userId`) is not sourced from the URL route but from another API call's response. Example: `"/api/auth/me"` when userId comes from the auth response. Omit only when all dynamic parameters come from route params.

---

## SECTION 2: CANONICAL UI PATHS (FROZEN)

The canonicalPaths object defines immutable frontend file locations. These prevent the api.ts drift pattern.

```json
{
 "canonicalPaths": {
 "apiClient": "client/src/lib/api.ts",
 "errorBoundary": "client/src/lib/ErrorBoundary.tsx",
 "appComponent": "client/src/App.tsx"
 }
}
```

### Verification Gate (Tightened Detection)

```bash
#!/bin/bash
# scripts/verify-ui-canonical-paths.sh
set -euo pipefail

echo "=== Verifying Canonical UI Paths ==="

if [ ! -f "docs/ui-api-deps.json" ]; then
 echo "[X] FAIL: ui-api-deps.json missing"
 exit 1
fi

FAILURES=0

# Check each canonical path exists
while read -r entry; do
 KEY=$(echo "$entry" | jq -r '.key')
 FILEPATH=$(echo "$entry" | jq -r '.value')

 if [ ! -f "$FILEPATH" ]; then
 echo "[X] FAIL: Canonical path missing: $KEY = $FILEPATH"
 FAILURES=$((FAILURES + 1))
 else
 echo "[OK] $KEY: $FILEPATH"
 fi
done < <(jq -c '.canonicalPaths | to_entries[]' docs/ui-api-deps.json)

# Check for known drift variants
FORBIDDEN_VARIANTS=(
 "client/src/lib/api-client.ts"
 "client/src/lib/apiClient.ts"
 "client/src/lib/api_client.ts"
 "client/src/lib/axios.ts"
 "client/src/lib/http-client.ts"
 "client/src/lib/httpClient.ts"
)

for variant in "${FORBIDDEN_VARIANTS[@]}"; do
 if [ -f "$variant" ]; then
 echo "[X] FAIL: Drift variant detected: $variant"
 FAILURES=$((FAILURES + 1))
 fi
done

if [ $FAILURES -gt 0 ]; then
 echo "[X] CANONICAL PATH CHECK FAILED: $FAILURES issues"
 exit 1
fi

echo "[OK] All canonical UI paths verified"
exit 0
```

---

## SECTION 3: SELF-CONSISTENCY VERIFICATION

```bash
#!/bin/bash
# scripts/verify-ui-self-consistency.sh
set -euo pipefail

echo "=== Verifying UI-API-Deps Self-Consistency ==="

if [ ! -f "docs/ui-api-deps.json" ]; then
 echo "[X] FAIL: ui-api-deps.json missing"
 exit 1
fi

jq empty docs/ui-api-deps.json || { echo "[X] FAIL: Invalid JSON"; exit 1; }

FAILURES=0

# totalPages must equal pages array length
TOTAL=$(jq -r '.totalPages' docs/ui-api-deps.json)
ACTUAL=$(jq -r '.pages | length' docs/ui-api-deps.json)

if [ "$TOTAL" != "$ACTUAL" ]; then
 echo "[X] FAIL: totalPages=$TOTAL but pages.length=$ACTUAL"
 FAILURES=$((FAILURES + 1))
fi

# Every page must have valid scope
while read -r page; do
 FILE_PATH=$(echo "$page" | jq -r '.filePath')
 SCOPE=$(echo "$page" | jq -r '.scope')

 if [ "$SCOPE" != "required" ] && [ "$SCOPE" != "deferred" ]; then
 echo "[X] FAIL: $FILE_PATH has invalid scope: $SCOPE"
 FAILURES=$((FAILURES + 1))
 fi
done < <(jq -c '.pages[]' docs/ui-api-deps.json)

# Deferred pages must have all API calls with required: false
while read -r page; do
 FILE_PATH=$(echo "$page" | jq -r '.filePath')
 REQUIRED_TRUE_COUNT=$(echo "$page" | jq '[.apiCalls[] | select(.required == true)] | length')

 if [ "$REQUIRED_TRUE_COUNT" -gt 0 ]; then
 echo "[X] FAIL: Deferred page $FILE_PATH has $REQUIRED_TRUE_COUNT API calls with required:true (must be 0)"
 FAILURES=$((FAILURES + 1))
 fi
done < <(jq -c '.pages[] | select(.scope == "deferred")' docs/ui-api-deps.json)

if [ $FAILURES -gt 0 ]; then
 echo "[X] SELF-CONSISTENCY FAILED: $FAILURES issues"
 exit 1
fi

echo "[OK] UI-API dependencies self-consistent"
exit 0
```

---

## SECTION 4: DEFERRED PAGES VERIFICATION

```bash
#!/bin/bash
# scripts/verify-no-deferred-pages.sh
set -euo pipefail

echo "=== Verifying No Deferred Pages Exist ==="

if [ ! -f "docs/ui-api-deps.json" ]; then
 echo "[X] FAIL: ui-api-deps.json missing"
 exit 1
fi

VIOLATIONS=0

while read -r page; do
 ROUTE_PATH=$(echo "$page" | jq -r '.routePath')
 PAGE_FILE=$(echo "$page" | jq -r '.filePath')

 if [ -f "$PAGE_FILE" ]; then
 echo "[X] FAIL: Deferred page exists: $PAGE_FILE"
 VIOLATIONS=$((VIOLATIONS + 1))
 fi

 if grep -q "$ROUTE_PATH" client/src/App.tsx 2>/dev/null; then
 echo "[X] FAIL: Deferred route in App.tsx: $ROUTE_PATH"
 VIOLATIONS=$((VIOLATIONS + 1))
 fi
done < <(jq -c '.pages[] | select(.scope == "deferred")' docs/ui-api-deps.json)

if [ $VIOLATIONS -gt 0 ]; then
 echo "[X] DEFERRALS INCOMPLETE: $VIOLATIONS violations found"
 exit 1
fi

echo "[OK] No deferred pages exist (correctly omitted)"
exit 0
```

---

## SECTION 5: DEPENDENCY DISCIPLINE RULES

These rules prevent common UI-API misalignment defects that cause runtime 404s, "page loads but nothing happens" bugs, and specification drift between Agent 4 and Agent 5 outputs.

**1. Route-API scope alignment rule:** When a page's `routePath` contains a scoping parameter (e.g., `:projectId`, `:organisationId`), every `required: true` API call on that page must either: (a) include the same scoping parameter in its path (e.g., `/api/projects/:projectId/data-sources`), or (b) have a page-level `notes` field explaining why the API call is intentionally broader than the page scope (e.g., "Lists all org-wide sources; UI filters client-side by project context"). A project-scoped page route calling an org-wide API endpoint without explanation creates a silent data leak where the page displays more data than its URL context implies.

**2. Parameter sourcing rule (MUST - not optional):** When an API call's `path` contains a dynamic parameter (e.g., `:userId`, `:schemaId`) that is NOT present in the page's `routePath`, the API call MUST include a `dependsOn` field identifying which other API call on the same page provides that parameter. There are ZERO exceptions. This creates a traceable dependency chain so implementation agents know where to source dynamic values rather than hardcoding them or using stale route params.

**Example violation:** SettingsPage (`routePath: "/settings"`) has `PATCH /api/users/:userId` without `dependsOn`. This is a defect.

**Example compliance:** SettingsPage has `PATCH /api/users/:userId` with `"dependsOn": "/api/auth/me"` because userId comes from the auth response.

**3. Query parameter documentation rule:** When a service-contracts.json endpoint declares meaningful query parameters (e.g., filtering by type, status, date range, or pagination params), and the UI page is expected to expose those filters, the API call entry SHOULD include a `queryParams` array listing the parameters the UI will use. This prevents implementation agents from missing filter/sort/pagination capabilities that the backend supports. Omit `queryParams` only when the endpoint has no meaningful query parameters or the UI intentionally ignores them.

**4. Deferred scope required-call rule (MUST - hard constraint):** On pages with `scope: "deferred"`, ALL API calls MUST have `required: false`. There are ZERO exceptions. Deferred pages reference endpoints that are excluded from route registration in the MVP backend (per Agent 4's `deferredRouteHandling: "excludeFromRegistration"`). Marking deferred API calls as `required: true` creates a false contract - any smoke test or runtime check that navigates to the page will encounter 404s for endpoints that don't exist yet.

**Example violation:** AcceptInvitePage with `scope: "deferred"` and an API call with `required: true`. This is a defect.

**Example compliance:** AcceptInvitePage with `scope: "deferred"` and ALL API calls having `required: false`, with a page-level `notes` field explaining "When invite feature enabled, GET becomes required."

**5. Cross-document endpoint coverage rule:** Every API `path` referenced in ui-api-deps.json MUST exist in service-contracts.json (either as a required or deferred endpoint). A UI dependency referencing an endpoint not present in the service contracts creates an unresolvable contract - Agent 6 cannot implement a route that was never specified. **Before finalizing:** extract all unique API paths from ui-api-deps.json and verify each one appears in service-contracts.json. Any orphaned path is a defect. This check is bidirectional: also flag any required endpoint in service-contracts.json that is user-facing (not internal/webhook) but has no UI page referencing it - this may indicate a missing page.

**6. Capability UI coverage rule (MUST - hard constraint):** Every `manage-*` capability declared in `userRoles` in the scope manifest MUST have at least one UI page (or a section within a page) that exercises it. Extract all `manage-*` capabilities, then verify each one maps to at least one page in ui-api-deps.json that includes API calls enabling that capability. If a capability has no corresponding UI surface, it is either a missing page or the capability declaration in the scope manifest is aspirational rather than implemented - either way, flag it.

**For capabilities served by a section within another page** (e.g., "manage-organisation" served by SettingsPage), the page MUST include a `notes` field documenting the mapping. Example: `"notes": "manage-organisation capability served here via GET/PATCH /api/organisation"`.

**Example violation:** Scope-manifest declares `manage-organisation` capability, but SettingsPage only includes `/api/auth/me` and `/api/users/:userId` - no organisation endpoints. This is a defect.

**Example compliance:** SettingsPage includes `GET /api/organisation` and `PATCH /api/organisation` with a `notes` field documenting the capability mapping.

**7. Tenant container UI rule:** Read `platformConstraints.multiTenancy.tenantContainer` from the scope manifest. Based on `uiStrategy`, enforce minimum UI requirements:
- `"none"`: No UI surface required for the tenant container entity.
- `"settingsEmbedded"`: The Settings page (or equivalent) MUST include API calls for the tenant entity (at minimum GET and PATCH). The page MUST include a `notes` field documenting that tenant management is embedded here.
- `"dedicatedPage"`: A standalone page must exist in ui-api-deps.json for the tenant entity with full CRUD API calls.
If the required minimum UI surface is missing for the declared strategy, it is a defect. This rule prevents the tenant container from being declared in the scope manifest but silently omitted from the UI specification.

---

## SECTION 6: PRE-OUTPUT SELF-VERIFICATION

Before delivering ui-api-deps.json, execute all scans below against the working draft. Report results in the verification summary table.

### Scan 1: Route-API scope alignment (Rule 1)
1. For each page with a scoping parameter in `routePath` (e.g., `:projectId`), check every `required: true` API call.
2. If the API call path does not contain the same scoping parameter, verify a `notes` field explains the intentional mismatch.
3. **Report:** "X scoped pages verified, all API calls aligned or explained."

### Scan 2: Parameter sourcing completeness (Rule 2) - DEFECT IF MISSING
1. For each API call, extract dynamic parameters from `path` (e.g., `:userId`, `:schemaId`).
2. Check if each parameter exists in the page's `routePath`.
3. If the parameter is NOT in the routePath and `dependsOn` is missing, **this is a DEFECT**.
4. **Report:** "X API calls with non-route params verified, all have dependsOn." OR "DEFECT: X API calls missing dependsOn for non-route params."

### Scan 3: Deferred scope required-call check (Rule 4) - DEFECT IF VIOLATED
1. For each page with `scope: "deferred"`, check all API calls.
2. If ANY call has `required: true`, **this is a DEFECT**.
3. **Report:** "X deferred pages verified, zero required API calls." OR "DEFECT: X deferred pages have required:true API calls."

### Scan 4: Cross-document endpoint coverage (Rule 5)
1. Extract all unique API paths from ui-api-deps.json.
2. Cross-reference against service-contracts.json endpoints.
3. Flag any path not found in service-contracts.json.
4. **Report:** "X unique API paths verified, all present in service-contracts.json."

### Scan 5: Self-consistency (existing)
1. Verify `totalPages` equals `pages` array length.
2. Verify all pages have valid `scope` values.
3. **Report:** "totalPages matches, all scopes valid."

### Scan 6: Deferred pages not in build (existing)
1. Verify deferred pages are not registered in App.tsx or present as files.
2. **Report:** "X deferred pages verified, none in build."

### Scan 7: Capability and tenant container coverage (Rules 6 + 7) - DEFECT IF MISSING
1. Extract all `manage-*` capabilities from scope-manifest.json `userRoles`.
2. For each capability, verify at least one page in ui-api-deps.json includes API calls that exercise it. If served by a section within another page, verify a `notes` field documents the mapping.
3. Read `tenantContainer.uiStrategy` from scope-manifest.json.
4. If `settingsEmbedded`: verify Settings page includes tenant entity API calls and has a notes field.
5. If `dedicatedPage`: verify a standalone tenant entity page exists.
6. **Report:** "X capabilities verified, all have UI surfaces. Tenant container: [strategy], UI present." OR "DEFECT: X capabilities missing UI surface."

### Required verification output format

Produce this table in your response BEFORE delivering ui-api-deps.json:

```
| Scan | Rule(s) | Result | Count |
|------|---------|--------|-------|
| Route-API scope alignment | 1 | PASS/FAIL | X scoped pages |
| Parameter sourcing | 2 | PASS/FAIL | X non-route params, all have dependsOn |
| Deferred required-call | 4 | PASS/FAIL | X deferred pages, zero required calls |
| Endpoint coverage | 5 | PASS/FAIL | X unique paths |
| Self-consistency | - | PASS/FAIL | totalPages matches |
| Deferred build check | - | PASS/FAIL | X deferred pages |
| Capability + tenant coverage | 6 + 7 | PASS/FAIL | X capabilities, tenant: [strategy] |
```

**The verification summary table is a REQUIRED part of your response.** If the user receives ui-api-deps.json without seeing the verification table above it, the output is incomplete and must be rejected.

---

## VERIFICATION COMMANDS

```bash
bash scripts/verify-ui-canonical-paths.sh
bash scripts/verify-ui-api-alignment.sh
bash scripts/verify-ui-self-consistency.sh
bash scripts/verify-no-deferred-pages.sh
```

---

## DOWNSTREAM HANDOFF

**To Agent 6 (Implementation):**
- Run all 4 verification gates (Phase 4, BLOCKING)
- Use pages array for component generation
- Use canonicalPaths for frozen file locations
- Use apiCalls for API integration per page
- Use dependsOn to wire parameter sourcing between API calls

---

## PROMPT HYGIENE GATE

- [OK] Version Reference block present (Section Y compliant)
- [OK] No dependency version pins outside Version Reference and VERSION HISTORY (Section Y compliant)
- [OK] Single output: ui-api-deps.json only (Section AL compliant)
- [OK] routes-pages-manifest data merged into ui-api-deps.json
- [OK] Schema version updated to v2
- [OK] Deferred pages read from ui-api-deps.json scope field (not scope-manifest)
- [OK] Canonical paths defined in JSON (not hardcoded in gate scripts)
- [OK] All gates use set -euo pipefail and process substitution
- [OK] Route-API scope alignment: scoped pages' required API calls match route scope or have notes
- [OK] Parameter sourcing: non-route dynamic params MUST have dependsOn field
- [OK] Deferred required-call: deferred pages MUST have required:false on ALL API calls
- [OK] Cross-document endpoint coverage: all UI API paths exist in service-contracts.json
- [OK] Capability UI coverage: every manage-* capability MUST have a UI surface with documented mapping
- [OK] Tenant container UI: minimum UI surface matches declared uiStrategy
- [OK] Mandatory output format: verification summary table produced before ui-api-deps.json delivery
- [OK] File delivery: output prepared as downloadable file, not inline code block
- [OK] CRITICAL RECURRING DEFECT warning present with three common violations
- [OK] Inline checkpoint requirement for per-page verification
- [OK] Example JSON demonstrates correct patterns (deferred with required:false, dependsOn usage, notes for capability)

**Validation Date:** 2026-02-05
**Status:** Production Ready
