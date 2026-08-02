-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_baseUnitId_fkey";

-- DropForeignKey
ALTER TABLE "quick_sale_draft" DROP CONSTRAINT "quick_sale_draft_closedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "quick_sale_draft" DROP CONSTRAINT "quick_sale_draft_ownerUserId_fkey";

-- DropForeignKey
ALTER TABLE "quick_sale_draft" DROP CONSTRAINT "quick_sale_draft_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "quick_sale_draft_line" DROP CONSTRAINT "quick_sale_draft_line_addedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "quick_sale_draft_line" DROP CONSTRAINT "quick_sale_draft_line_draftId_fkey";

-- DropForeignKey
ALTER TABLE "quick_sale_draft_line" DROP CONSTRAINT "quick_sale_draft_line_productId_fkey";

-- DropForeignKey
ALTER TABLE "quick_sale_draft_line" DROP CONSTRAINT "quick_sale_draft_line_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "quick_sale_draft_mutation" DROP CONSTRAINT "quick_sale_draft_mutation_draftId_fkey";

-- DropForeignKey
ALTER TABLE "quick_sale_draft_mutation" DROP CONSTRAINT "quick_sale_draft_mutation_tenantId_fkey";

-- CreateTable
CREATE TABLE "admin_notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notification_read" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notification_read_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_notification_createdAt_idx" ON "admin_notification"("createdAt");

-- CreateIndex
CREATE INDEX "admin_notification_read_adminId_readAt_idx" ON "admin_notification_read"("adminId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "admin_notification_read_notificationId_adminId_key" ON "admin_notification_read"("notificationId", "adminId");

-- AddForeignKey
ALTER TABLE "admin_notification_read" ADD CONSTRAINT "admin_notification_read_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "admin_notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notification_read" ADD CONSTRAINT "admin_notification_read_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "platform_admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_sale_draft" ADD CONSTRAINT "quick_sale_draft_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_sale_draft" ADD CONSTRAINT "quick_sale_draft_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_sale_draft" ADD CONSTRAINT "quick_sale_draft_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_sale_draft_line" ADD CONSTRAINT "quick_sale_draft_line_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "quick_sale_draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_sale_draft_line" ADD CONSTRAINT "quick_sale_draft_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_sale_draft_line" ADD CONSTRAINT "quick_sale_draft_line_addedByUserId_fkey" FOREIGN KEY ("addedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_sale_draft_mutation" ADD CONSTRAINT "quick_sale_draft_mutation_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "quick_sale_draft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
