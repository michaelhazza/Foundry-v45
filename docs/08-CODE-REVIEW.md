# 08-CODE-REVIEW.md

**Agent:** 8 — Code Review
**Mode:** Report-Only (AGENT8_AUTO_RUN=false)
**Date:** 2026-02-06
**Build ID:** build-20260206-040804
**Artifacts Audited:** service-contracts.json (v2), data-relationships.json (v2), build-gate-results.json (v1)

---

## SECTION 1: BUILD PROOF VERIFICATION

| Check | Result |
|-------|--------|
| build-gate-results.json exists | PASS |
| Valid JSON | PASS |
| Gate count ≥ 99 | PASS (164 gates) |
| Failed gates = 0 | PASS (0 failed) |

**Status: PASS — Audit may proceed.**

---

## SECTION 2: FINDINGS SUMMARY

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 4 |
| LOW | 0 |
| INFO | 2 |

---

## SECTION 3: ENDPOINT COVERAGE AUDIT

**Required endpoints: 33 | Implemented: 33 | Missing: 0**

All required endpoints have route files, service files, and exported service methods present.

| # | Method | Path | Route File | Service File | Method | Status |
|---|--------|------|-----------|-------------|--------|--------|
| 1 | GET | /health | health.routes.ts | health.service.ts | getHealthStatus | [OK] |
| 2 | POST | /api/auth/register | auth.routes.ts | auth.service.ts | register | [OK] |
| 3 | POST | /api/auth/login | auth.routes.ts | auth.service.ts | login | [OK] |
| 4 | GET | /api/organisation | organisation.routes.ts | organisations.service.ts | getOrganisation | [OK] |
| 5 | PATCH | /api/organisation | organisation.routes.ts | organisations.service.ts | updateOrganisation | [OK] |
| 6 | GET | /api/users | users.routes.ts | users.service.ts | listUsers | [OK] |
| 7 | POST | /api/users | users.routes.ts | users.service.ts | inviteUser | [OK] |
| 8 | GET | /api/users/:userId | users.routes.ts | users.service.ts | getUser | [OK] |
| 9 | PATCH | /api/users/:userId | users.routes.ts | users.service.ts | updateUser | [OK] |
| 10 | DELETE | /api/users/:userId | users.routes.ts | users.service.ts | deleteUser | [OK] |
| 11 | GET | /api/projects | projects.routes.ts | projects.service.ts | listProjects | [OK] |
| 12 | POST | /api/projects | projects.routes.ts | projects.service.ts | createProject | [OK] |
| 13 | GET | /api/projects/:projectId | projects.routes.ts | projects.service.ts | getProject | [OK] |
| 14 | PATCH | /api/projects/:projectId | projects.routes.ts | projects.service.ts | updateProject | [OK] |
| 15 | DELETE | /api/projects/:projectId | projects.routes.ts | projects.service.ts | deleteProject | [OK] |
| 16 | GET | /api/sources | sources.routes.ts | sources.service.ts | listSources | [OK] |
| 17 | POST | /api/sources/upload | sources.routes.ts | sources.service.ts | uploadSource | [OK] |
| 18 | GET | /api/sources/:sourceId | sources.routes.ts | sources.service.ts | getSource | [OK] |
| 19 | DELETE | /api/sources/:sourceId | sources.routes.ts | sources.service.ts | deleteSource | [OK] |
| 20 | GET | /api/projects/:projectId/sources | projectSources.routes.ts | projectSources.service.ts | listProjectSources | [OK] |
| 21 | POST | /api/projects/:projectId/sources | projectSources.routes.ts | projectSources.service.ts | linkSourceToProject | [OK] |
| 22 | GET | /api/projects/:projectId/sources/:projectSourceId | projectSources.routes.ts | projectSources.service.ts | getProjectSource | [OK] |
| 23 | PATCH | /api/projects/:projectId/sources/:projectSourceId | projectSources.routes.ts | projectSources.service.ts | updateProjectSource | [OK] |
| 24 | DELETE | /api/projects/:projectId/sources/:projectSourceId | projectSources.routes.ts | projectSources.service.ts | unlinkSource | [OK] |
| 25 | GET | /api/canonical-schemas | canonicalSchemas.routes.ts | canonicalSchemas.service.ts | listCanonicalSchemas | [OK] |
| 26 | GET | /api/canonical-schemas/:schemaId | canonicalSchemas.routes.ts | canonicalSchemas.service.ts | getCanonicalSchema | [OK] |
| 27 | GET | /api/projects/:projectId/processing-jobs | processingJobs.routes.ts | processingJobs.service.ts | listProcessingJobs | [OK] |
| 28 | POST | /api/projects/:projectId/processing-jobs | processingJobs.routes.ts | processingJobs.service.ts | createProcessingJob | [OK] |
| 29 | GET | /api/projects/:projectId/processing-jobs/:jobId | processingJobs.routes.ts | processingJobs.service.ts | getProcessingJob | [OK] |
| 30 | GET | /api/projects/:projectId/datasets | datasets.routes.ts | datasets.service.ts | listDatasets | [OK] |
| 31 | GET | /api/projects/:projectId/datasets/:datasetId | datasets.routes.ts | datasets.service.ts | getDataset | [OK] |
| 32 | GET | /api/projects/:projectId/datasets/:datasetId/download | datasets.routes.ts | datasets.service.ts | downloadDataset | [OK] |
| 33 | DELETE | /api/projects/:projectId/datasets/:datasetId | datasets.routes.ts | datasets.service.ts | deleteDataset | [OK] |

