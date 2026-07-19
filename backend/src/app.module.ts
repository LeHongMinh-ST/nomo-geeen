import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminUsersModule } from './platform/admin-users/admin-users.module';
import { AuditModule } from './platform/audit/audit.module';
import { AuthModule } from './platform/auth/auth.module';
import { PrismaModule } from './platform/prisma/prisma.module';
import { RedisModule } from './platform/redis/redis.module';
import { RolesModule } from './platform/roles/roles.module';
import { TenantsModule } from './platform/tenants/tenants.module';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		PrismaModule,
		RedisModule,
		AuthModule,
		AuditModule,
		RolesModule,
		AdminUsersModule,
		TenantsModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
