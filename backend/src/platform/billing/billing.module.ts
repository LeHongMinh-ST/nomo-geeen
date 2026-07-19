import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import {
	BillingController,
	SubscriptionController,
} from './billing.controller';
import { BILLING_CLOCK, BillingService } from './billing.service';

@Module({
	imports: [AuthModule, AuditModule],
	controllers: [BillingController, SubscriptionController],
	providers: [
		BillingService,
		{ provide: BILLING_CLOCK, useFactory: () => () => new Date() },
	],
})
export class BillingModule {}
