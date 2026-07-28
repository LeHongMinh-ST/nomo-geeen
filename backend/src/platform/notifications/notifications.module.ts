import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationEventsService } from './notification-events.service';
import { NotificationProducerService } from './notification-producer.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
	imports: [AuthModule, AuditModule, PrismaModule],
	controllers: [NotificationsController],
	providers: [
		NotificationsService,
		NotificationProducerService,
		NotificationEventsService,
	],
	exports: [
		NotificationsService,
		NotificationProducerService,
		NotificationEventsService,
	],
})
export class NotificationsModule {}
