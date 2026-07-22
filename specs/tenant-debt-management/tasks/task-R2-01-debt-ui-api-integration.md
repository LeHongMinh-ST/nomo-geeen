# Task R2-01: Debt UI and API integration

**Requirement:** R4
**Status:** done
**Priority:** P0
**Estimated Effort:** 8–12 hours
**Dependencies:** tasks/task-R1-01-debt-domain-api.md
**Spec:** specs/tenant-debt-management/
**Contracts:** DEBT_API_V1

## Context
- **Why**: Existing debt screens must reflect committed backend balances.
- **Current state**: Debt screens originally used mock accounts and local payment mutation.
- **Target outcome**: list/detail and collect/pay use userFetch and server-confirmed state.

## Constraints
- **MUST**: follow DESIGN.md and existing userFetch/auth patterns.
- **SHOULD**: reuse DebtCard, CollectPaymentSheet, formatVND, and loading/toast patterns.
- **MUST NOT**: retain mock data as a runtime fallback or redesign unrelated screens.
- **SCOPE**: API client, debt screens, loader, and direct UI tests.

## Steps
- [x] Implement frontend/lib/tenant-debts-api.ts for DEBT_API_V1. _Requirements: 4.1, 4.2, 4.3_
- [x] Replace mock list and local mutation in debt-list.tsx and debt-detail.tsx. _Requirements: 4.1, 4.3, 4.4_
- [x] Wire the detail route/loader and render ledger plus voucher method history. _Requirements: 4.2, 4.4_

## Requirements
- 4.1, 4.2, 4.3, 4.4

## Related Files
| Path | Action | Description |
|---|---|---|
| frontend/lib/tenant-debts-api.ts | Create/Modify | API client/types |
| frontend/components/app/debt/debt-list.tsx | Modify | Real list/mutation |
| frontend/components/app/debt/debt-detail.tsx | Modify | Real detail/history |
| frontend/components/app/debt/debt-detail-loader.tsx | Create/Modify | Async loader |
| frontend/components/app/debt/collect-payment-sheet.tsx | Modify | Payload/error behavior |
| frontend/app/(app)/cong-no/page.tsx | Read | List entrypoint |
| frontend/app/(app)/cong-no/[id]/page.tsx | Modify | Detail entrypoint |
| frontend/lib/user-fetch.ts | Read | Authenticated transport |

## Completion Criteria
- [x] Both tabs fetch server data and show loading/error/empty/success.
- [x] Detail shows DebtLedger and linked voucher methods. The route or loader preserves explicit partyType and never relies on ambiguous UUID fallback.
- [x] Receipt/payment refreshes server balance and shows feedback.
- [x] No runtime path imports mock accounts or local-only payment mutation.

## Evidence
- [x] Automated verification: pnpm --dir frontend test; pnpm --dir frontend lint; pnpm --dir frontend build.
- [x] Artifact verification: authenticated /cong-no and /cong-no/[id] with both directions.
- [x] Runtime reachability verification: route -> DebtList/loader -> tenant-debts-api -> userFetch -> backend.
- [x] Contract/negative path: 401/403/422/network failure and empty list show explicit UI states.

## Risk Assessment
| Risk | Severity | Mitigation |
|---|---|---|
| Hydration mismatch | Medium | client loader and explicit loading state |
| Wrong party type | High | derive type from selected context |