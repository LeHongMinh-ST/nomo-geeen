import { forwardRef, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
	imports: [
		forwardRef(() => AuthModule),
		PrismaModule,
		forwardRef(() => AuditModule),
	],
	controllers: [TenantsController],
	providers: [TenantsService],
	exports: [TenantsService],
})
export class TenantsModule {}
