import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
	imports: [AuthModule, EntitlementsModule, PrismaModule],
	controllers: [SalesController],
	providers: [SalesService],
})
export class SalesModule {}
