# Task R2-01: Customer ui integration

**Requirement:** R6 — Real `/khach-hang` wired to the tenant customer API
**Status:** pending
**Priority:** P1
**Estimated Effort:** 3–5 hours
**Dependencies:** task-R1-01-customer-domain-api.md
**Spec:** specs/tenant-customer-management/

## Context

- **Why**: `/khach-hang` list/form/detail render seed data from `frontend/lib/customers.ts`; users cannot persist real customers. The backend from R1-01 exposes `/tenant/customers` and the UI must consume it.
- **Current state**: `customer-list.tsx` and `customer-form.tsx` carry `TODO: gọi API`; `customer-detail.tsx` renders mock debt/order history. `frontend/lib/tenant-suppliers-api.ts` is the client precedent using `userFetch`.
- **Target outcome**: List/search, create, edit, and soft-delete flow through a typed `tenant-customers-api.ts` client against `/tenant/customers`; balance/debt shows read-only; seed data is removed from these screens.

## Constraints

- **MUST**: Route all reads/writes through the new API client using `userFetch`; map `CustomerType` enum (RETAIL/FARMER/FARM/AGENT) to existing Vietnamese labels; keep balance/debt display read-only.
- **SHOULD**: Mirror `tenant-suppliers-api.ts` shape (base `/tenant/customers`, list/create/update/delete, typed request/response); preserve the current responsive/mobile-first layout and sticky-save UX.
- **MUST NOT**: Send `balance`/`openingBalance` in create/update payloads; introduce transaction/order-history UI (out of scope); leave `frontend/lib/customers.ts` seed data imported by these screens.
- **SCOPE**: Implement only the behavior mapped to R6 and the approved `scope_lock`.

## Steps

- [ ] 1. Add `frontend/lib/tenant-customers-api.ts` mirroring the suppliers client: `Customer`/`CustomerType` types, `listCustomers({search,page,pageSize})`, `getCustomer(id)`, `createCustomer(input)`, `updateCustomer(id,input)`, `deleteCustomer(id)`, all via `userFetch` against `/tenant/customers`.
  - Business intent: A single typed client is the only path to customer data.
  - Code detail: Response maps API fields (`balance` Number, `type` enum) into UI model; request types exclude balance/openingBalance/tenantId.
  - _Requirements: 6.1, 6.2_
- [ ] 2. Wire `customer-list.tsx` (list/search/pagination + real `handleDelete` soft delete with confirm+refresh) and `customer-form.tsx` (create/edit `handleSubmit` calling create/update; type select bound to enum labels; validation error surfaced) to the client; drop `frontend/lib/customers.ts` imports.
  - Business intent: Users manage real customers end to end from the existing screens.
  - Code detail: Preserve routes `/khach-hang`, `/khach-hang/them`, `/khach-hang/${id}`, `/khach-hang/${id}/sua`; keep responsive/sticky-save UX; show loading/empty/error states.
  - _Requirements: 6.1, 6.3, 6.4_
- [ ] 3. Update `customer-detail.tsx` to read one customer from the API and show balance/debt read-only; remove mock `getDebt`/`orders` history usage (transaction history is out of scope).
  - Business intent: Detail reflects real persisted data without out-of-scope history.
  - Code detail: Fetch by id; render contact + read-only balance derived from the server value (debt/no-debt from `balance > 0`); never compute or persist balance locally; edit/soft-delete actions call the client.
  - _Requirements: 6.1, 6.4, 4.3_
- [ ] 4. Verification implementation
  - Add/adjust component or integration checks for list/create/edit/delete happy-path and validation-error surfacing; run frontend typecheck/build.
  - _Requirements: 9.2_

## Requirements

