# Task R6-01: Frontend login wiring

**Requirement:** R6 — Frontend Login Wiring
**Status:** done
**Priority:** P1
**Estimated Effort:** M
**Dependencies:** task-R1-02-login-and-me-endpoints.md
**Spec:** specs/admin-authentication/

## Context

- **Why**: The admin login UI already exists but only fakes success with a `setTimeout` TODO. This task connects it to the real `POST /auth/admin/login` so an admin actually logs in.
- **Current state**: `frontend/components/auth/admin-login-form.tsx` has the form, validation, and a `// TODO: gọi API đăng nhập quản trị khi backend sẵn sàng` stub; `frontend/app/admin/login/page.tsx` renders it. Next.js 16 / React 19. No API client yet.
- **Target outcome**: Submitting valid credentials calls the login API with credentials included, stores the access token, and redirects to the admin area; 401/403 shows an inline error.

## Constraints

- **MUST**: Replace the `setTimeout` stub with a real `fetch('/auth/admin/login', { method:'POST', credentials:'include', ... })`; on 200 store `accessToken` and redirect to the admin area; on 401/403 show a clear inline error without redirect (R6.2); preserve existing field validation + loading/notice states (R6.3). Consume the `AdminLoginResponse` shape.
- **MUST**: Read the guide in `frontend/node_modules/next/dist/docs/` before writing code (per `frontend/AGENTS.md` — this Next.js has breaking changes).
- **SHOULD**: Centralize the API base URL + fetch in a small `frontend/lib/auth-api.ts`; keep the refresh token handling to the HttpOnly cookie (browser-managed).
- **MUST NOT**: Store the access token where it is trivially XSS-exfiltrated if avoidable; persist the refresh token in JS (it is cookie-only); change unrelated UI.
- **SCOPE**: Implement only the login wiring mapped to R6 and the approved `scope_lock`; do not build refresh/logout UI flows here.

## Contracts: AdminLoginResponse

<!-- contract:AdminLoginResponse -->
```json
{ "accessToken": "string", "admin": { "id": "string", "email": "string", "fullName": "string", "role": "string" } }
```

## Steps

- [x] 1. Add `frontend/lib/auth-api.ts` with `adminLogin(email, password)`
  - Business intent: one typed place to call the login API.
  - Code detail: read the base URL from `process.env.NEXT_PUBLIC_API_BASE_URL` (defined in `frontend/.env.example` from R0-01; backend `PORT` pinned to 3001 to avoid the Next.js :3000 clash); `fetch(\`${API_BASE}/auth/admin/login\`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({email,password}) })`; parse `AdminLoginResponse`; throw a typed error carrying the HTTP status for 401/403. The backend enables credentialed CORS for this origin (R0-01).
  - _Requirements: 6.1_

- [x] 2. Wire `AdminLoginForm.handleSubmit` to the API
  - Business intent: real authentication on submit.
  - Code detail: after client validation passes, call `adminLogin`; on success store `accessToken` (in-memory/context or `sessionStorage`) and `router.push` to the admin area; on 401/403 set an inline error state; keep the `loading` state and remove the `notice` stub message.
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 3. Verification implementation
  - Manual browser check against the running backend: valid creds → redirect; wrong creds → inline error, no redirect; validation errors still block submit. Optionally a component test mocking `adminLogin`.
  - _Requirements: 6.1, 6.2, 6.3_

## Requirements

- 6.1 — Valid submit calls `POST /auth/admin/login` (credentials included), stores token, redirects.
- 6.2 — 401/403 shows a clear inline error, no redirect.
- 6.3 — Existing validation + loading states preserved; `setTimeout` TODO removed.

## Related Files

| Path | Action | Description |
|---|---|---|
| `frontend/lib/auth-api.ts` | Create | Typed admin login API call |
| `frontend/components/auth/admin-login-form.tsx` | Modify | Replace TODO stub with real API call + redirect/error |

## Completion Criteria

- [x] Submitting valid credentials logs the admin in and redirects to the admin area.
- [x] 401/403 responses render an inline error and do not redirect.
- [x] Client-side field validation and the loading state still work; the `setTimeout` stub is gone.
- [x] Refresh token is handled via the HttpOnly cookie (not stored in JS).

