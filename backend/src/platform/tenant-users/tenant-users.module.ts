import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantUsersController } from './tenant-users.controller';
import { TenantUsersService } from './tenant-users.service';

@Module({
	imports: [AuthModule, PrismaModule, AuditModule],
	controllers: [TenantUsersController],
	providers: [TenantUsersService],
	exports: [TenantUsersService],
})
export class TenantUsersModule {}
