import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
	imports: [AuthModule, AuditModule, EntitlementsModule, PrismaModule],
	controllers: [SalesController],
	providers: [SalesService],
})
export class SalesModule {}
