import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditController } from './audit.controller';
import { AuditLogger } from './audit-logger.service';
import { AuditQueryService } from './audit-query.service';

@Module({
	imports: [PrismaModule],
	controllers: [AuditController],
	providers: [AuditLogger, AuditQueryService],
	exports: [AuditLogger],
})
export class AuditModule {}
