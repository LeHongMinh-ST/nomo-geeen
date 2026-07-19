import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { PermissionGuard } from './guards/permission.guard';
import { TenantAccessTokenGuard } from './guards/tenant-access-token.guard';
import { PasswordService } from './password.service';
import { RefreshTokenStore } from './refresh-token.store';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { TenantAccessTokenStrategy } from './strategies/tenant-access-token.strategy';
import { TenantAuthService } from './tenant-auth.service';
import { TokenService } from './token.service';

@Module({
	imports: [PassportModule, JwtModule.register({})],
	controllers: [AuthController],
	providers: [
		AuthService,
		PasswordService,
		TokenService,
		RefreshTokenStore,
		AccessTokenStrategy,
		TenantAccessTokenStrategy,
		AccessTokenGuard,
		TenantAccessTokenGuard,
		TenantAuthService,
		PermissionGuard,
	],
	exports: [
		PasswordService,
		TokenService,
		RefreshTokenStore,
		PermissionGuard,
		TenantAccessTokenGuard,
		TenantAuthService,
	],
})
export class AuthModule {}
