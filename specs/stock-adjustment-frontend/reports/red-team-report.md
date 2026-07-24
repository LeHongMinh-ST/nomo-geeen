# Red Team Report — stock-adjustment-frontend

## Red Team Review — 2026-07-24
**Findings:** 4 (4 accepted, 0 rejected)
**Severity breakdown:** 1 Critical, 2 High, 1 Medium

## Finding 1: Warehouse authority is not contractually fixed
- **Severity:** Critical
- **Location:** Task task-R2-01-adjustment-create-and-complete-flow.md, section "Context"
- **Flaw:** The task says not to fabricate warehouseId but does not name the source or exact blocked behavior.
- **Failure scenario:** A developer invents a first warehouse or sends an empty ID; the adjustment is rejected or applied to the wrong warehouse.
- **Evidence:** "Never fabricate warehouse ID" without a warehouse source or blocked-state contract.
- **Suggested fix:** Require the authenticated/default warehouse context; disable submission and show a blocking message when absent.
- **Disposition:** Accept
- **Rationale:** Warehouse scope is part of the mutation contract and must be implementable without guessing.

## Finding 2: Closed reason choices have no concrete implementation owner
- **Severity:** High
- **Location:** Requirements R3.1 and Task task-R2-01-adjustment-create-and-complete-flow.md, section "Steps"
- **Flaw:** The spec requires closed reasons but names no source file or exact fallback behavior.
- **Failure scenario:** The UI reintroduces free text or silently sends labels instead of backend reason codes.
- **Evidence:** "closed reason code" is required, while Related Files has no reason policy module.
- **Suggested fix:** Add frontend/lib/stock-adjustment-reasons.ts as the explicit code/label policy source and render unknown API codes safely.
- **Disposition:** Accept
- **Rationale:** This closes the main ambiguity without adding a backend endpoint.

## Finding 3: Refresh semantics are underspecified
- **Severity:** High
- **Location:** Requirements R3.4 and design.md, section "Component and data flow"
- **Flaw:** "refresh inventory" does not state which data is refetched or when.
- **Failure scenario:** A success toast appears while stale inventory/history remains visible, causing a second incorrect adjustment.
- **Evidence:** R3.4 previously required refresh and navigation but named no refetch target or ordering.
- **Suggested fix:** Refetch affected inventory detail and mounted adjustment history through typed clients before navigation.
- **Disposition:** Accept
- **Rationale:** The implementation needs an observable freshness boundary.

## Finding 4: Adjustment list runtime surface is ambiguous
- **Severity:** Medium
- **Location:** Task task-R1-01-adjustment-list-and-detail.md, section "Context"
- **Flaw:** The task creates a list component but does not state whether it is a new route or embedded inventory surface.
- **Failure scenario:** A developer adds an unreachable standalone route or duplicates the inventory shell.
- **Evidence:** Requirement R2.1 says inventory opens an adjustment list, while Related Files do not define a route.
- **Suggested fix:** Mount history/list from existing ton-kho inventory surfaces; do not add a top-level route.
- **Disposition:** Accept
- **Rationale:** This preserves the existing runtime boundary and avoids scope drift.

## Applied changes

- requirements.md: clarified warehouse/reason policy, explicit refetch, and mounted runtime reachability.
- design.md: added warehouse/reason invariants, refetch flow, and traceability updates.
- task-R1-01: fixed the list runtime surface.
- task-R2-01: named the reason policy file, warehouse blocking behavior, and refetch ordering.
