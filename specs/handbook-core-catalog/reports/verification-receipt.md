# Verification receipt — handbook-core-catalog

**Date:** 2026-07-23T11:20:01+07:00

## Commands

```bash
pnpm --dir frontend test -- lib/handbook.test.ts
# 59 FE tests (suite) exit 0

pnpm --dir backend test --runInBand --runTestsByPath \
  src/platform/handbook/handbook-category.spec.ts \
  src/platform/handbook/handbook.service.spec.ts
# 8 passed

pnpm --dir backend build  # exit 0
pnpm --dir backend exec prisma validate  # exit 0
```

## Surfaces

- FE: `HANDBOOK_CATEGORY_CATALOG`, list/form/card/detail
- BE: `HandbookModule` → `/tenant/handbook`
- DB: `HandbookCategory` + `Disease.handbookCategory` + migration SQL

## Out of scope (not claimed)

Product groups, FEFO, stock adjust, returns, e2e HTTP suite with live DB.
