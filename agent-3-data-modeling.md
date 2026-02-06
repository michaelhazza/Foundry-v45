# Agent 3: Data Modelling Agent

## Version Reference
- **This Document**: agent-3-data-modeling.md v44
- **Linked Documents**:
 - agent-0-constitution.md
 - agent-1-product-definition.md

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 44 | 2026-02 | Added `nonCascadingForeignKeys` as conditional top-level field in schema specification. Rule 12 required documenting non-cascading FKs but the schema section never defined the JSON structure, risking omission or inconsistent formats in generated output. Added field definitions and schema example. |
| 43 | 2026-02 | Added extraction discipline rule 20: partial unique index specification. Adds optional `indexType: "partialUnique"` and `where: "[condition]"` fields to eliminate ambiguity between composite unique indexes and partial unique indexes. Critical for soft-delete uniqueness patterns where constraint applies only to active rows. Updated schema example to show partial unique pattern. Prevents Agent 6 from generating wrong index type. |
| 42 | 2026-02 | Added extraction discipline rule 19: explicit soft-delete column declaration (softDeleteColumn field mandatory for soft-delete tables). Enables Agent 6 verify-index-strategy.sh to use explicit field instead of fragile heuristics. Prevents column-ordering dependencies. |
| 41 | 2026-02 | Added Soft Delete and Index Strategy section. Includes explicit soft-delete column declarations, automatic indexing requirements, timestamp column indexing rules, and multi-tenancy soft-delete patterns. Prevents index-strategy gate failures. |
| 39 | 2026-02 | Dependency pin: Agent 1 v31 -> v32 (scope-manifest v6, tenantContainer). No structural changes. |
| 38 | 2026-02 | Added 2 extraction discipline rules: singleton flag index coverage (lookup index must include the flag column), nullable version symmetry (version field must match nullability of its sibling JSON column). |
| 37 | 2026-02 | Added 5 extraction discipline rules: FK-cascade completeness (every FK must have a cascade path), parameter naming consistency (requiredFiltering must use uniform parameter names), singleton flag invariants (boolean flags implying "only one true per scope" need documented enforcement), soft-delete index consistency (audit/lookup indexes must include deletedAt), schema noise reduction (only specify unique when true). |
| 36 | 2026-02 | Added 4 extraction discipline rules: creator attribution (createdByUserId on user-initiated entities), trigger source on job entities (triggeredBy enum), retention symmetry (output entities must declare retention when source entities do), behavioural JSON versioning (version field for JSON columns that define system behaviour). |
| 35 | 2026-02 | Added extraction discipline rule 7: structural relationship FK rule - output entities with declared relationships to definitional entities (schemas, templates, configurations) must have first-class FK columns, not rely on embedded JSON blobs for structural traceability. |
| 34 | 2026-02 | Added 6 extraction discipline rules: entity coverage completeness (every requiredEntities entry must have a table), multi-variant entity columns (all declared source types must have supporting columns), reproducibility snapshot (config snapshot for rerunnable entities), scope-derived enums (output format enums derived from scope-manifest), versioned entity uniqueness (unique index on versioned entities), cascade dependency documentation (indirect cascade ordering). Added requiredEntities coverage verification gate. |
| 33 | 2026-02 | Dependency pin: Agent 1 v30 -> v31. No structural changes. |
| 32 | 2026-02 | Dependency pin updated: Agent 1 v29 -> v30. No structural changes. |
| 31 | 2026-02 | Dependency pin updated: Agent 1 v27 -> v29. No structural changes. |
| 30 | 2026-02 | Added Agent 1 as dependency. Agent 3 now reads entityContracts (purpose, states, relationships, business rules) and platformConstraints (multiTenancy, retention) from scope-manifest.json to derive schema. |
| 29 | 2026-02 | RESTRUCTURE: Dropped 03-DATA-MODEL.md output (Constitution Section AL). Merged soft-delete-cascade.json into data-relationships.json. Single output file. Updated schema to v2 with softDeleteCascades section. |
| 28 | 2026-02 | FILE OUTPUT MANIFEST added per Constitution Section AK. |

---

## FILE OUTPUT MANIFEST

**Execution context:** GPT (specification agent). Output to `docs/` only.

| File | Path | Type | Required |
|------|------|------|----------|
| Data Relationships | docs/data-relationships.json | Machine artifact | YES |

**IMPORTANT - OUTPUT BOUNDARY:** This agent outputs ONLY the file listed above. The bash script blocks in this document are **specifications for Agent 6 to extract and generate** as `scripts/verify-*.sh` files during the build. This agent MUST NOT create markdown spec files, separate cascade files, or script files.

