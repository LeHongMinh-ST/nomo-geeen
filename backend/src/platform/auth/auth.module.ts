import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuditModule } from '../audit/audit.module';
import { TenantsModule } from '../tenants/tenants.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRequestPolicy } from './auth-request-policy';
import { AccessTokenGuard } from './guards/access-token.guard';
import { PermissionGuard } from './guards/permission.guard';
import { TenantAccessTokenGuard } from './guards/tenant-access-token.guard';
import { TenantPermissionGuard } from './guards/tenant-permission.guard';
import { PasswordService } from './password.service';
import { RefreshTokenStore } from './refresh-token.store';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { TenantAccessTokenStrategy } from './strategies/tenant-access-token.strategy';
import { TenantAuthService } from './tenant-auth.service';
import { TokenService } from './token.service';

@Module({
	imports: [
		PassportModule,
		JwtModule.register({}),
		forwardRef(() => TenantsModule),
		forwardRef(() => AuditModule),
	],
	controllers: [AuthController],
	providers: [
		AuthService,
		AuthRequestPolicy,
		PasswordService,
		TokenService,
		RefreshTokenStore,
		AccessTokenStrategy,
		TenantAccessTokenStrategy,
		AccessTokenGuard,
		TenantAccessTokenGuard,
		TenantPermissionGuard,
		TenantAuthService,
		PermissionGuard,
	],
	exports: [
		PasswordService,
		TokenService,
		RefreshTokenStore,
		PermissionGuard,
		TenantAccessTokenGuard,
		TenantPermissionGuard,
		TenantAuthService,
		AuthRequestPolicy,
	],
})
export class AuthModule {}
