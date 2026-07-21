-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('HOUSEHOLD', 'RETAIL_DEALER', 'COOPERATIVE', 'DISTRIBUTOR', 'FARM');

-- CreateEnum
CREATE TYPE "TenantMode" AS ENUM ('SIMPLE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'LOCKED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'QR', 'MIXED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PlatformAdminRole" AS ENUM ('SUPER_ADMIN', 'SALER', 'SUPPORT', 'BILLING');

-- CreateEnum
CREATE TYPE "CreatedByType" AS ENUM ('PLATFORM_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "PlatformAdminStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "AnnouncementSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL_TENANTS', 'SPECIFIC_TENANT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('PLATFORM_ADMIN', 'USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ADMIN_CREATE', 'ADMIN_UPDATE', 'ADMIN_DEACTIVATE', 'ADMIN_REACTIVATE', 'ADMIN_RESET_PASSWORD', 'ADMIN_ROLE_ASSIGN', 'ADMIN_ROLE_REVOKE', 'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE', 'ROLE_PERMISSION_GRANT', 'ROLE_PERMISSION_REVOKE', 'LOGIN', 'LOGOUT', 'REFRESH_REUSE_DETECTED', 'TENANT_UPDATE', 'TENANT_STATUS_CHANGE', 'TENANT_EXPORT', 'TENANT_CREATE', 'USER_CREATE', 'USER_UPDATE', 'USER_ROLE_CHANGE', 'USER_DEACTIVATE', 'USER_REACTIVATE', 'USER_RESET_PASSWORD', 'PLAN_CREATE', 'PLAN_UPDATE', 'PLAN_ACTIVATE', 'PLAN_DEACTIVATE', 'SUBSCRIPTION_ASSIGN', 'SUBSCRIPTION_CHANGE', 'SUBSCRIPTION_RENEW', 'SUBSCRIPTION_CANCEL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEBT_DUE', 'LOW_STOCK', 'NEAR_EXPIRED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "StoredFilePurpose" AS ENUM ('LOGO', 'PRODUCT_IMAGE', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "AuthorType" AS ENUM ('PLATFORM_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "AgriDomain" AS ENUM ('CROP', 'LIVESTOCK', 'AQUACULTURE', 'GENERAL');

-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('PESTICIDE', 'FERTILIZER', 'AGRI_MATERIAL', 'CROP_SEED', 'VET_DRUG', 'ANIMAL_FEED', 'LIVESTOCK_SEED', 'AQUA_DRUG', 'AQUA_FEED', 'AQUA_SEED', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ConversionKind" AS ENUM ('PURCHASE', 'SALE', 'BOTH');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('SALE', 'PURCHASE', 'SALE_RETURN', 'PURCHASE_RETURN', 'RECEIPT', 'PAYMENT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SaleChannel" AS ENUM ('QUICK_SALE', 'ORDER');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('CUSTOM', 'TIER', 'RETAIL', 'MANUAL');

-- CreateEnum
CREATE TYPE "StockDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "StockReason" AS ENUM ('PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "DebtPartyType" AS ENUM ('CUSTOMER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "DebtEntryType" AS ENUM ('OPENING', 'SALE', 'PURCHASE', 'RECEIPT', 'PAYMENT', 'ADJUST');

-- CreateEnum
CREATE TYPE "DebtDirection" AS ENUM ('INCREASE', 'DECREASE');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('RECEIPT', 'PAYMENT');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'FARMER', 'FARM', 'AGENT');

-- CreateEnum
CREATE TYPE "DiseaseType" AS ENUM ('DISEASE', 'PEST', 'WEED', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsultFieldType" AS ENUM ('NUMBER', 'TEXT', 'SELECT', 'MULTI', 'DATE');

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tenantType" "TenantType" NOT NULL DEFAULT 'HOUSEHOLD',
    "mode" "TenantMode" NOT NULL DEFAULT 'SIMPLE',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "logoUrl" TEXT,
    "seatBonus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" BIGINT NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "maxUsers" INTEGER NOT NULL,
    "maxWarehouses" INTEGER NOT NULL DEFAULT 1,
    "maxProducts" INTEGER,
    "maxCustomers" INTEGER,
    "maxOrdersPerMonth" INTEGER,
    "maxStorageBytes" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_feature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,

    CONSTRAINT "plan_feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "manualReference" VARCHAR(200),
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "PlatformAdminRole" NOT NULL DEFAULT 'SUPPORT',
    "status" "PlatformAdminStatus" NOT NULL DEFAULT 'ACTIVE',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_role_assignment" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "admin_role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" "AnnouncementSeverity" NOT NULL DEFAULT 'INFO',
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL_TENANTS',
    "targetTenantId" TEXT,
    "createdById" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "createdById" TEXT,
    "assignedToId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_message" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorType" "AuthorType" NOT NULL,
    "authorAdminId" TEXT,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "fullName" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByType" "CreatedByType",
    "createdById" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "group" TEXT,
    "label" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_feature_flag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_feature_flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorType" "AuditActorType" NOT NULL DEFAULT 'USER',
    "actorId" TEXT,
    "actorRoleCode" TEXT,
    "action" "AuditAction" NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_file" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "purpose" "StoredFilePurpose" NOT NULL DEFAULT 'ATTACHMENT',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "stored_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT 'DEFAULT',
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "docType" "DocumentType" NOT NULL,
    "prefix" TEXT,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" "AgriDomain",
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "nameSearch" TEXT,
    "categoryId" TEXT,
    "brandId" TEXT,
    "manufacturerId" TEXT,
    "defaultSupplierId" TEXT,
    "baseUnitId" TEXT NOT NULL,
    "domain" "AgriDomain",
    "productKind" "ProductKind" NOT NULL DEFAULT 'OTHER',
    "packSize" TEXT,
    "netContent" DECIMAL(18,6),
    "netContentUnit" TEXT,
    "registrationNo" TEXT,
    "shortDesc" TEXT,
    "activeIngredient" TEXT,
    "concentration" TEXT,
    "applyTargets" JSONB,
    "pestTags" JSONB,
    "attrs" JSONB,
    "costPrice" BIGINT NOT NULL DEFAULT 0,
    "salePrice" BIGINT NOT NULL DEFAULT 0,
    "wholesalePrice" BIGINT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isRecalled" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_quota_counter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "used" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_quota_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_unit_conversion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "factorToBase" DECIMAL(18,6) NOT NULL,
    "kind" "ConversionKind" NOT NULL DEFAULT 'BOTH',

    CONSTRAINT "product_unit_conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price_tier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "minQty" DECIMAL(18,6) NOT NULL,
    "maxQty" DECIMAL(18,6),
    "price" BIGINT NOT NULL,

    CONSTRAINT "product_price_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_product_price" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "price" BIGINT NOT NULL,

    CONSTRAINT "customer_product_price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_batch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "manufacturedAt" DATE,
    "expiresAt" DATE,
    "isRecalled" BOOLEAN NOT NULL DEFAULT false,
    "qtyOnHand" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "avgCost" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "direction" "StockDirection" NOT NULL,
    "qty" DECIMAL(18,6) NOT NULL,
    "unitCost" BIGINT,
    "reason" "StockReason" NOT NULL,
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "refLineId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_adjustment_line" (
    "id" TEXT NOT NULL,
    "adjustmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "batchId" TEXT,
    "qtyBefore" DECIMAL(18,6) NOT NULL,
    "qtyAfter" DECIMAL(18,6) NOT NULL,
    "delta" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "stock_adjustment_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "supplierId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" BIGINT NOT NULL DEFAULT 0,
    "discountAmount" BIGINT NOT NULL DEFAULT 0,
    "taxAmount" BIGINT NOT NULL DEFAULT 0,
    "shippingFee" BIGINT NOT NULL DEFAULT 0,
    "total" BIGINT NOT NULL DEFAULT 0,
    "amountPaid" BIGINT NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "debtAmount" BIGINT NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_line" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "qty" DECIMAL(18,6) NOT NULL,
    "qtyBase" DECIMAL(18,6) NOT NULL,
    "unitPrice" BIGINT NOT NULL,
    "lineDiscount" BIGINT NOT NULL DEFAULT 0,
    "lineTotal" BIGINT NOT NULL,
    "batchCode" TEXT,
    "expiresAt" DATE,
    "batchId" TEXT,

    CONSTRAINT "purchase_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "channel" "SaleChannel" NOT NULL DEFAULT 'QUICK_SALE',
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "customerId" TEXT,
    "customerNameSnapshot" TEXT,
    "customerPhoneSnapshot" TEXT,
    "warehouseId" TEXT NOT NULL,
    "subtotal" BIGINT NOT NULL DEFAULT 0,
    "discountAmount" BIGINT NOT NULL DEFAULT 0,
    "taxAmount" BIGINT NOT NULL DEFAULT 0,
    "total" BIGINT NOT NULL DEFAULT 0,
    "amountPaid" BIGINT NOT NULL DEFAULT 0,
    "changeAmount" BIGINT NOT NULL DEFAULT 0,
    "debtAmount" BIGINT NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod",
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diseaseId" TEXT,
    "diseaseNameSnapshot" TEXT,
    "consultContext" JSONB,
    "suggestedQtyMeta" JSONB,
    "idempotencyKey" TEXT,
    "createdBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_line" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "qty" DECIMAL(18,6) NOT NULL,
    "qtyBase" DECIMAL(18,6) NOT NULL,
    "unitPrice" BIGINT NOT NULL,
    "priceSource" "PriceSource",
    "lineDiscount" BIGINT NOT NULL DEFAULT 0,
    "lineTotal" BIGINT NOT NULL,
    "unitCost" BIGINT NOT NULL DEFAULT 0,
    "batchId" TEXT,

    CONSTRAINT "sale_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_line_batch" (
    "id" TEXT NOT NULL,
    "saleLineId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "qtyBase" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "sale_line_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_return" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "originalSaleId" TEXT,
    "customerId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "total" BIGINT NOT NULL DEFAULT 0,
    "debtAdjust" BIGINT NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_return_line" (
    "id" TEXT NOT NULL,
    "salesReturnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qtyBase" DECIMAL(18,6) NOT NULL,
    "lineTotal" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "sales_return_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "nameSearch" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "type" "CustomerType",
    "productionProfile" JSONB,
    "debtLimit" BIGINT,
    "openingBalance" BIGINT NOT NULL DEFAULT 0,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "note" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "supplierType" TEXT,
    "contactName" TEXT,
    "contactTitle" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxCode" TEXT,
    "discountPercent" DECIMAL(8,4),
    "debtLimit" BIGINT,
    "paymentTerms" TEXT,
    "openingBalance" BIGINT NOT NULL DEFAULT 0,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_ledger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyType" "DebtPartyType" NOT NULL,
    "partyId" TEXT NOT NULL,
    "entryType" "DebtEntryType" NOT NULL,
    "direction" "DebtDirection" NOT NULL,
    "amount" BIGINT NOT NULL,
    "balanceAfter" BIGINT,
    "refType" TEXT,
    "refId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_voucher" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "docNo" TEXT NOT NULL,
    "voucherType" "VoucherType" NOT NULL,
    "partyType" "DebtPartyType" NOT NULL,
    "partyId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "refSaleId" TEXT,
    "refPurchaseId" TEXT,
    "customerId" TEXT,
    "supplierId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_voucher_line" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" BIGINT NOT NULL,
    "refSaleId" TEXT,
    "refPurchaseId" TEXT,

    CONSTRAINT "payment_voucher_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disease" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameSearch" TEXT,
    "aliases" JSONB,
    "aliasesSearch" TEXT,
    "domain" "AgriDomain" NOT NULL DEFAULT 'GENERAL',
    "target" TEXT,
    "type" "DiseaseType",
    "symptom" TEXT,
    "note" TEXT,
    "formulaExpr" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disease_ingredient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "activeIngredient" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "disease_ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disease_product_pin" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "disease_product_pin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disease_consult_field" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "diseaseId" TEXT,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "ConsultFieldType" NOT NULL DEFAULT 'NUMBER',
    "unit" TEXT,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "disease_consult_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disease_product_fallback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "diseaseId" TEXT NOT NULL,
    "primaryProductId" TEXT NOT NULL,
    "fallbackProductId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "disease_product_fallback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_settings" (
    "tenantId" TEXT NOT NULL,
    "companyName" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoFileId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "language" TEXT NOT NULL DEFAULT 'vi',
    "defaultPaymentMethod" "PaymentMethod",
    "receiptFooter" TEXT,
    "lowStockThresholdDefault" DECIMAL(18,6),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenantId")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_slug_key" ON "tenant"("slug");

-- CreateIndex
CREATE INDEX "tenant_status_idx" ON "tenant"("status");

-- CreateIndex
CREATE INDEX "tenant_deletedAt_idx" ON "tenant"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "plan_code_key" ON "plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "feature_code_key" ON "feature"("code");

-- CreateIndex
CREATE INDEX "plan_feature_featureId_idx" ON "plan_feature"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_feature_planId_featureId_key" ON "plan_feature"("planId", "featureId");

-- CreateIndex
CREATE INDEX "subscription_tenantId_idx" ON "subscription"("tenantId");

-- CreateIndex
CREATE INDEX "subscription_planId_idx" ON "subscription"("planId");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "subscription"("status");

-- CreateIndex
CREATE INDEX "subscription_tenantId_status_updatedAt_idx" ON "subscription"("tenantId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "subscription_tenantId_status_startDate_endDate_trialEndsAt_idx" ON "subscription"("tenantId", "status", "startDate", "endDate", "trialEndsAt");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_invoiceNumber_key" ON "invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoice_tenantId_idx" ON "invoice"("tenantId");

-- CreateIndex
CREATE INDEX "invoice_status_idx" ON "invoice"("status");

-- CreateIndex
CREATE INDEX "payment_invoiceId_idx" ON "payment"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_status_idx" ON "payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_admin_email_key" ON "platform_admin"("email");

-- CreateIndex
CREATE INDEX "admin_role_assignment_roleId_idx" ON "admin_role_assignment"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_role_assignment_adminId_roleId_key" ON "admin_role_assignment"("adminId", "roleId");

-- CreateIndex
CREATE INDEX "system_announcement_audience_idx" ON "system_announcement"("audience");

-- CreateIndex
CREATE INDEX "system_announcement_targetTenantId_idx" ON "system_announcement"("targetTenantId");

-- CreateIndex
CREATE INDEX "support_ticket_tenantId_idx" ON "support_ticket"("tenantId");

-- CreateIndex
CREATE INDEX "support_ticket_status_idx" ON "support_ticket"("status");

-- CreateIndex
CREATE INDEX "ticket_message_ticketId_idx" ON "ticket_message"("ticketId");

-- CreateIndex
CREATE INDEX "user_tenantId_status_idx" ON "user"("tenantId", "status");

-- CreateIndex
CREATE INDEX "user_username_idx" ON "user"("username");

-- CreateIndex
CREATE INDEX "user_phone_idx" ON "user"("phone");

-- CreateIndex
CREATE INDEX "user_email_idx" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_tenantId_username_key" ON "user"("tenantId", "username");

-- CreateIndex
CREATE INDEX "role_tenantId_isAdmin_idx" ON "role"("tenantId", "isAdmin");

-- CreateIndex
CREATE UNIQUE INDEX "role_tenantId_code_key" ON "role"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE INDEX "permission_resource_idx" ON "permission"("resource");

-- CreateIndex
CREATE INDEX "permission_group_idx" ON "permission"("group");

-- CreateIndex
CREATE INDEX "role_permission_permissionId_idx" ON "role_permission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "role_permission_roleId_permissionId_key" ON "role_permission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "tenant_feature_flag_tenantId_idx" ON "tenant_feature_flag"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_feature_flag_tenantId_featureId_key" ON "tenant_feature_flag"("tenantId", "featureId");

-- CreateIndex
CREATE INDEX "audit_log_tenantId_createdAt_idx" ON "audit_log"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_actorType_actorId_idx" ON "audit_log"("actorType", "actorId");

-- CreateIndex
CREATE INDEX "notification_tenantId_userId_readAt_idx" ON "notification"("tenantId", "userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "stored_file_key_key" ON "stored_file"("key");

-- CreateIndex
CREATE INDEX "stored_file_tenantId_purpose_idx" ON "stored_file"("tenantId", "purpose");

-- CreateIndex
CREATE INDEX "warehouse_tenantId_idx" ON "warehouse"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_tenantId_code_key" ON "warehouse"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequence_tenantId_docType_key" ON "document_sequence"("tenantId", "docType");

-- CreateIndex
CREATE INDEX "category_tenantId_idx" ON "category"("tenantId");

-- CreateIndex
CREATE INDEX "brand_tenantId_idx" ON "brand"("tenantId");

-- CreateIndex
CREATE INDEX "manufacturer_tenantId_idx" ON "manufacturer"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "unit_tenantId_code_key" ON "unit"("tenantId", "code");

-- CreateIndex
CREATE INDEX "product_tenantId_nameSearch_idx" ON "product"("tenantId", "nameSearch");

-- CreateIndex
CREATE INDEX "product_tenantId_barcode_idx" ON "product"("tenantId", "barcode");

-- CreateIndex
CREATE INDEX "product_tenantId_activeIngredient_idx" ON "product"("tenantId", "activeIngredient");

-- CreateIndex
CREATE INDEX "product_tenantId_productKind_idx" ON "product"("tenantId", "productKind");

-- CreateIndex
CREATE INDEX "product_tenantId_isPinned_idx" ON "product"("tenantId", "isPinned");

-- CreateIndex
CREATE UNIQUE INDEX "product_tenantId_sku_key" ON "product"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "tenant_quota_counter_tenantId_dimension_idx" ON "tenant_quota_counter"("tenantId", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_quota_counter_tenantId_dimension_periodKey_key" ON "tenant_quota_counter"("tenantId", "dimension", "periodKey");

-- CreateIndex
CREATE INDEX "product_unit_conversion_tenantId_idx" ON "product_unit_conversion"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "product_unit_conversion_productId_unitId_kind_key" ON "product_unit_conversion"("productId", "unitId", "kind");

-- CreateIndex
CREATE INDEX "product_price_tier_tenantId_productId_idx" ON "product_price_tier"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "customer_product_price_tenantId_idx" ON "customer_product_price"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_product_price_customerId_productId_key" ON "customer_product_price"("customerId", "productId");

-- CreateIndex
CREATE INDEX "product_batch_expiresAt_idx" ON "product_batch"("expiresAt");

-- CreateIndex
CREATE INDEX "product_batch_isRecalled_idx" ON "product_batch"("isRecalled");

-- CreateIndex
CREATE UNIQUE INDEX "product_batch_tenantId_productId_warehouseId_batchCode_key" ON "product_batch"("tenantId", "productId", "warehouseId", "batchCode");

-- CreateIndex
CREATE INDEX "stock_tenantId_idx" ON "stock"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_warehouseId_productId_key" ON "stock"("warehouseId", "productId");

-- CreateIndex
CREATE INDEX "stock_movement_tenantId_productId_occurredAt_idx" ON "stock_movement"("tenantId", "productId", "occurredAt");

-- CreateIndex
CREATE INDEX "stock_movement_refType_refId_idx" ON "stock_movement"("refType", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_adjustment_tenantId_docNo_key" ON "stock_adjustment"("tenantId", "docNo");

-- CreateIndex
CREATE INDEX "stock_adjustment_line_adjustmentId_idx" ON "stock_adjustment_line"("adjustmentId");

-- CreateIndex
CREATE INDEX "purchase_tenantId_purchasedAt_idx" ON "purchase"("tenantId", "purchasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_tenantId_docNo_key" ON "purchase"("tenantId", "docNo");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_tenantId_idempotencyKey_key" ON "purchase"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "purchase_line_purchaseId_idx" ON "purchase_line"("purchaseId");

-- CreateIndex
CREATE INDEX "purchase_line_tenantId_idx" ON "purchase_line"("tenantId");

-- CreateIndex
CREATE INDEX "sale_tenantId_soldAt_idx" ON "sale"("tenantId", "soldAt");

-- CreateIndex
CREATE INDEX "sale_tenantId_customerId_idx" ON "sale"("tenantId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_tenantId_docNo_key" ON "sale"("tenantId", "docNo");

-- CreateIndex
CREATE UNIQUE INDEX "sale_tenantId_idempotencyKey_key" ON "sale"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "sale_line_saleId_idx" ON "sale_line"("saleId");

-- CreateIndex
CREATE INDEX "sale_line_tenantId_idx" ON "sale_line"("tenantId");

-- CreateIndex
CREATE INDEX "sale_line_batch_saleLineId_idx" ON "sale_line_batch"("saleLineId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_return_tenantId_docNo_key" ON "sales_return"("tenantId", "docNo");

-- CreateIndex
CREATE INDEX "sales_return_line_salesReturnId_idx" ON "sales_return_line"("salesReturnId");

-- CreateIndex
CREATE INDEX "customer_tenantId_phone_idx" ON "customer"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "customer_tenantId_nameSearch_idx" ON "customer"("tenantId", "nameSearch");

-- CreateIndex
CREATE INDEX "supplier_tenantId_idx" ON "supplier"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_tenantId_code_key" ON "supplier"("tenantId", "code");

-- CreateIndex
CREATE INDEX "debt_ledger_tenantId_partyType_partyId_occurredAt_idx" ON "debt_ledger"("tenantId", "partyType", "partyId", "occurredAt");

-- CreateIndex
CREATE INDEX "payment_voucher_tenantId_occurredAt_idx" ON "payment_voucher"("tenantId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_voucher_tenantId_docNo_key" ON "payment_voucher"("tenantId", "docNo");

-- CreateIndex
CREATE INDEX "payment_voucher_line_voucherId_idx" ON "payment_voucher_line"("voucherId");

-- CreateIndex
CREATE INDEX "disease_tenantId_isPinned_idx" ON "disease"("tenantId", "isPinned");

-- CreateIndex
CREATE INDEX "disease_tenantId_nameSearch_idx" ON "disease"("tenantId", "nameSearch");

-- CreateIndex
CREATE INDEX "disease_ingredient_diseaseId_idx" ON "disease_ingredient"("diseaseId");

-- CreateIndex
CREATE UNIQUE INDEX "disease_product_pin_diseaseId_productId_key" ON "disease_product_pin"("diseaseId", "productId");

-- CreateIndex
CREATE INDEX "disease_consult_field_tenantId_diseaseId_idx" ON "disease_consult_field"("tenantId", "diseaseId");

-- CreateIndex
CREATE INDEX "disease_product_fallback_diseaseId_primaryProductId_idx" ON "disease_product_fallback"("diseaseId", "primaryProductId");

-- AddForeignKey
ALTER TABLE "plan_feature" ADD CONSTRAINT "plan_feature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_feature" ADD CONSTRAINT "plan_feature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_assignment" ADD CONSTRAINT "admin_role_assignment_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "platform_admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_assignment" ADD CONSTRAINT "admin_role_assignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_announcement" ADD CONSTRAINT "system_announcement_targetTenantId_fkey" FOREIGN KEY ("targetTenantId") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_announcement" ADD CONSTRAINT "system_announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "platform_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket" ADD CONSTRAINT "support_ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "platform_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_authorAdminId_fkey" FOREIGN KEY ("authorAdminId") REFERENCES "platform_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_feature_flag" ADD CONSTRAINT "tenant_feature_flag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_feature_flag" ADD CONSTRAINT "tenant_feature_flag_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse" ADD CONSTRAINT "warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequence" ADD CONSTRAINT "document_sequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand" ADD CONSTRAINT "brand_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manufacturer" ADD CONSTRAINT "manufacturer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_defaultSupplierId_fkey" FOREIGN KEY ("defaultSupplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_baseUnitId_fkey" FOREIGN KEY ("baseUnitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_quota_counter" ADD CONSTRAINT "tenant_quota_counter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_unit_conversion" ADD CONSTRAINT "product_unit_conversion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_unit_conversion" ADD CONSTRAINT "product_unit_conversion_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_tier" ADD CONSTRAINT "product_price_tier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_product_price" ADD CONSTRAINT "customer_product_price_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_product_price" ADD CONSTRAINT "customer_product_price_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batch" ADD CONSTRAINT "product_batch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_batch" ADD CONSTRAINT "product_batch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "product_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment" ADD CONSTRAINT "stock_adjustment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment" ADD CONSTRAINT "stock_adjustment_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_adjustment_line" ADD CONSTRAINT "stock_adjustment_line_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "stock_adjustment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_line" ADD CONSTRAINT "purchase_line_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_line" ADD CONSTRAINT "purchase_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_line" ADD CONSTRAINT "purchase_line_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_line" ADD CONSTRAINT "purchase_line_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "product_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale" ADD CONSTRAINT "sale_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "disease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line" ADD CONSTRAINT "sale_line_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "product_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_batch" ADD CONSTRAINT "sale_line_batch_saleLineId_fkey" FOREIGN KEY ("saleLineId") REFERENCES "sale_line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_line_batch" ADD CONSTRAINT "sale_line_batch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "product_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return" ADD CONSTRAINT "sales_return_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return" ADD CONSTRAINT "sales_return_originalSaleId_fkey" FOREIGN KEY ("originalSaleId") REFERENCES "sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return" ADD CONSTRAINT "sales_return_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return" ADD CONSTRAINT "sales_return_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_line" ADD CONSTRAINT "sales_return_line_salesReturnId_fkey" FOREIGN KEY ("salesReturnId") REFERENCES "sales_return"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer" ADD CONSTRAINT "customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_ledger" ADD CONSTRAINT "debt_ledger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_voucher" ADD CONSTRAINT "payment_voucher_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_voucher" ADD CONSTRAINT "payment_voucher_refSaleId_fkey" FOREIGN KEY ("refSaleId") REFERENCES "sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_voucher" ADD CONSTRAINT "payment_voucher_refPurchaseId_fkey" FOREIGN KEY ("refPurchaseId") REFERENCES "purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_voucher" ADD CONSTRAINT "payment_voucher_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_voucher" ADD CONSTRAINT "payment_voucher_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_voucher_line" ADD CONSTRAINT "payment_voucher_line_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "payment_voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disease" ADD CONSTRAINT "disease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disease_ingredient" ADD CONSTRAINT "disease_ingredient_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disease_product_pin" ADD CONSTRAINT "disease_product_pin_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disease_product_pin" ADD CONSTRAINT "disease_product_pin_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disease_consult_field" ADD CONSTRAINT "disease_consult_field_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disease_product_fallback" ADD CONSTRAINT "disease_product_fallback_diseaseId_fkey" FOREIGN KEY ("diseaseId") REFERENCES "disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disease_product_fallback" ADD CONSTRAINT "disease_product_fallback_primaryProductId_fkey" FOREIGN KEY ("primaryProductId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disease_product_fallback" ADD CONSTRAINT "disease_product_fallback_fallbackProductId_fkey" FOREIGN KEY ("fallbackProductId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