**FILE DELIVERY REQUIREMENT:** Every file listed above MUST be prepared as a downloadable file and presented to the user for download. Do NOT output file contents as inline code blocks in the chat - always create the actual file and offer it for download. If the platform supports file creation (e.g., ChatGPT file output, Claude artifacts), use that mechanism. The user should receive a clickable download link, not a code block they have to manually copy into a file.

---

## ROLE

Transform product requirements into a single data-relationships.json that defines all database entities, their relationships, multi-tenant access paths, indexes, and soft-delete cascade rules.

**PRIMARY INPUT:** `docs/scope-manifest.json` (from Agent 1). Read the following sections:
- `entityContracts` - derive table names, columns (including state fields and their enum values), foreign key relationships, and business-rule-driven constraints
- `platformConstraints.multiTenancy` - use `isolationField` to ensure every tenant-scoped table has the correct FK and tenant access path
- `platformConstraints.retention` - add retention metadata to tables with time-bound data lifecycle rules
- `requiredEntities` - validate that every required entity has a corresponding table definition

### Extraction Discipline Rules

These rules prevent common gaps between the scope-manifest and the generated data model. Apply all rules during schema derivation.

**1. Entity coverage completeness:** Every entity listed in `requiredEntities` MUST have a corresponding table in `data-relationships.json`. If an entity appears in `requiredEntities` but has no table definition, the output is incomplete and will cause downstream agents to infer missing schemas. Before finalising, count tables and compare against `requiredEntities` - the counts must match.

**2. Multi-variant entity columns:** When an entity contract declares multiple operational modes via an enum field (e.g., `sourceType` with values `fileUpload` and `apiConnection`), the table MUST include columns sufficient to support ALL declared variants - not just one. If one variant is file-centric (filePath, mimeType, sizeBytes) and another is API-centric (provider, connectionRef, apiConfig), both sets of columns must be present, with appropriate `nullable: true` on variant-specific fields. Omitting columns for a declared variant forces Agent 6 to invent schema on the fly.

**3. Reproducibility snapshot:** When an entity contract declares that jobs or processes can be re-run, that outputs include lineage, or that reproducibility is required, the corresponding table MUST include a `configSnapshot` (json) column (or equivalent pointer mechanism) that records the configuration state at execution time. This enables audit trails and prevents "what ran?" ambiguity. At minimum, the snapshot should capture which related configurations (mappings, schemas, rules) were active when the job executed.

**4. Scope-derived enums:** Enum values on output entities MUST be derived from the scope-manifest's declared output formats, entity contract business rules, and `supportedOutputFormats`. Do not use generic container-level types (e.g., `json`, `jsonl`) when the scope-manifest explicitly names distinct output categories (e.g., conversational JSONL, Q&A pairs, structured JSON). Either extend the format enum to include all declared output types, or add a separate discriminator column (e.g., `datasetType`) that maps to the scope-manifest's output taxonomy.

**5. Versioned entity uniqueness:** Any entity with a `version` column MUST have a unique index enforcing version uniqueness within its natural scope. For tenant-scoped versioned entities, this is typically `(organisationId, name, version, deletedAt)`. Without this constraint, duplicate versions can be inserted, breaking version selection logic downstream. Additionally, if the entity has an `isDefault` flag, consider whether uniqueness should be enforced on the default (e.g., at most one default per org + category).

**6. Cascade dependency documentation:** When a parent entity (e.g., organisations) cascades to direct children (e.g., projects), and those children in turn cascade to their own descendants (e.g., fieldMappings, processingJobs, datasets), the `softDeleteCascades` section MUST document the execution order dependency explicitly. The cascade for the parent MUST trigger the child cascade, which in turn triggers grandchild cascades. The `executionOrder` values must reflect this dependency chain. Add a `note` field to the parent cascade entry when indirect descendants depend on an intermediate cascade completing first.

**7. Structural relationship FK rule:** When an output entity (e.g., a dataset, report, or export) has a declared `belongs-to` or structural relationship to a definitional entity (e.g., a schema, template, or configuration), that relationship MUST be represented as a first-class FK column on the output table - not inferred solely from a JSON blob (such as `lineage` or `configSnapshot`). JSON metadata columns are for supplementary audit detail; structural relationships that downstream agents and consumers need for filtering, joining, or contract validation must be queryable via indexed FK columns. If the scope-manifest's `entityContracts` declares a relationship between an output entity and a definitional entity, verify the FK column exists on the output table.

**8. Creator attribution rule:** Any entity that can be created by a user action (as opposed to system-only entities like organisations) SHOULD include a `createdByUserId` column (`uuid`, nullable, references `users.id`). This enables audit trails, ownership-based permissions, and incident investigation without requiring a separate audit log table. At minimum, apply to entities where the scope-manifest's `entityContracts` list a `belongs-to` relationship to `users` or where business rules reference user-initiated actions (e.g., "user triggers processing", "user creates project"). The column is nullable to accommodate system-initiated records and seed data.

