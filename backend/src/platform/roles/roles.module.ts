import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsController, RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
	imports: [AuthModule, PrismaModule, AuditModule],
	controllers: [RolesController, PermissionsController],
	providers: [RolesService],
	exports: [RolesService],
})
export class RolesModule {}