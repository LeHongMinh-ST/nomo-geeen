import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditController } from './audit.controller';
import { AuditLogger } from './audit-logger.service';
import { AuditQueryService } from './audit-query.service';

@Module({
	imports: [AuthModule, PrismaModule],
	controllers: [AuditController],
	providers: [AuditLogger, AuditQueryService],
	exports: [AuditLogger],
})
export class AuditModule {}