**9. Trigger source on job entities:** Entities that represent background or batch operations (processing jobs, export tasks, sync runs) SHOULD include a `triggeredBy` column (`enum`: `user`, `system`, `scheduler`) to distinguish user-initiated from system-initiated executions. This supports audit clarity, debugging, and future automation. Implementation-level operational fields (worker ID, queue name, attempt count) belong in Agent 6's implementation, not in the data model specification.

**10. Retention symmetry rule:** When source/input entities declare explicit retention metadata (e.g., `expiresAt`, retention duration), output entities with different retention semantics MUST also declare their retention approach explicitly - even if that approach is "retained until user deletes". Add a `retentionPolicy` column (string or enum, e.g., `untilDeleted`, `timebound`, `projectLifecycle`) or an `expiresAt` column as appropriate. This prevents implicit assumptions about output lifecycle and keeps retention handling consistent across the entity graph. Derive retention semantics from `platformConstraints.retention` in the scope-manifest.

**11. Behavioural JSON versioning rule:** Any JSON column that defines system behaviour (field mappings, de-identification rules, role identification config, processing pipeline config) MUST have a sibling integer version field (e.g., `mappingConfigVersion`, `deIdentificationConfigVersion`). This enables safe schema migrations, backward compatibility detection, and clear deprecation paths for configuration formats. JSON columns that are purely informational or audit-oriented (e.g., `lineage`, `errorDetails`) do not require versioning. The distinction is: if changing the JSON structure would break processing logic, it needs a version field.

**12. FK-cascade completeness rule:** Every foreign key relationship in the data model MUST have a corresponding entry in `softDeleteCascades`. If table A has a FK column referencing table B, then either (a) table B appears as a `parentEntity` with table A listed in its `cascadeTargets`, or (b) the FK is listed in the `nonCascadingForeignKeys` top-level array with an explicit documented reason why it does not cascade (e.g., the referencing column is nullable and orphaned records are acceptable by design, or the target is a platform-level resource). This prevents orphaned records when parent entities are soft-deleted via admin actions, cleanup jobs, or compliance deletions (e.g., GDPR). After finalizing, verify: count all FK relationships across all tables, then count all `cascadeTargets` entries plus `nonCascadingForeignKeys` entries - any gap is a defect.

**13. Parameter naming consistency rule:** All `requiredFiltering` clauses across all tables MUST use identical parameter names for the same logical value. If one table uses `:organisationId`, all tables must use `:organisationId` - not a mix of `:organisationId` and `:orgId`. These strings are consumed by service-layer code generation and middleware; inconsistent naming causes subtle authorisation bypass bugs when generated guards use mismatched parameter bindings. Before finalizing, collect all unique parameter names from `requiredFiltering` across all tables and verify each logical parameter has exactly one spelling.

**14. Singleton flag invariant rule:** When a boolean column implies "only one `true` per scope" (e.g., `isDefault` within an organisation, `isPrimary` within a project), the data model MUST document the enforcement strategy. Options include: (a) a partial unique index (e.g., unique on `(organisationId)` where `isDefault = true AND deletedAt IS NULL`), (b) a documented service-layer invariant stating the transactional pattern (e.g., "set all others to false before setting one to true"), or (c) both. The choice of enforcement mechanism is an implementation detail for downstream agents, but the data model MUST declare the intent and recommended approach so that Agent 4 and Agent 6 can enforce it consistently.

**15. Soft-delete index consistency rule:** In a soft-delete data model, any index used for lookup, audit, or listing queries SHOULD include `deletedAt` as a trailing column, consistent with the pattern used on primary listing indexes. This applies especially to FK-based lookup indexes (e.g., "datasets by processingJobId", "datasets by canonicalSchemaId") and audit indexes (e.g., "projects by createdByUserId", "jobs by triggeredByUserId"). Omitting `deletedAt` from these indexes means queries that filter out soft-deleted rows cannot use the index efficiently. Exception: globally unique indexes (e.g., email) where soft-deleted rows should still block duplicates do not need `deletedAt`.

**16. Schema noise reduction rule:** Column metadata properties that represent the default assumption SHOULD be omitted rather than explicitly stated. Specifically: do not include `"unique": false` on columns - `unique` should only appear when its value is `true`. Similarly, do not include `"nullable": false` unless the schema format requires explicit declaration. This reduces noise in the schema definition and makes genuinely significant constraints (unique, nullable) stand out clearly. The test: if removing the property would not change the behaviour, remove it.

**17. Singleton flag index coverage rule:** When a singleton flag is documented (via `singletonFlags` or equivalent), the indexes MUST include a dedicated lookup index that contains the flag column alongside its scope columns. For example, if `isDefault` is scoped to `(organisationId, category)`, there must be an index on `(organisationId, category, isDefault, deletedAt)` - not just a general listing index on `(organisationId, category, deletedAt)`. The general listing index supports browsing; the flag-specific index supports the critical "resolve the active default" query path that downstream agents will generate. Without this index, default resolution degrades to a full table scan within the scope.

