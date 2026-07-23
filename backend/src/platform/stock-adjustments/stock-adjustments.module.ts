import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StockAdjustmentsController } from './stock-adjustments.controller';
import { StockAdjustmentsService } from './stock-adjustments.service';

@Module({
	imports: [AuthModule, EntitlementsModule, PrismaModule],
	controllers: [StockAdjustmentsController],
	providers: [StockAdjustmentsService],
	exports: [StockAdjustmentsService],
})
export class StockAdjustmentsModule {}