- 6.1 — screens read/write via the real `/tenant/customers` client
- 6.2 — typed API client mirrors suppliers pattern using `userFetch`
- 6.3 — create/edit/soft-delete persist and refresh the list
- 6.4 — balance/debt rendered read-only; no seed data
- 4.3 — frontend presents server-derived balance and debt state; never computes or persists balance locally
- 9.2 — frontend verification (typecheck/build + flow check)

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/tenant-customers-api.ts` | Create | Typed `/tenant/customers` client via `userFetch` |
| `frontend/components/app/customer/customer-list.tsx` | Modify | List/search/pagination + real soft delete |
| `frontend/components/app/customer/customer-form.tsx` | Modify | Create/edit submit through the client |
| `frontend/components/app/customer/customer-detail.tsx` | Modify | API-backed detail, read-only balance, no mock history |
| `frontend/lib/customers.ts` | Modify / Delete | Remove seed usage from these screens |

## Completion Criteria

- [ ] `/khach-hang` list/search, create, edit, and soft-delete operate against `/tenant/customers` with no seed fallback.
- [ ] `CustomerType` maps to the existing Vietnamese labels; balance/debt is display-only.
- [ ] Create/update payloads never include balance/openingBalance; validation errors from the API surface in the form.
- [ ] No transaction/order-history UI is introduced; deleted customers disappear from the list after refresh.

## Evidence

This section is both the task-level test plan and the proof checklist. Keep it short, exact, and executable.
Select the proof by task risk; do not run every test type for every task.

- Logic/data/validator task: include unit tests.
- Stateful UI/component task: include component or integration tests.
- Cross-module/API/state flow task: include integration tests.
- User-facing end-to-end workflow: include E2E/UI flow verification.
- Layout/theme/responsive task: include visual/runtime viewport checks.
- Interactive UI task: include accessibility checks when keyboard, focus, labels, or ARIA can regress.
- Scaffold/release task: include smoke build/test/dev-server checks.
- Performance/security checks are required only when the requirement, risk, or touched surface calls for them.

- [ ] Automated verification (unit/component/integration/E2E as applicable)
  - Command(s):
    ```bash
    pnpm --dir frontend typecheck
    pnpm --dir frontend build
    ```
  - Expected proof: Typecheck and build exit 0 with the new client and updated screens compiling; no unresolved imports from removed seed data.
- [ ] Artifact / runtime verification
  - Inspect: `/khach-hang` list, `/khach-hang/them`, `/khach-hang/${id}`, `/khach-hang/${id}/sua`
  - Expect: List/search returns API data; create/edit persist and the list refreshes; detail shows read-only balance; deleted customer disappears after refresh.
- [ ] Runtime reachability verification
  - Entrypoint/caller: `frontend/components/app/customer/customer-list.tsx`, `customer-form.tsx`, `customer-detail.tsx`
  - Expect: All three import `frontend/lib/tenant-customers-api.ts`; `frontend/lib/customers.ts` seed is no longer used by these screens.
- [ ] Contract / negative-path verification
  - Check: submit empty `name`; attempt to send balance; delete confirm flow
  - Expect: API `VALIDATION_ERROR` surfaces in the form; payload excludes balance/openingBalance; delete requires confirm then removes from list.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Seed data (`frontend/lib/customers.ts`) left imported → stale/mock rows in UI | High | Remove seed imports from all three screens; typecheck/build catches dangling references. |
| Sending `balance`/`openingBalance` in payloads → finance corruption or 422 | Medium | Request types exclude balance fields; negative-path test asserts payload shape. |
| `CustomerType` enum/label mismatch (API RETAIL vs UI "retail") → blank/incorrect labels | Medium | Central enum→label map in the client; verify each type renders its Vietnamese label. |
| Scope creep into transaction/order history UI | Low | Detail shows read-only balance only; no history components; scope_lock enforced. |

---

> **Parallel marker**: Append `(P)` to the title if this task can run concurrently with another (usually when serving different requirements).
> **Test note**: If a test coverage sub-task can be deferred post-MVP, mark it with `- [ ]*`.
> **Requirement mapping**: Every sub-task MUST end with `_Requirements: X.X_`. No mapping = invalid task file.
> **Evidence rule**: No `## Evidence` section = invalid task file. Existing specs may use `## Task Test Plan & Verification Evidence` or legacy `## Verification & Evidence`; agents must support all three headings.