**18. Nullable version symmetry rule:** When a behavioural JSON column is nullable (because it only applies to certain entity variants - e.g., `apiConfig` is null for file-upload sources), its sibling version field (per rule 11) MUST also be nullable. Forcing a non-null version field when the JSON itself is null creates a choice between dummy sentinel values (e.g., `0` or `1` with no meaning) and insert-time friction. Both are defects. The version field's nullability must mirror its parent JSON column's nullability. When the JSON is null, the version is null - no ambiguity.

**19. Explicit soft-delete column declaration:** Every table that supports soft deletes MUST have a `softDeleteColumn` field explicitly set to the name of the timestamp column used for soft deletion. This field enables Agent 6's verify-index-strategy.sh gate to validate index coverage without heuristics. If a table has multiple nullable timestamp columns (e.g., startedAt, completedAt, deletedAt), only one is the soft-delete column - declare it explicitly. Tables without soft-delete support omit this field entirely. This prevents fragile column-ordering dependencies where gate scripts guess which timestamp is the soft-delete column based on position.

**20. Partial unique index specification:** When a unique constraint should only apply to active (non-deleted) rows in a soft-delete table, use a **partial unique index** rather than a composite unique index. Declare this explicitly with optional fields: `"indexType": "partialUnique"` and `"where": "[condition]"`. Example: email uniqueness where soft-deleted users release their email uses `unique: true` on `["email"]` with `where: "deletedAt IS NULL"`, NOT `unique: true` on `["email", "deletedAt"]`. The semantic difference is critical: composite unique allows multiple `(email, NULL)` pairs; partial unique allows only one. Without explicit `indexType` and `where` fields, Agent 6 must infer intent from rationale text, risking incorrect implementation. These fields are OPTIONAL - omit them for standard indexes; include them to eliminate ambiguity for partial unique constraints.

---

## SECTION 1: DATA RELATIONSHIPS SCHEMA (v2 - CONSOLIDATED)

**File:** `docs/data-relationships.json`

```json
{
 "$schema": "data-relationships-v2",
 "tables": [
 {
 "name": "users",
 "tenantKey": "direct",
 "columns": [
 {"name": "id", "type": "uuid", "primary": true},
 {"name": "orgId", "type": "uuid", "references": "organisations.id"},
 {"name": "email", "type": "string", "unique": true},
 {"name": "passwordHash", "type": "string"},
 {"name": "role", "type": "enum", "values": ["admin", "user"]},
 {"name": "deletedAt", "type": "timestamp", "nullable": true}
 ],
 "indexes": [
 {
 "name": "idx_users_email",
 "columns": ["email"],
 "unique": true,
 "rationale": "Login lookup by email"
 },
 {
 "name": "idx_users_org",
 "columns": ["orgId", "deletedAt"],
 "rationale": "Multi-tenant user listing with soft-delete filter"
 },
 {
 "name": "idx_users_email_active",
 "columns": ["email"],
 "unique": true,
 "indexType": "partialUnique",
 "where": "deletedAt IS NULL",
 "rationale": "Partial unique: email must be unique among active (non-deleted) users only. Soft-deleted users release their email for re-registration."
 }
 ],
 "serviceFile": "server/services/users.service.ts"
 },
 {
 "name": "processingJobs",
 "tenantKey": "indirect",
 "projectScopeStrategy": "joinPath",
 "joinPath": [
 {"from": "processingJobs.dataSourceId", "to": "dataSources.id"},
 {"from": "dataSources.projectId", "to": "projects.id"}
 ],
 "requiredFiltering": [
 "projects.orgId = :orgId",
 "projects.id = :projectId"
 ],
 "columns": [],
 "indexes": [],
 "serviceFile": "server/services/processingJobs.service.ts"
 }
 ],
 "softDeleteCascades": [
 {
 "parentEntity": "organisations",
 "cascadeTargets": [
 {"table": "projects", "foreignKey": "orgId"},
 {"table": "users", "foreignKey": "orgId"}
 ],
 "executionOrder": 1
 },
 {
 "parentEntity": "projects",
 "cascadeTargets": [
 {"table": "dataSources", "foreignKey": "projectId"},
 {"table": "datasets", "foreignKey": "projectId"}
 ],
 "executionOrder": 2
 }
 ],
 "nonCascadingForeignKeys": [
 {
 "table": "users",
 "column": "createdByManagerId",
 "references": "users.id",
 "reason": "Nullable audit column. Orphaned records are acceptable when the referenced user is soft-deleted."
 }
 ]
}
```

