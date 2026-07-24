import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesReturnsService } from './sales-return.service';

@Module({
	imports: [AuthModule, AuditModule, EntitlementsModule, PrismaModule],
	controllers: [SalesController],
	providers: [SalesService, SalesReturnsService],
	exports: [SalesReturnsService],
})
export class SalesModule {}
