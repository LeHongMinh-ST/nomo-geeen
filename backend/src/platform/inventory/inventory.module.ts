import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { LivestockStateController } from './livestock-state.controller';
import { LivestockStateService } from './livestock-state.service';
@Module({
	imports: [AuthModule, AuditModule, EntitlementsModule, PrismaModule],
	controllers: [InventoryController, LivestockStateController],
	providers: [InventoryService, LivestockStateService],
	exports: [InventoryService, LivestockStateService],
})
export class InventoryModule {}