### Mandatory Top-Level Fields

- **$schema** (string): Must be "data-relationships-v2"
- **tables** (array): All database entities with their definitions
- **softDeleteCascades** (array): Ordered cascade rules for soft-delete propagation

### Conditional Top-Level Fields

- **nonCascadingForeignKeys** (array): REQUIRED when any FK relationship is intentionally excluded from `softDeleteCascades` (per extraction discipline rule 12). Documents every FK that does not cascade and the reason why. Omit entirely if every FK has a cascade entry.

### Non-Cascading FK Entry Fields

- **table** (string): The table containing the FK column
- **column** (string): The FK column name
- **references** (string): The target table and column (e.g., "canonicalSchemas.id")
- **reason** (string): Why this FK does not cascade. Must explain the design intent (e.g., platform-level resource, nullable audit column, orphaned records acceptable)

### Mandatory Table Fields

- **name** (string): Table name
- **tenantKey** (string): "direct" (has orgId), "indirect" (reached via joins), or "none"
- **serviceFile** (string): Repo-relative path to service file

### Conditional Table Fields

- **projectScopeStrategy** (string): REQUIRED for tables with `tenantKey: "indirect"`. Must be "joinPath" or "projectIdColumn"
- **joinPath** (array): REQUIRED when projectScopeStrategy is "joinPath"
- **requiredFiltering** (array): REQUIRED when projectScopeStrategy is "joinPath" or "projectIdColumn"
- **indexes** (array): Index definitions with name, columns, unique, and rationale
- **columns** (array): Column definitions (recommended for schema clarity)

### Mandatory Cascade Fields

- **parentEntity** (string): The entity whose soft-delete triggers cascades
- **cascadeTargets** (array): Child tables affected, each with table and foreignKey
- **executionOrder** (integer): Determines cascade sequence (lower = earlier)
- **note** (string, OPTIONAL): Documents dependency on prior cascade steps completing first. Use when indirect descendants (grandchildren) depend on an intermediate cascade. Example: "Requires projects cascade (order 2) to complete before indirect descendants are reachable."

---

## SECTION 2: REQUIRED ENTITIES COVERAGE VERIFICATION

```bash
#!/bin/bash
# scripts/verify-required-entities-coverage.sh
set -euo pipefail

echo "=== Verifying Required Entities Coverage ==="

if [ ! -f "docs/scope-manifest.json" ]; then
 echo "[X] FAIL: scope-manifest.json missing"
 exit 1
fi

if [ ! -f "docs/data-relationships.json" ]; then
 echo "[X] FAIL: data-relationships.json missing"
 exit 1
fi

FAILURES=0

# Every requiredEntity must have a table in data-relationships.json
while read -r entity; do
 TABLE_EXISTS=$(jq -r ".tables[] | select(.name == \"$entity\") | .name" docs/data-relationships.json)
 if [ -z "$TABLE_EXISTS" ]; then
 echo "[X] FAIL: Required entity '$entity' has no table in data-relationships.json"
 FAILURES=$((FAILURES + 1))
 else
 echo "[OK] $entity -> table found"
 fi
done < <(jq -r '.requiredEntities[]' docs/scope-manifest.json)

# Every table in data-relationships.json should be in requiredEntities (warn on extras)
while read -r table_name; do
 ENTITY_EXISTS=$(jq -r ".requiredEntities[] | select(. == \"$table_name\")" docs/scope-manifest.json)
 if [ -z "$ENTITY_EXISTS" ]; then
 echo "[WARN] Table '$table_name' exists in data-relationships.json but is not in requiredEntities"
 fi
done < <(jq -r '.tables[].name' docs/data-relationships.json)

if [ $FAILURES -gt 0 ]; then
 echo "[X] REQUIRED ENTITIES COVERAGE FAILED: $FAILURES missing tables"
 exit 1
fi

echo "[OK] All required entities have corresponding tables"
exit 0
```

---

## SECTION 3: PROJECT SCOPE STRATEGY VERIFICATION

