# Design — Core operational reports

## Backend

Add a read-only ReportsModule with one service and controller. Stock summary reads Stock with
Product and ProductBatch data; sales summary reads completed Sale aggregates and SaleLine product
snapshots. No writes or new persistence. All filters are tenant-scoped and date ranges are bounded
by DTO validation.

### Business group filter & breakdown (R7)

- Query DTO: optional `businessGroup` validated with `@IsEnum(BusinessGroup)` on
  `ReportStockQueryDto` / `ReportDateQueryDto`.
- Taxonomy source of truth: `BusinessGroup` Prisma enum + `BUSINESS_GROUP_CATALOG` in
  `product-contract.ts` (five Phase-1 groups only).
- Stock: `where.product.businessGroup = filter` when set; response includes
  `filter.businessGroup`, `byBusinessGroup[]` `{ businessGroup, label, itemCount, qty }`, `items`.
- Sales: filter sale lines via `product.businessGroup`; sale aggregate uses `lines.some` when
  filtered (order-level totals may include multi-group orders that contain a matching line).
  Response adds `byBusinessGroup[]` `{ businessGroup, label, lineCount, qtyBase, total }`.
- Labels for known groups come from `BUSINESS_GROUP_CATALOG`; null product group → `UNGROUPED` /
  "Chưa gán nhóm".

## Frontend UI shell (R4–R6, R8)

### Routes & nav

- App route: `frontend/app/(app)/bao-cao/page.tsx` under existing `(app)` layout.
- Reuse nav/dashboard links to `/bao-cao`.

### Data access

- Typed client `frontend/lib/tenant-reports-api.ts` via `userFetch`.
- `GET /tenant/reports/stock-summary?businessGroup=` — inventory:view + inventory.
- `GET /tenant/reports/sales-summary?from=&to=&businessGroup=` — sales:view + advanced_mode.
- Client mirrors range rules; `REPORT_BUSINESS_GROUPS` mirrors catalog labels.

### UI composition

- Header filter select: Tất cả + 5 groups; changing filter reloads stock + sales.
- Sales: date range, KPIs, `byBusinessGroup` list, top products.
- Stock: `byBusinessGroup` chips/list + product rows.
- States: skeleton / `role="alert"` + retry / empty copy.
- No charts, export, profit/tax, aquaculture groups.

### Permissions UX

- API 403/feature denial → mapped error; shell stays visible.
