import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminUsersModule } from './platform/admin-users/admin-users.module';
import { AuditModule } from './platform/audit/audit.module';
import { AuthModule } from './platform/auth/auth.module';
import { BillingModule } from './platform/billing/billing.module';
import { EntitlementsModule } from './platform/entitlements/entitlements.module';
import { PrismaModule } from './platform/prisma/prisma.module';
import { ProductsModule } from './platform/products/products.module';
import { RedisModule } from './platform/redis/redis.module';
import { RolesModule } from './platform/roles/roles.module';
import { TenantUsersModule } from './platform/tenant-users/tenant-users.module';
import { TenantsModule } from './platform/tenants/tenants.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		PrismaModule,
		RedisModule,
		AuthModule,
		BillingModule,
		AuditModule,
		RolesModule,
		AdminUsersModule,
		TenantsModule,
		TenantUsersModule,
		EntitlementsModule,
		ProductsModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