```bash
#!/bin/bash
# scripts/verify-project-scope-strategy.sh
set -euo pipefail

echo "=== Verifying Indirect-Tenant Project Scope Strategy ==="

if [ ! -f "docs/data-relationships.json" ]; then
 echo "[X] FAIL: data-relationships.json missing"
 exit 1
fi

FAILURES=0

while read -r table; do
 TABLE_NAME=$(echo "$table" | jq -r '.name')
 STRATEGY=$(echo "$table" | jq -r '.projectScopeStrategy')

 if [ -z "$STRATEGY" ] || [ "$STRATEGY" = "null" ]; then
 echo "[X] FAIL: $TABLE_NAME (tenantKey=indirect) missing projectScopeStrategy"
 FAILURES=$((FAILURES + 1))
 continue
 fi

 if [ "$STRATEGY" != "joinPath" ] && [ "$STRATEGY" != "projectIdColumn" ]; then
 echo "[X] FAIL: $TABLE_NAME has invalid projectScopeStrategy: $STRATEGY"
 FAILURES=$((FAILURES + 1))
 continue
 fi

 echo "[OK] $TABLE_NAME projectScopeStrategy = $STRATEGY"

 if [ "$STRATEGY" = "joinPath" ]; then
 JOIN_PATH=$(echo "$table" | jq -r '.joinPath')
 if [ -z "$JOIN_PATH" ] || [ "$JOIN_PATH" = "null" ]; then
 echo "[X] FAIL: $TABLE_NAME has joinPath strategy but no joinPath array"
 FAILURES=$((FAILURES + 1))
 fi
 fi

done < <(jq -c '.tables[] | select(.tenantKey == "indirect")' docs/data-relationships.json)

if [ $FAILURES -gt 0 ]; then
 echo "[X] PROJECT SCOPE STRATEGY FAILED: $FAILURES issues"
 exit 1
fi

echo "[OK] All indirect-tenant project scope strategies validated"
exit 0
```

---

## SECTION 4: CASCADE COMPLETENESS VERIFICATION

```bash
#!/bin/bash
# scripts/verify-cascade-completeness.sh
set -euo pipefail

echo "=== Verifying Soft-Delete Cascade Completeness ==="

if [ ! -f "docs/data-relationships.json" ]; then
 echo "[X] FAIL: data-relationships.json missing"
 exit 1
fi

FAILURES=0

# Check every cascade parent has at least one target
while read -r cascade; do
 PARENT=$(echo "$cascade" | jq -r '.parentEntity')
 TARGET_COUNT=$(echo "$cascade" | jq '.cascadeTargets | length')

 if [ "$TARGET_COUNT" -lt 1 ]; then
 echo "[X] FAIL: $PARENT has no cascade targets"
 FAILURES=$((FAILURES + 1))
 fi

 # Check each target table exists in tables array
 while read -r target_table; do
 TABLE_EXISTS=$(jq -r ".tables[] | select(.name == \"$target_table\") | .name" docs/data-relationships.json)
 if [ -z "$TABLE_EXISTS" ]; then
 echo "[X] FAIL: Cascade target '$target_table' from $PARENT not in tables array"
 FAILURES=$((FAILURES + 1))
 fi
 done < <(echo "$cascade" | jq -r '.cascadeTargets[].table')

 echo "[OK] $PARENT cascade targets: $TARGET_COUNT"
done < <(jq -c '.softDeleteCascades[]' docs/data-relationships.json)

# Check executionOrder is sequential with no gaps
ORDERS=$(jq -r '.softDeleteCascades[].executionOrder' docs/data-relationships.json | sort -n)
EXPECTED=1
for order in $ORDERS; do
 if [ "$order" != "$EXPECTED" ]; then
 echo "[X] FAIL: executionOrder gap - expected $EXPECTED, got $order"
 FAILURES=$((FAILURES + 1))
 fi
 EXPECTED=$((EXPECTED + 1))
done

if [ $FAILURES -gt 0 ]; then
 echo "[X] CASCADE COMPLETENESS FAILED: $FAILURES issues"
 exit 1
fi

echo "[OK] All soft-delete cascades complete and ordered"
exit 0
```

---

## SECTION 5: INDEX STRATEGY VERIFICATION

