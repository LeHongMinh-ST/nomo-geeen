# Validation Log — Session 1 — 2026-07-23

**Trigger:** `/hapo:specs --validate core-stock-lifecycle` requested by user.
**Questions asked:** 3
**Mode:** Validate only (3 task files, no security/migration keyword triggers Red Team; `design_context.validation_recommended = false`).

## Validator Gate

```
$ node .claude/scripts/validate-spec-output.cjs specs/core-stock-lifecycle
PASS specs/core-stock-lifecycle
EXIT=0
```

Validator PASS confirmed before and after interview.

## Auto-Decision Rationale

| Signal | Value | Result |
|---|---|---|
| Task files | 3 | 3-4 → Validate only |
| Security keywords | none | no Red Team |
| `design_context.validation_recommended` | `false` | no Red Team |
| Risk keywords | `batch`, `fefo`, `purchase`, `sales` | none escalate |
| `ready_for_implementation` (pre) | `true` | needs closure of validation gate |

## Questions & Answers

1. **[Trade-off / Architecture]** FEFO tie-breaker khi `expiresAt` null?
   - Options: Giữ `createdAt+id` | Thêm `unitCost` ASC | Thêm `receivedAt`
   - **Answer:** Giữ nguyên `createdAt + id` (Recommended).
   - **Custom input:** —
   - **Rationale:** Đã khớp `design.md` §FEFO policy, deterministic, không phá moving-average cost chain. `unitCost` tie-breaker sẽ đẩy giá vốn moving-average theo batch rẻ trước — out of scope và cần requirement mới.

2. **[Risk / UX]** Concurrent oversell mitigation scope?
   - Options: Backend-only reject | Thêm realtime refresh spec
   - **Answer:** Backend-only reject (Recommended).
   - **Rationale:** `scope_lock.out_of_scope` đã ghi `"Frontend screens"`. `fefo-allocator.ts` đã dùng conditional `updateMany` (`qtyOnHand: { gte: qty }`) + throw `P2034` khi race. Frontend race warning thuộc spec khác.

3. **[Process / Next step]** Close validation hay thêm session?
   - Options: Close → /hapo:develop | Thêm session | Pause
   - **Answer:** Close validation → /hapo:develop (Recommended).
   - **Rationale:** Validator PASS, code đã wiring xong từ pull `9a9035c` (`fefo-allocator.ts`, `sales.service.ts:allocateFefo` x2, `purchases.service.ts:completeInTransaction` create/reuse batch). Không cần thêm session.

## Confirmed Decisions

- FEFO ordering: `expiresAt ASC NULLS LAST`, tie-break `createdAt ASC, id ASC`. Đã khớp code, không sửa.
- Oversell mitigation: backend `updateMany` + `P2034`, không thêm frontend toast. Đã khớp code.
- Validation gate close: `validation.status = completed`, `ready_for_implementation` đã `true`, chuyển `/hapo:develop`.

## Action Items

- [x] Run validator (PASS).
- [x] Collect answers (3/3 confirmed).
- [x] Reconciliation audit.
- [ ] Sync `spec.json` (validation.status, timestamps, updated_at).

## Impact on Tasks

- Task `R0-01`: không thay đổi (code đã đúng spec).
- Task `R1-01`: không thay đổi (code đã đúng spec).
- Task `R1-02`: không thay đổi (verification step).
- Không task nào cần propagate change vì cả 3 câu trả lời đều "giữ nguyên / không thêm".

## Reconciliation Audit

- ✅ `spec.json` ↔ filesystem đồng bộ (3 task files match).
- ✅ `design.md` §FEFO policy khớp `fefo-allocator.ts:32-39` (expiresAt ASC, createdAt ASC, id ASC).
- ✅ Validator exit 0 (Layer 1).
- ✅ Task naming convention `task-R{N}-{SEQ}-<slug>.md` đúng.
- ✅ Không có stale provider strings.
- ✅ Không có delete-data/privacy policy conflict.
- ✅ `spec.json.updated_at` cần stamp sau khi sync.
