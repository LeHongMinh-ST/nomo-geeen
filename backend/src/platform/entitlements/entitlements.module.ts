import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ENTITLEMENT_CLOCK, EntitlementService } from './entitlement.service';
import { EntitlementsGuard } from './entitlements.guard';
import { TenantQuotaCounterService } from './tenant-quota-counter.service';

@Module({
	imports: [PrismaModule],
	providers: [
		EntitlementService,
		EntitlementsGuard,
		TenantQuotaCounterService,
		{ provide: ENTITLEMENT_CLOCK, useFactory: () => () => new Date() },
	],
	exports: [EntitlementService, EntitlementsGuard, TenantQuotaCounterService],
})
export class EntitlementsModule {}