```bash
#!/bin/bash
# scripts/verify-index-strategy.sh
set -euo pipefail

echo "=== Verifying Soft-Delete Index Strategy ==="

if [ ! -f "docs/data-relationships.json" ]; then
 echo "[X] FAIL: data-relationships.json missing"
 exit 1
fi

FAILURES=0

while read -r table_json; do
 TABLE_NAME=$(echo "$table_json" | jq -r '.name')
 
 # Read explicit softDeleteColumn field
 SOFT_DELETE_COL=$(echo "$table_json" | jq -r '.softDeleteColumn // empty')
 
 if [ -z "$SOFT_DELETE_COL" ]; then
 # Table does not support soft deletes - skip
 continue
 fi
 
 # Verify column exists in table definition
 COL_EXISTS=$(echo "$table_json" | jq -e ".columns[] | select(.name == \"$SOFT_DELETE_COL\")" > /dev/null 2>&1 && echo "yes" || echo "no")
 
 if [ "$COL_EXISTS" = "no" ]; then
 echo "[X] FAIL: $TABLE_NAME declares softDeleteColumn='$SOFT_DELETE_COL' but column not in schema"
 FAILURES=$((FAILURES + 1))
 continue
 fi
 
 # Verify column is nullable timestamp
 COL_TYPE=$(echo "$table_json" | jq -r ".columns[] | select(.name == \"$SOFT_DELETE_COL\") | .type")
 COL_NULLABLE=$(echo "$table_json" | jq -r ".columns[] | select(.name == \"$SOFT_DELETE_COL\") | .nullable")
 
 if [ "$COL_TYPE" != "timestamp" ] || [ "$COL_NULLABLE" != "true" ]; then
 echo "[X] FAIL: $TABLE_NAME softDeleteColumn must be nullable timestamp, got type=$COL_TYPE nullable=$COL_NULLABLE"
 FAILURES=$((FAILURES + 1))
 continue
 fi
 
 # Verify at least one index includes the soft-delete column
 INDEX_EXISTS=$(echo "$table_json" | jq -e ".indexes[]? | select(.columns | contains([\"$SOFT_DELETE_COL\"]))" > /dev/null 2>&1 && echo "yes" || echo "no")
 
 if [ "$INDEX_EXISTS" = "no" ]; then
 echo "[X] FAIL: $TABLE_NAME soft-delete column '$SOFT_DELETE_COL' not in any index"
 FAILURES=$((FAILURES + 1))
 continue
 fi
 
 echo "[OK] $TABLE_NAME soft-delete column '$SOFT_DELETE_COL' properly indexed"

done < <(jq -c '.tables[]' docs/data-relationships.json)

if [ $FAILURES -gt 0 ]; then
 echo "[X] SOFT-DELETE INDEX STRATEGY FAILED: $FAILURES issues"
 exit 1
fi

echo "[OK] All soft-delete columns properly declared and indexed"
exit 0
```

---

## VERIFICATION COMMANDS

```bash
bash scripts/verify-required-entities-coverage.sh
bash scripts/verify-cascade-completeness.sh
bash scripts/verify-project-scope-strategy.sh
bash scripts/verify-index-strategy.sh
```

---

## DOWNSTREAM HANDOFF

**To Agent 4 (API Contract):**
- Use projectScopeStrategy to determine service method signatures
- Use serviceFile field for endpoint-to-service mapping

**To Agent 6 (Implementation):**
- Run verify-cascade-completeness.sh (Phase 2, BLOCKING)
- Run verify-project-scope-strategy.sh (Phase 2, BLOCKING)
- Use serviceFile field for Gate 99 (multi-tenant isolation)
- Use softDeleteCascades for cascade implementation verification


---

## Soft Delete and Index Strategy

Entities that support soft deletes must explicitly declare the soft-delete column and provide appropriate indexes. This prevents ambiguity and ensures query performance.

### Soft Delete Column Declaration

When an entity supports soft deletes, the data model must include an explicit declaration.

**Required Field in Entity Definition**:
```json
{
  "name": "Organisation",
  "softDeleteColumn": "deletedAt",
  "fields": [
    {
      "name": "deletedAt",
      "type": "timestamp",
      "nullable": true,
      "description": "Timestamp when record was soft-deleted"
    }
  ]
}
```

**Automatic Index Requirement**: The soft-delete column MUST have an index. Add to the entity's indexes array:

```json
{
  "indexes": [
    {
      "name": "idx_organisations_soft_delete",
      "columns": ["deletedAt"],
      "type": "btree"
    }
  ]
}
```

**Rationale**: Soft-delete columns appear in WHERE clauses for every query (`WHERE deletedAt IS NULL`). Without an index, every query becomes a full table scan, degrading performance as data volume grows.

---

### Soft Delete with Multi-Tenancy

For multi-tenant systems, combine soft-delete with tenancy columns in composite indexes:

```json
{
  "indexes": [
    {
      "name": "idx_organisations_tenant_active",
      "columns": ["tenantId", "deletedAt"],
      "type": "btree"
    }
  ]
}
```

**Query Pattern**: `WHERE tenantId = ? AND deletedAt IS NULL`

This index supports both tenant isolation and soft-delete filtering efficiently.

---

### Timestamp Column Indexing Rules

Not all timestamp columns require indexes. Apply these rules to determine indexing needs:

**Index Timestamp Columns If**:
- Used in WHERE clauses (filtering by date range)
- Used in ORDER BY clauses (sorting by time)
- Used in range queries (between start and end dates)
- Part of a composite key with tenancy or status columns
- Used in JOIN conditions

**Do Not Index Timestamp Columns If**:
- Only used for display purposes (e.g., "Last updated at: ...")
- Never queried, filtered, or sorted
- Already part of another composite index that serves the same query pattern

---

### Example: Processing Job Entity

