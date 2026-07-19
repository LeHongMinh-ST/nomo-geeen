import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogger } from './audit-logger.service';

@Module({
	imports: [PrismaModule],
	providers: [AuditLogger],
	exports: [AuditLogger],
})
export class AuditModule {}