---

## SECTION 4: SEMANTIC CHECK RESULTS

### Check 1: Password Hashing Consistency — [OK]

| Algorithm | Occurrences | Files |
|-----------|-------------|-------|
| bcrypt | 3 | server/services/auth.service.ts, server/services/users.service.ts |
| argon2 | 0 | — |
| scrypt | 0 | — |

**Result:** Single algorithm (bcrypt). No consistency violation.

### Check 2: Upload Handler Uses req.file — [OK]

**File:** server/routes/sources.routes.ts

- Line 29: Guard clause `if (!req.file)` returns 400
- Line 33: Fallback name from `req.file.originalname`
- Line 37: `req.file` passed to `sourcesService.uploadSource()`
- Multer middleware applied at line 27

**Result:** `req.file` properly validated and passed to service layer.

### Check 3: Soft Delete Cascade Completeness — 2 MEDIUM findings

| Cascade | Parent Service | Targets | Status |
|---------|---------------|---------|--------|
| organisations → users, projects, sources | organisations.service.ts | users, projects, sources | [MEDIUM] |
| projects → projectSources, processingJobs, datasets | projects.service.ts | projectSources, processingJobs, datasets | [OK] |
| sources → projectSources | sources.service.ts | projectSources | [OK] |
| processingJobs → datasets | processingJobs.service.ts | datasets | [MEDIUM] |

**Detail — Cascade 1 (organisations):**
`organisations.service.ts` contains only `getOrganisation` and `updateOrganisation`. No delete function exists. The cascades to `users`, `projects`, and `sources` are not implemented.

**Mitigating context:** No `DELETE /api/organisation` endpoint exists in service-contracts.json. The cascade definition in data-relationships.json is preparatory for future functionality. The current API surface does not expose organisation deletion, so this cascade is not currently triggerable.

**Detail — Cascade 4 (processingJobs):**
`processingJobs.service.ts` contains only `listProcessingJobs`, `getProcessingJob`, and `createProcessingJob`. No delete function exists. The cascade to `datasets` is not implemented.

**Mitigating context:** No `DELETE /api/.../processing-jobs/:jobId` endpoint exists in service-contracts.json. Processing jobs are only soft-deleted transitively via the projects cascade (`projects.service.ts:147-149`), which also directly cascades to `datasets` by `projectId` (`projects.service.ts:151-153`). The standalone processingJobs → datasets cascade path is not currently triggerable.

→ See **Finding F-03** and **F-04** below.

### Check 4: Role Protection — [OK]

| Endpoint | Route File | Middleware | Status |
|----------|-----------|------------|--------|
| PATCH /api/organisation | organisation.routes.ts:22 | requireRole('admin') | [OK] |
| POST /api/users | users.routes.ts:31 | requireRole('admin') | [OK] |
| PATCH /api/users/:userId | users.routes.ts:53 | requireRole('admin') | [OK] |
| DELETE /api/users/:userId | users.routes.ts:62 | requireRole('admin') | [OK] |

**Result:** All admin-protected endpoints have `requireRole('admin')` middleware.

---

## SECTION 5: ALL FINDINGS

### [HIGH] F-01: Source upload sets status to 'ready' instead of 'pending'

**Location:** `server/services/sources.service.ts:77`
**Contract Reference:** service-contracts.json — POST /api/sources/upload
**Contract Requirement:** "status starts as pending"
**Actual Behaviour:** `status: 'ready'` is set at upload time

The service contract explicitly states that uploaded sources should start with status `pending` (semantics: "Data ingestion in progress"). The implementation skips directly to `ready` (semantics: "Data ingested and available for processing"). This deviates from the documented status enum lifecycle.

**Impact:** Status transition semantics defined in statusEnums (`pending → ready | error`) are bypassed. Client code depending on the `pending` state for progress indication will never observe it.

**Recommendation:** Either change the implementation to set `status: 'pending'` and transition to `ready` after ingestion, or update the service contract to document that synchronous file uploads go directly to `ready`.

---

### [MEDIUM] F-02: Error-swallowing catch blocks in route handlers

**Locations:**
- `server/routes/users.routes.ts:26-28` (all errors → 500)
- `server/routes/users.routes.ts:48-50` (all errors → 404)
- `server/routes/users.routes.ts:57-59` (all errors → 404)
- `server/routes/users.routes.ts:70-72` (all errors → 404)
- `server/routes/projects.routes.ts:33-35` (all errors → 500)
- `server/routes/projects.routes.ts:48-50` (all errors → 400)
- `server/routes/projects.routes.ts:57-59` (all errors → 404)
- `server/routes/projects.routes.ts:66-68` (all errors → 400)
- `server/routes/projects.routes.ts:75-77` (all errors → 404)

