import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { HealthModule } from '../health/health.module';
import { AdminNotificationsController } from './admin-notifications.controller';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminSearchController } from './admin-search.controller';
import {
	AdminStatusController,
	BillingController,
	SubscriptionController,
	TransactionsController,
} from './billing.controller';
import { BILLING_CLOCK, BillingService } from './billing.service';

@Module({
	imports: [AuthModule, AuditModule, HealthModule],
	controllers: [
		BillingController,
		SubscriptionController,
		TransactionsController,
		AdminStatusController,
		AdminSearchController,
		AdminNotificationsController,
	],
	providers: [
		BillingService,
		AdminNotificationsService,
		{ provide: BILLING_CLOCK, useFactory: () => () => new Date() },
	],
})
export class BillingModule {}
