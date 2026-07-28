import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminUsersModule } from './platform/admin-users/admin-users.module';
import { AuditModule } from './platform/audit/audit.module';
import { AuthModule } from './platform/auth/auth.module';
import { BillingModule } from './platform/billing/billing.module';
import { CustomersModule } from './platform/customers/customers.module';
import { DebtsModule } from './platform/debts/debts.module';
import { EntitlementsModule } from './platform/entitlements/entitlements.module';
import { HandbookModule } from './platform/handbook/handbook.module';
import { HealthModule } from './platform/health/health.module';
import { InventoryModule } from './platform/inventory/inventory.module';
import { NotificationsModule } from './platform/notifications/notifications.module';
import { ObservabilityModule } from './platform/observability/observability.module';
import { StructuredExceptionFilter } from './platform/observability/structured-exception.filter';
import { PrismaModule } from './platform/prisma/prisma.module';
import { ProductsModule } from './platform/products/products.module';
import { PurchasesModule } from './platform/purchases/purchases.module';
import { RateLimitGuard } from './platform/rate-limit/rate-limit.guard';
import { RedisModule } from './platform/redis/redis.module';
import { ReportsModule } from './platform/reports/reports.module';
import { RolesModule } from './platform/roles/roles.module';
import { SalesModule } from './platform/sales/sales.module';
import { StockAdjustmentsModule } from './platform/stock-adjustments/stock-adjustments.module';
import { SuppliersModule } from './platform/suppliers/suppliers.module';
import { TenantUsersModule } from './platform/tenant-users/tenant-users.module';
import { TenantsModule } from './platform/tenants/tenants.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		PrismaModule,
		RedisModule,
		ReportsModule,
		AuthModule,
		BillingModule,
		AuditModule,
		RolesModule,
		AdminUsersModule,
		TenantsModule,
		TenantUsersModule,
		EntitlementsModule,
		ProductsModule,
		CustomersModule,
		DebtsModule,
		PurchasesModule,
		SuppliersModule,
		InventoryModule,
		SalesModule,
		StockAdjustmentsModule,
		HandbookModule,
		NotificationsModule,
		HealthModule,
		ObservabilityModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		{ provide: APP_GUARD, useClass: RateLimitGuard },
		{ provide: APP_FILTER, useClass: StructuredExceptionFilter },
	],
})
export class AppModule {}
