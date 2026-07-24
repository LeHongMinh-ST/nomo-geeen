import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchaseReturnsService } from './purchase-return.service';
@Module({
	imports: [AuthModule, AuditModule, EntitlementsModule, PrismaModule],
	controllers: [PurchasesController],
	providers: [PurchasesService, PurchaseReturnsService],
	exports: [PurchasesService, PurchaseReturnsService],
})
export class PurchasesModule {}
