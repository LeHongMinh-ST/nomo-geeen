import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
	imports: [AuthModule, AuditModule, EntitlementsModule, PrismaModule],
	controllers: [ReportsController],
	providers: [ReportsService],
	exports: [ReportsService],
})
export class ReportsModule {}
