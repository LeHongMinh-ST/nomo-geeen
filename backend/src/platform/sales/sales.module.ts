import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QuickSaleDraftController } from './quick-sale-draft.controller';
import { QuickSaleDraftService } from './quick-sale-draft.service';
import { QuickSaleDraftEventsService } from './quick-sale-draft-events.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesReturnsService } from './sales-return.service';

@Module({
	imports: [AuthModule, AuditModule, EntitlementsModule, PrismaModule],
	controllers: [SalesController, QuickSaleDraftController],
	providers: [
		SalesService,
		SalesReturnsService,
		QuickSaleDraftService,
		QuickSaleDraftEventsService,
	],
	exports: [SalesReturnsService, QuickSaleDraftService],
})
export class SalesModule {}
