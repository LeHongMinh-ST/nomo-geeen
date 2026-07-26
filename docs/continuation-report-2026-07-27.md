# Báo cáo tiếp nối — 2026-07-27

## Trạng thái đã chốt

### `main`

- Đã có các commit tính năng: `ca79ecc` và merge `de3c529` — bật/tắt nhóm kinh doanh.
- Đã có commit trước đó cho supplier province/type + `PurchaseLine.manufacturedAt`: `728d74e` và merge `ce99a29`.
- Đã cập nhật `docs/project-changelog.md` và `docs/system-architecture.md`.
- Không commit `.playwright-cli/console-2026-07-21T15-03-42-702Z.log`; đây là log runtime cục bộ.

### `feat/expiry-tiers`

- Worktree: `/Users/minhlh.st/code/nomo-green-g`.
- Đã có 2 commit:
  - `ecb38a3 feat(inventory): tiered expiry warnings at 180/90/30 days`
  - `a25ec33 refactor(inventory): render server expiry tiers instead of browser dates`
- Worktree đã sạch khi kiểm tra.
- Phạm vi: expiry policy/controller/service backend, API client tenant inventory, inventory list/card/detail và test tương ứng.

## Kiểm chứng hiện có

- Seed handbook/demo và API quick-suggestions đã được Claude kiểm tra pass.
- Expiry branch đã có backend/frontend test trong hai commit; cần chạy lại khi tiếp tục trên máy khác.
- Các Claude đã được dừng/idle; không tiếp tục mở feature mới.

## Việc tiếp tục ngày mai

1. Chạy `git status --short` và `git log --oneline -8` ở cả `/Users/minhlh.st/code/nomo-green` và `/Users/minhlh.st/code/nomo-green-g`.
2. Chạy test/build theo task expiry; nếu pass thì giữ branch hoặc merge vào `main` theo quyết định release.
3. Tiếp tục catalog theo thứ tự: M4 livestock → M5 dashboard → M6 customer profile → M7 reports kind.
4. Chốt drift `SupplierType`: schema repo đang khai text nhưng DB dùng enum ngoài migration; cần quyết định và migration riêng.
5. Còn các việc handbook chưa chốt: commit test/seed nếu cần, bổ sung SKU thú y, và catch ở `handbook-quick-panel.tsx:141`.

## Blocker / lưu ý

- DB dev dùng chung có drift enum `SupplierType`; không tự sửa schema/migration trong phiên này.
- Chuỗi migration từ DB trắng chưa replay được theo ghi nhận trước đó.
- `docs/.sync_hash` được chốt theo yêu cầu phiên là `ca79ecc202088b72898833f28573f0c4381a9338`.
