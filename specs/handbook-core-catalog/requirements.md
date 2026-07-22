# Requirements Document

## Introduction

NomoGreen's Handbook must organize the core technical-advice catalog around the five product categories used by the agricultural-supply business. The category axis is for browsing, filtering, creating, editing, and persisting Handbook entries; it does not replace the disease/problem fields or stock-aware product recommendation rules.

The canonical user-facing labels are exactly:

1. `Thuốc bảo vệ thực vật + Phân bón`
2. `Cây giống`
3. `Thức ăn chăn nuôi`
4. `Thuốc thú y`
5. `Con giống`

## Requirements

### Requirement 1: Canonical core-value catalog

**Objective:** As a store owner, I want the Handbook categories to reflect the five core agricultural-supply groups, so that staff can find advice using the same language as the store's product business.

#### Acceptance Criteria

- **R1.1** When the Handbook category catalog is loaded, the system shall expose exactly five categories in the approved order: `Thuốc bảo vệ thực vật + Phân bón`, `Cây giống`, `Thức ăn chăn nuôi`, `Thuốc thú y`, and `Con giống`.
- **R1.2** The system shall use stable machine identifiers distinct from display labels, and shall map the combined first label to one identifier rather than two selectable categories.
- **R1.3** If a record has an unknown, null, or deprecated category identifier, the system shall represent it as `Chưa phân loại` and shall not silently assign it to a core category.

### Requirement 2: Handbook entry behavior

**Objective:** As a store user, I want to filter and maintain Handbook entries by the approved category, so that category selection is useful at the counter without removing technical context.

#### Acceptance Criteria

- **R2.1** When a user opens `/so-tay`, the system shall render one filter option per approved category plus `Tất cả`, and selecting a category shall show only entries assigned to that category.
- **R2.2** When a user creates or edits a Handbook entry, the form shall require exactly one approved category and shall preserve the existing name, aliases, subject, type, symptoms, notes, ingredient links, pins, and exclusions.
- **R2.3** When a user searches the Handbook, the system shall match the entry name, aliases, subject, and category display label without changing the product recommendation ranking.
- **R2.4** When the category filter produces no results, the system shall show a clear empty state and retain the selected category so the user can change it without losing the search query.

### Requirement 3: Persistence and compatibility

**Objective:** As a tenant owner, I want the category to persist with tenant isolation and compatible legacy data handling, so that existing Handbook knowledge remains usable after rollout.

#### Acceptance Criteria

- **R3.1** When a Handbook entry is created or updated through the backend contract, the system shall validate the category against the canonical five-value set and shall reject invalid values with a field-level 400 response.
- **R3.2** The system shall persist the category on the tenant-scoped Handbook entry and shall return the stable identifier plus the exact display label in list and detail responses.
- **R3.3** During migration or seed synchronization, existing entries shall retain all non-category fields; deprecated `CROP`, `LIVESTOCK`, `AQUACULTURE`, and `GENERAL` domain values shall be mapped by explicit rules documented in the design rather than by data loss.
- **R3.4** A tenant-scoped read or write shall never return or mutate another tenant's Handbook entries, including when category filtering is applied.

### Requirement 4: Usability, safety, and verification

**Objective:** As a store operator, I want the new catalog to remain understandable and safe on mobile, so that the taxonomy supports technical advice without encouraging unverified product use.

#### Acceptance Criteria

- **R4.1** The Handbook category controls shall meet the existing mobile-first interaction rules: body text at least 16px, interactive targets at least 48px, visible keyboard focus, and labels that do not rely on color alone.
- **R4.2** The category change shall not alter the existing stock-aware recommendation rules: pinned products remain first, then ingredient/tag matches, and unavailable products remain non-sellable.
- **R4.3** The implementation shall include automated coverage for category mapping/filtering/validation and a UI regression check for the `/so-tay` list and create/edit flows.

## Non-Functional Requirements

### Requirement 5: Performance & Scalability

**Objective:** As a store user, I want category browsing to remain responsive, so that the Handbook is usable at the counter.

#### Acceptance Criteria

- **R5.1** For a tenant with up to 2,000 Handbook entries, category filtering and local search shall complete in at most 100ms in the client-side selector logic, excluding network time.
- **R5.2** The backend list endpoint shall apply tenant and category filtering before serialization and shall return the existing pagination shape without loading unrelated tenants' rows.

### Requirement 6: Security & Privacy

**Objective:** As a tenant owner, I want Handbook data to remain tenant-isolated, so that store knowledge is not disclosed across tenants.

#### Acceptance Criteria

- **R6.1** If a request omits a valid tenant access context or permission required by the existing Handbook boundary, the backend shall reject it using the project's existing guard/permission behavior.
- **R6.2** The category contract shall not expose internal tenant identifiers or permit a client-supplied tenant identifier to override the authenticated tenant scope.

### Requirement 7: Reliability & Availability

**Objective:** As an operator, I want rollout failures to be recoverable, so that category migration does not make existing Handbook entries unusable.

#### Acceptance Criteria

- **R7.1** If category migration encounters an unmappable legacy value, the system shall preserve the entry and assign `Chưa phân loại` with an observable migration report or log entry.
- **R7.2** The rollout shall be reversible by restoring the pre-change application/schema version without deleting existing Handbook entries or product pins.

## Unresolved Questions

- Exact legacy-to-category mapping for each seeded disease must be confirmed against the final business seed list during implementation; the design defines the safe default and forbids silent guessing.
