# Red Team Review — sale-checkout-fe-gates — 2026-07-23

**Mode note:** Auto-decision table → **Validate only** (4 task files, no auth/payment/migration/schema keywords). Formal 4-persona Red Team not required. This report records an adversarial pre-validate pass + Evidence Filter so findings stay evidence-backed. User may request full Red Team later.

**Findings:** 6 considered (3 accepted as documentation/contract tighten, 3 rejected).  
**Severity breakdown:** 0 Critical, 1 High (accepted as contract note), 2 Medium accepted, 3 Rejected.

## Finding 1: userFetch reason surface is correct but map must not assume nested `cause`
- **Severity:** High
- **Location:** design.md §Invariants #6; research.md “Remaining gaps”; task-R0-01 §Steps 1
- **Flaw:** Map signature described as reading `reason` from “Error-like objects” without pinning that `UserApiError` puts `reason` on the **thrown Error itself**, while quick-sale currently casts `cause as { reason?: string }` (works today) and order-form uses only `Error.message`.
- **Failure scenario:** Implementer only checks `(error as any).body.reason` or only `message` → eligibility codes never map.
- **Evidence:** `frontend/lib/user-auth-api.ts` `UserApiError = Error & { status?: number; reason?: string }`; `createUserApiError` sets `reason: body?.reason`. quick-sale.tsx:131–140.
- **Suggested fix:** Contract: `mapSalesApiError` reads `reason` from thrown object top-level (`error.reason` if object/Error); ignore nested body; no network.
- **Disposition:** Accept
- **Rationale:** Aligns R0-01 with real FE error shape; cheap doc/task fix.
- **Applied To:** design.md invariants + task-R0-01 Context/Steps

## Finding 2: Stock/customer copy regression risk if map invents new strings
- **Severity:** Medium
- **Location:** design.md §UX copy; requirements R1.2; quick-sale.tsx:133–137
- **Flaw:** Design says “(keep existing)” without quoting exact VI strings → implementer may paraphrase.
- **Failure scenario:** POS operators lose familiar copy; R1.2 regression.
- **Evidence:** Current strings: INSUFFICIENT_STOCK → `Một sản phẩm vừa hết tồn. Vui lòng kiểm tra lại giỏ hàng.`; INVALID_CUSTOMER → `Khách hàng chưa có trong dữ liệu thật. Vui lòng chọn khách hợp lệ hoặc bán khách lẻ.`
- **Suggested fix:** Pin exact strings in design + R0-01 map table.
- **Disposition:** Accept
- **Rationale:** Confirmed in Validate Session 1 (user: exact copy).
- **Applied To:** design.md UX table; task-R0-01 Steps

## Finding 3: Missing-reason path diverges across surfaces
- **Severity:** Medium
- **Location:** order-form.tsx catch uses `Error.message`; design fallback “generic”
- **Flaw:** Spec did not lock whether map prefers `message` or pure fallback when `reason` absent.
- **Failure scenario:** order-form shows raw English Nest messages after wire; quick-sale shows generic VI — inconsistent UX.
- **Evidence:** order-form.tsx:100 `cause instanceof Error ? cause.message : ...`; design invariant “Unknown reason → generic fallback”.
- **Suggested fix:** No reason → **always** generic VI fallback (optional override arg); do not surface raw `Error.message` for sales POS errors.
- **Disposition:** Accept
- **Rationale:** Validate Session 1 (user: fallback generic VI).
- **Applied To:** design.md invariants; task-R0-01 + R1-01 Constraints

## Finding 4: Cart lines may lack agro → strip always empty
- **Severity:** Medium
- **Location:** task-R1-02 Risk; research remaining gaps
- **Flaw:** Spec already mitigates with hide-strip; not a hard fail if documented as success path for R3.3.
- **Failure scenario:** Strip never appears in prod POS if picker omits attrs — looks “unfinished” to BA.
- **Evidence:** research.md remaining gaps; product seed has agro.phi/rei in `frontend/lib/products.ts` but POS path may differ.
- **Suggested fix:** Keep hide-on-missing; receipt notes if strip unprovable without picker enrich (out of scope).
- **Disposition:** Reject (already in scope as intentional)
- **Rationale:** R3.3 + user Validate: client-only data; no enrich.

## Finding 5: order-detail complete error UI may not use string alert
- **Severity:** Medium
- **Location:** task-R1-01 step 3; order-detail.tsx complete catch `setError(e)`
- **Flaw:** order-detail stores `unknown` error; success/error UI currently optimized for load failures (403/404), not complete 422 toast.
- **Failure scenario:** Map runs but UI still shows “Không thể tải đơn” generic after failed complete.
- **Evidence:** order-detail sets error to whole object; load error branch ignores `reason`.
- **Suggested fix:** On complete/cancel fail, display `mapSalesApiError(e)` in alert/banner distinct from load failure if needed.
- **Disposition:** Accept (implementation note, not scope expand)
- **Rationale:** Within R2.3 wire; no new surface.
- **Applied To:** task-R1-01 Steps + Completion Criteria

## Finding 6: Over-engineered typed SalesApiErrorBody on FE
- **Severity:** Medium
- **Location:** design.md Canonical Contracts SalesApiErrorBody
- **Flaw:** Full body type unused if map only needs reason string.
- **Failure scenario:** YAGNI bloat in FE types file.
- **Evidence:** design contracts include full body; R0-01 only pure map.
- **Suggested fix:** Optional type export OK; map must not require full body parse.
- **Disposition:** Reject
- **Rationale:** Type as documentation contract is fine; not mandatory runtime parse.

## Summary table

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| 1 | reason on thrown Error top-level | High | Accept | design + R0-01 |
| 2 | Pin stock/customer VI | Medium | Accept | design + R0-01 |
| 3 | No-reason → generic only | Medium | Accept | design + R0-01/R1-01 |
| 4 | Strip empty without attrs | Medium | Reject | — |
| 5 | order-detail complete UI uses map string | Medium | Accept | R1-01 |
| 6 | Full body type YAGNI | Medium | Reject | — |
