import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
@Module({
	imports: [AuthModule, EntitlementsModule, PrismaModule],
	controllers: [PurchasesController],
	providers: [PurchasesService],
	exports: [PurchasesService],
})
export class PurchasesModule {}
