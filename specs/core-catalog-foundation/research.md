# Research: Core Catalog Foundation

## Evidence Summary

- `docs/audit-core-business-catalog-2026-07-22.md` shows that `ProductKind` exists but lacks the five-group taxonomy, tenant-enabled groups, DTO exposure, and per-kind validation.
- `backend/prisma/schema.prisma` already contains `Product.productKind`, `Product.attrs`, product batches, and tenant-scoped retail models, so this tranche can be additive.
- `backend/src/platform/products/dto/create-product.dto.ts` and `products.service.ts` currently accept only common product fields; this is the primary runtime seam.
- The audit explicitly defers aquaculture, FEFO, purchase receiving, sales allocation, and Handbook runtime to later phases.

## Decisions

1. Add a stable `BusinessGroup` field instead of overloading `AgriDomain` or mutable `Category`.
2. Add `SEED` and `SEEDLING` while preserving `CROP_SEED` for backward compatibility; fallback is deterministic and never guesses a new group.
3. Store tenant capabilities as a relation-like JSON setting only if the existing TenantSettings shape supports it; otherwise use a dedicated tenant-scoped table. The implementation task must follow the current Prisma conventions and migration safety.
