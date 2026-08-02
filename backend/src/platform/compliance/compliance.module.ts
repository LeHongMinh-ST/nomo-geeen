import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ComplianceController } from './compliance.controller';
import { ComplianceService } from './compliance.service';

@Module({
	imports: [AuthModule, PrismaModule],
	controllers: [ComplianceController],
	providers: [ComplianceService],
	exports: [ComplianceService],
})
export class ComplianceModule {}
