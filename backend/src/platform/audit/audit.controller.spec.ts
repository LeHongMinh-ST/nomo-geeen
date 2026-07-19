import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permission.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AuditController } from './audit.controller';
import { AuditModule } from './audit.module';

describe('AuditController', () => {
	it('exposes the guarded audit permission and delegates list queries', async () => {
		const service = {
			list: jest
				.fn()
				.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 }),
			findById: jest.fn().mockResolvedValue({ id: 'event-1' }),
		};
		const controller = new AuditController(service as never);
		const result = await controller.list({ page: 1, pageSize: 20 });

		expect(result).toEqual({ items: [], page: 1, pageSize: 20, total: 0 });
		expect(service.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
		expect(
			Reflect.getMetadata(PERMISSIONS_KEY, AuditController.prototype.list),
		).toEqual(['admin.audit:view']);
		expect(Reflect.getMetadata('__guards__', AuditController)).toEqual([
			AccessTokenGuard,
			PermissionGuard,
		]);
		expect(
			Reflect.getMetadata(PERMISSIONS_KEY, AuditController.prototype.findOne),
		).toEqual(['admin.audit:view']);
	});

	it('denies missing token and missing permission before querying', async () => {
		const context = (user?: object) =>
			({
				switchToHttp: () => ({ getRequest: () => ({ headers: {}, user }) }),
				getHandler: () => AuditController.prototype.list,
				getClass: () => AuditController,
			}) as never;
		const accessGuard = new AccessTokenGuard({
			isAccessBlacklisted: jest.fn(),
		} as never);
		await expect(accessGuard.canActivate(context())).rejects.toBeInstanceOf(
			UnauthorizedException,
		);

		const permissionGuard = new PermissionGuard(new Reflector());
		expect(() =>
			permissionGuard.canActivate(context({ roleCodes: [], permissions: [] })),
		).toThrow(ForbiddenException);
	});

	it('is registered through the real module entrypoint', () => {
		expect(Reflect.getMetadata('controllers', AuditModule)).toContain(
			AuditController,
		);
		expect(Reflect.getMetadata('imports', AppModule)).toContain(AuditModule);
	});
});
