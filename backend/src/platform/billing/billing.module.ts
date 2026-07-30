import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { HealthModule } from '../health/health.module';
import { AdminDashboardDataController } from './admin-dashboard-data.controller';
import { AdminDashboardDataService } from './admin-dashboard-data.service';
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
		AdminDashboardDataController,
		BillingController,
		SubscriptionController,
		TransactionsController,
		AdminStatusController,
		AdminSearchController,
		AdminNotificationsController,
	],
	providers: [
		AdminDashboardDataService,
		BillingService,
		AdminNotificationsService,
		{ provide: BILLING_CLOCK, useFactory: () => () => new Date() },
	],
})
export class BillingModule {}