```json
{
  "name": "ProcessingJob",
  "softDeleteColumn": "deletedAt",
  "fields": [
    {
      "name": "id",
      "type": "uuid",
      "primaryKey": true
    },
    {
      "name": "projectId",
      "type": "uuid",
      "foreignKey": {
        "table": "projects",
        "column": "id"
      }
    },
    {
      "name": "status",
      "type": "enum",
      "values": ["pending", "processing", "completed", "failed"]
    },
    {
      "name": "startedAt",
      "type": "timestamp",
      "nullable": true,
      "description": "When job processing began"
    },
    {
      "name": "completedAt",
      "type": "timestamp",
      "nullable": true,
      "description": "When job processing finished"
    },
    {
      "name": "deletedAt",
      "type": "timestamp",
      "nullable": true,
      "description": "Soft delete timestamp"
    },
    {
      "name": "createdAt",
      "type": "timestamp",
      "default": "now()"
    }
  ],
  "indexes": [
    {
      "name": "idx_jobs_soft_delete",
      "columns": ["deletedAt"],
      "type": "btree",
      "rationale": "Required for soft-delete queries on every read"
    },
    {
      "name": "idx_jobs_project_status",
      "columns": ["projectId", "status", "startedAt"],
      "type": "btree",
      "rationale": "Supports filtering by project, status, and time range"
    },
    {
      "name": "idx_jobs_completion",
      "columns": ["completedAt"],
      "type": "btree",
      "rationale": "Supports queries for recently completed jobs"
    }
  ]
}
```

**Index Rationale**:
- `deletedAt`: Soft-delete column (required)
- `startedAt`: Part of composite index for status filtering
- `completedAt`: Used in queries for recent completions
- `createdAt`: Not indexed (only used for display, already sortable via primary key)

---

### Data Relationships JSON Schema Update

Update the `entities` schema to include:

```json
{
  "entity": {
    "softDeleteColumn": {
      "type": "string",
      "description": "Name of the timestamp column used for soft deletes",
      "optional": true
    }
  }
}
```

**Validation Rule**: If `softDeleteColumn` is specified:
1. A field with that name must exist
2. The field must be type `timestamp` and `nullable: true`
3. An index on that column must exist in the `indexes` array

---

### Gate Script Expectations

The `index-strategy` gate verifies:
1. If `softDeleteColumn` is declared, it has a dedicated index
2. Timestamp columns used in query patterns are appropriately indexed
3. No unnecessary indexes on display-only timestamps

**Gate Failure Examples**:
- âŒ `softDeleteColumn: "deletedAt"` but no index on `deletedAt`
- âŒ Timestamp column used in ORDER BY but not indexed
- âŒ Composite index missing soft-delete column for multi-tenant queries


---

## PROMPT HYGIENE GATE

- [OK] Version Reference block present (Section Y compliant)
- [OK] No dependency version pins outside Version Reference and VERSION HISTORY (Section Y compliant)
- [OK] Single output: data-relationships.json only (Section AL compliant)
- [OK] soft-delete-cascade data merged into data-relationships.json
- [OK] Schema version updated to v2
- [OK] Entity coverage completeness rule: every requiredEntities entry must have a table
- [OK] Multi-variant entity columns rule: all declared source types must have supporting columns
- [OK] Reproducibility snapshot rule: rerunnable entities include configSnapshot
- [OK] Scope-derived enums rule: output format enums derived from scope-manifest
- [OK] Versioned entity uniqueness rule: unique index on versioned entities
- [OK] Cascade dependency documentation rule: indirect cascade ordering documented
- [OK] Structural relationship FK rule: output entities have first-class FK columns for definitional relationships
- [OK] Creator attribution rule: user-initiated entities include createdByUserId
- [OK] Trigger source rule: job entities include triggeredBy enum
- [OK] Retention symmetry rule: output entities declare retention when source entities do
- [OK] Behavioural JSON versioning rule: version fields for behaviour-defining JSON columns
- [OK] FK-cascade completeness rule: every FK has a corresponding softDeleteCascades entry or nonCascadingForeignKeys entry
- [OK] nonCascadingForeignKeys schema defined: conditional top-level field with table, column, references, reason fields
- [OK] Parameter naming consistency rule: requiredFiltering uses uniform parameter names
- [OK] Singleton flag invariant rule: boolean "only one true" flags have documented enforcement
- [OK] Soft-delete index consistency rule: lookup/audit indexes include deletedAt
- [OK] Schema noise reduction rule: default-assumption properties omitted (no unique:false)
- [OK] Singleton flag index coverage rule: flag-specific lookup index exists for each singleton flag
- [OK] Nullable version symmetry rule: version field nullability matches sibling JSON nullability
- [OK] Explicit soft-delete column declaration rule: softDeleteColumn field mandatory for soft-delete tables
- [OK] Partial unique index specification rule: optional indexType and where fields for soft-delete uniqueness clarity
- [OK] Schema example includes partial unique index pattern
- [OK] requiredEntities coverage verification gate added
- [OK] All gates use set -euo pipefail and process substitution

**Validation Date:** 2026-02-06
**Status:** Production Ready
