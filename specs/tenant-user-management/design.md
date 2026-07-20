# Design — tenant-user-management

## Runtime flow

```text
UserAuthGuard → /thiet-lap/nhan-vien → UserFetch → /tenant/users
                                  ↓
                    TenantAccessTokenGuard
                    TenantPermissionGuard
                                  ↓
                 TenantUsersService + Prisma tx
                                  ↓
             seat check + role boundary + audit
```

## API contract

- `GET /tenant/users?page&pageSize` → `{ items, page, pageSize, total, seatUsage }`; requires `user:view`.
- `POST /tenant/users` → `{ user, generatedPassword }`; requires `user:create` and serializable seat check.
- `PATCH /tenant/users/:userId` → public user; requires `user:edit`.
- `PATCH /tenant/users/:userId/role` → public user; requires `user:edit` plus service role boundary.
- `POST /tenant/users/:userId/deactivate` → public user; requires `user:edit` plus last-owner guard.
- `POST /tenant/users/:userId/reactivate` → public user; requires `user:edit` plus seat check.
- `POST /tenant/users/:userId/reset-password` → `{ generatedPassword }`; requires `user:edit`; force `mustChangePassword`.

All endpoints derive `tenantId` and actor from the verified bearer identity. No tenant ID is accepted from the client.

## Authorization matrix

| Action | Owner | Manager | Staff |
|---|---:|---:|---:|
| View users/seat | yes | yes | no |
| Create Staff/Manager | yes | yes | no |
| Create/promote Owner | yes | no | no |
| Edit Staff/Manager | yes | yes | no |
| Edit/demote Owner | yes, subject to last-owner rule | no | no |
| Deactivate/reactivate/reset | yes | yes, excluding Owner | no |

The service must compare actor and target role from the current database state. JWT permissions alone are insufficient for owner-protection rules.

## Seat invariant

```text
activeCount = count(User where tenantId=current and status=ACTIVE and deletedAt=null)
effectiveMaxUsers = activePlan.maxUsers + tenant.seatBonus
create/reactivate allowed iff activeCount < effectiveMaxUsers
```

If no active plan exists, preserve the current service contract (`maxUsers=0`) and return `SEAT_LIMIT_REACHED`; do not invent a tenant-side fallback quota.

## Frontend

- Add `frontend/lib/tenant-users-api.ts` using `userFetch`.
- Add `/thiet-lap/nhan-vien/page.tsx` and a focused component under `frontend/components/app/settings/`.
- Read `user`, `accessToken`, and `permissions` from `useUserAuth`; show the route only for `user:view`.
- Use large mobile-first controls from `DESIGN.md`, dialog/sheet forms, explicit confirmation for deactivate, and one-time generated-password reveal.
- Do not store generated passwords or introduce a second auth store.

## Data and audit

The public response never contains passwordHash or plaintext passwords except the one-time generated-password response. Audit payloads contain actor/target/tenant/role/status metadata only. Additive enum/migration values are `USER_UPDATE`, `USER_ROLE_CHANGE`, `USER_DEACTIVATE`, `USER_REACTIVATE`, and `USER_RESET_PASSWORD` if absent; `USER_CREATE` is reused. Existing admin endpoint and panel remain unchanged.

## Unresolved Questions

- If existing `AuditAction` lacks a compatible tenant-user update/reset action, add only the listed minimal enum/migration entries required by the current audit contract.
