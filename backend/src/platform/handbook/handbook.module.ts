import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HandbookController } from './handbook.controller';
import { HandbookProtocolService } from './handbook-protocol.service';
import { HandbookService } from './handbook.service';

@Module({
	imports: [AuthModule, AuditModule, PrismaModule],
	controllers: [HandbookController],
	providers: [HandbookService, HandbookProtocolService],
	exports: [HandbookService, HandbookProtocolService],
})
export class HandbookModule {}
