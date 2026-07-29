-- ============================================================
-- QUICK SALE DRAFT (multi-device sync via SSE)
-- ============================================================
-- Persistent POS counter draft kept on the server. One row per active desktop
-- session; phone joiners receive cart changes through SSE. All mutations
-- carry an idempotency key (see `quick_sale_draft_mutation`).

-- Enum: extend AuditAction vocabulary for the new event sources.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'QUICK_SALE_DRAFT_CREATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'QUICK_SALE_DRAFT_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'QUICK_SALE_DRAFT_CLOSE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'QUICK_SALE_DRAFT_CHECKOUT';

CREATE TABLE "quick_sale_draft" (
    "id"              TEXT NOT NULL,
    "tenantId"        TEXT NOT NULL,
    "ownerUserId"     TEXT NOT NULL,
    "joinToken"       TEXT NOT NULL,
    "customerId"      TEXT,
    "handbookMeta"    JSONB,
    "warehouseId"     TEXT,
    "lastTouchedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"       TIMESTAMP(3) NOT NULL,
    "closedAt"        TIMESTAMP(3),
    "closedByUserId"  TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_sale_draft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quick_sale_draft_line" (
    "id"                  TEXT NOT NULL,
    "tenantId"            TEXT NOT NULL,
    "draftId"             TEXT NOT NULL,
    "productId"           TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "unitId"              TEXT NOT NULL,
    "unitNameSnapshot"    TEXT NOT NULL,
    "qty"                 DECIMAL(18, 6) NOT NULL,
    "unitPrice"           BIGINT NOT NULL,
    "addedByUserId"       TEXT,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_sale_draft_line_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quick_sale_draft_mutation" (
    "id"             TEXT NOT NULL,
    "tenantId"       TEXT NOT NULL,
    "draftId"        TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "kind"           TEXT NOT NULL,
    "responseJson"   JSONB NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quick_sale_draft_mutation_pkey" PRIMARY KEY ("id")
);

-- Unique indexes.
CREATE UNIQUE INDEX "quick_sale_draft_tenantId_joinToken_key"
    ON "quick_sale_draft" ("tenantId", "joinToken");

CREATE UNIQUE INDEX "quick_sale_draft_line_draftId_productId_key"
    ON "quick_sale_draft_line" ("draftId", "productId");

CREATE UNIQUE INDEX "quick_sale_draft_mutation_draftId_idempotencyKey_key"
    ON "quick_sale_draft_mutation" ("draftId", "idempotencyKey");

-- Lookup indexes.
CREATE INDEX "quick_sale_draft_tenantId_ownerUserId_closedAt_idx"
    ON "quick_sale_draft" ("tenantId", "ownerUserId", "closedAt");

CREATE INDEX "quick_sale_draft_tenantId_expiresAt_idx"
    ON "quick_sale_draft" ("tenantId", "expiresAt");

CREATE INDEX "quick_sale_draft_line_tenantId_draftId_idx"
    ON "quick_sale_draft_line" ("tenantId", "draftId");

CREATE INDEX "quick_sale_draft_mutation_tenantId_draftId_createdAt_idx"
    ON "quick_sale_draft_mutation" ("tenantId", "draftId", "createdAt");

-- Foreign keys.
ALTER TABLE "quick_sale_draft"
    ADD CONSTRAINT "quick_sale_draft_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE;

ALTER TABLE "quick_sale_draft"
    ADD CONSTRAINT "quick_sale_draft_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE CASCADE;

ALTER TABLE "quick_sale_draft"
    ADD CONSTRAINT "quick_sale_draft_closedByUserId_fkey"
    FOREIGN KEY ("closedByUserId") REFERENCES "user"("id") ON DELETE SET NULL;

ALTER TABLE "quick_sale_draft_line"
    ADD CONSTRAINT "quick_sale_draft_line_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE;

ALTER TABLE "quick_sale_draft_line"
    ADD CONSTRAINT "quick_sale_draft_line_draftId_fkey"
    FOREIGN KEY ("draftId") REFERENCES "quick_sale_draft"("id") ON DELETE CASCADE;

ALTER TABLE "quick_sale_draft_line"
    ADD CONSTRAINT "quick_sale_draft_line_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT;

ALTER TABLE "quick_sale_draft_line"
    ADD CONSTRAINT "quick_sale_draft_line_addedByUserId_fkey"
    FOREIGN KEY ("addedByUserId") REFERENCES "user"("id") ON DELETE SET NULL;

ALTER TABLE "quick_sale_draft_mutation"
    ADD CONSTRAINT "quick_sale_draft_mutation_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE;

ALTER TABLE "quick_sale_draft_mutation"
    ADD CONSTRAINT "quick_sale_draft_mutation_draftId_fkey"
    FOREIGN KEY ("draftId") REFERENCES "quick_sale_draft"("id") ON DELETE CASCADE;