**Description:** Route handlers use generic `catch (err: any)` blocks that map all errors to a single HTTP status code regardless of the actual error type. For example, a database connection error in `getUser` would return 404 instead of 500.

**Also flagged by:** Build gate `route-service-alignment` as "Anti-Pattern 4" warnings.

**Impact:** Incorrect HTTP status codes returned to clients. Server errors (database failures, timeouts) may be misclassified as client errors (404, 400), making debugging and monitoring more difficult.

**Recommendation:** Differentiate error types in catch blocks (e.g., check for "not found" errors vs. rethrow unexpected errors as 500).

---

### [MEDIUM] F-03: Organisation cascade not implemented (no delete function)

**Location:** `server/services/organisations.service.ts`
**Contract Reference:** data-relationships.json — softDeleteCascades[0]
**Expected Cascades:** organisations → users, projects, sources (executionOrder: 1)

The organisations service contains no delete function. The soft-delete cascade to `users`, `projects`, and `sources` defined in data-relationships.json is not implemented.

**Mitigating Context:** No `DELETE /api/organisation` endpoint exists in service-contracts.json for the current MVP. The cascade is not currently triggerable through the API.

**Recommendation:** Implement `deleteOrganisation` with cascade when the DELETE endpoint is added. Document the gap in the interim.

---

### [MEDIUM] F-04: ProcessingJobs cascade not implemented (no delete function)

**Location:** `server/services/processingJobs.service.ts`
**Contract Reference:** data-relationships.json — softDeleteCascades[3]
**Expected Cascade:** processingJobs → datasets (executionOrder: 4)

The processingJobs service contains no delete function. The soft-delete cascade to `datasets` defined in data-relationships.json is not implemented.

**Mitigating Context:** No `DELETE /api/.../processing-jobs/:jobId` endpoint exists. Processing jobs are only deleted transitively via the projects cascade (`projects.service.ts:147-149`), which also directly cascades to `datasets` by `projectId` (`projects.service.ts:151-153`).

**Recommendation:** Implement `deleteProcessingJob` with cascade to datasets when/if a standalone delete endpoint is added.

---

### [MEDIUM] F-05: Source upload sets status to 'ready' — skips column detection error surfacing

**Location:** `server/services/sources.service.ts:66-68`

```typescript
} catch {
  // Column detection failure is non-fatal
}
```

Silent catch on column detection means the upload succeeds but detected columns may be empty without any indication to the user. Combined with F-01 (status set to 'ready' immediately), the user has no signal that column detection failed.

**Impact:** If column detection fails for an uploaded file, the source appears fully ready with no detected columns and no error indication.

**Recommendation:** Consider setting the source status to indicate partial readiness or logging a warning to the response when column detection fails.

---

### [INFO] F-06: Deferred endpoints properly excluded

19 deferred endpoints (webhooks, billing, marketplace, cloud storage destinations, enrichment plugins) are declared in service-contracts.json with `status: "deferred"`. Build gate `no-forbidden-artifacts` confirms no route or service files exist for deferred entities. Build gate `no-deferred-pages` confirms no UI pages exist for deferred features.

**Status:** Correctly implemented per `deferredRouteHandling: "excludeFromRegistration"`.

---

### [INFO] F-07: Version-bump invariant correctly implemented

`projects.service.ts:105-113` correctly increments `deIdentificationConfigVersion` and `filterConfigVersion` when their respective configs are updated.

`projectSources.service.ts` (confirmed via build gates) correctly increments `mappingConfigVersion` and `filterRulesVersion`.

**Status:** Version-bump invariant upheld.

---

## SECTION 6: AUDIT SUMMARY

| Category | Result |
|----------|--------|
| Build Proof | PASS (164/164 gates, 0 failures) |
| Endpoint Coverage | PASS (33/33 required endpoints implemented) |
| Password Hashing | PASS (single algorithm: bcrypt) |
| Upload Handler | PASS (req.file properly used) |
| Cascade Completeness | 2 MEDIUM findings (no API surface exposure) |
| Role Protection | PASS (all 4 admin endpoints protected) |
| Contract Conformance | 1 HIGH finding (status enum deviation) |
| Error Handling | 1 MEDIUM finding (catch-all patterns) |

**Overall Assessment:** The codebase implements all 33 required API endpoints with correct route files, service files, and exported methods. All 164 build gates pass. Role-based access control is correctly applied. The primary finding is a status enum deviation in the source upload flow (F-01). Cascade gaps exist for entities without delete endpoints (F-03, F-04) — these are structural gaps in the data layer but are not currently triggerable through the API.

---

**Report generated by Agent 8 — Code Review (Report-Only Mode)**
**Audit date:** 2026-02-06