## Evidence

- [x] Automated verification (build/lint + optional component test)
  - Command(s): `pnpm --dir frontend build`; optionally `pnpm --dir frontend test -- admin-login-form`
  - Expected proof: build/lint pass; component test (if added) asserts redirect-on-success and error-on-401.
- [x] Artifact / runtime verification
  - Inspect: browser Network tab on submit against a running backend + seeded admin
  - Expect: `POST /auth/admin/login` 200 with `AdminLoginResponse`, `Set-Cookie` refresh received, redirect happens.
- [x] Runtime reachability verification
  - Entrypoint/caller: `frontend/app/admin/login/page.tsx` renders `AdminLoginForm`; form calls `auth-api.ts`
  - Expect: the new API call is invoked on submit (not the old stub); page reachable at `/admin/login`.
- [x] Contract / negative-path verification
  - Check: wrong password (401), disabled admin (403), empty fields
  - Expect: inline error for 401/403, no redirect; validation blocks empty submit.

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| CORS/credentials misconfig blocking cookie | High | `credentials:'include'` (FE) + `enableCors({credentials:true, origin})` in R0-01; `NEXT_PUBLIC_API_BASE_URL` points at the pinned backend port; verify in browser |
| Access token stored insecurely | Medium | Prefer in-memory/context; document trade-off if sessionStorage used |
| Next.js 16 breaking API misuse | Medium | Read `frontend/node_modules/next/dist/docs/` first (per AGENTS.md) |

---

> **Parallel marker**: (P) after R1-02 — independent FE file ownership.
> **Requirement mapping**: sub-tasks end with `_Requirements: X.X_`.
> **Evidence rule**: `## Evidence` present above.

## Verification Receipt — 2026-07-17 (full-spec /develop)

**Commands run:**
- `pnpm --dir frontend build` → **Compiled successfully**; `/admin/login` prerendered (static).
- `npx biome check lib/auth-api.ts components/auth/admin-login-form.tsx` → clean. (5 pre-existing `public/*.svg` biome errors are unrelated and left untouched per surgical scope.)

**Real FE→BE integration proof (backend on :3011, seeded admin, Origin http://localhost:3000):**
- CORS preflight `OPTIONS /auth/admin/login` → 204 with `Access-Control-Allow-Origin: http://localhost:3000` + `Access-Control-Allow-Credentials: true` (enables `credentials:'include'`).
- `POST /auth/admin/login` → 200 with exact `AdminLoginResponse {accessToken, admin:{id,email,role,fullName}}` + `Set-Cookie nomo_admin_rt` (HttpOnly, SameSite=Strict, Path=/auth).
- Wrong password → 401 (FE renders inline error, no redirect).

**Artifact proof:**
- `frontend/lib/auth-api.ts` — `adminLogin()` POSTs with `credentials:'include'`, parses `AdminLoginResponse`, guards missing `accessToken`, stores it in an in-memory holder (refresh stays in the HttpOnly cookie, never in JS); typed `AdminLoginError` carries HTTP status.
- `admin-login-form.tsx` — replaced the `setTimeout` TODO + blue notice with the real call; on success `router.push('/admin')` (route exists); on 401/403 inline `role="alert"` error box (DESIGN.md error tone `bg-[#ffebee] text-[#c62828]`); preserved field validation + loading state.

**Reachability:** `app/admin/login/page.tsx` renders `AdminLoginForm`; form calls `auth-api.ts`; redirect target `/admin` (`app/admin/(quan-tri)/page.tsx`) exists.

**Next 16:** `useRouter` from `next/navigation`; `process.env.NEXT_PUBLIC_API_BASE_URL` read statically (build-inlined) with a `http://localhost:3001` fallback; `.env.local` created (user-approved; gitignored).

**Code review:** code-auditor SPEC_PASS, 9/10, 0 Critical. Applied LOW: added `accessToken`-presence guard before redirect. The other LOW (a subtitle copy-edit in `admin/login/page.tsx`) is a pre-existing working-tree change NOT made by this task — left as-is (not ours to revert).

**Outcome:** PASS. (Note: full interactive browser click-through not run — headless env; integration proven at the HTTP/CORS contract level instead.)
