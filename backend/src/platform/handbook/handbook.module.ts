import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HandbookController } from './handbook.controller';
import { HandbookService } from './handbook.service';

@Module({
	imports: [AuthModule, PrismaModule],
	controllers: [HandbookController],
	providers: [HandbookService],
	exports: [HandbookService],
})
export class HandbookModule {}
