import { ForbiddenException } from '@nestjs/common';
import { TenantAuthService } from './tenant-auth.service';

describe('TenantAuthService profile authorization', () => {
	it.each(['MANAGER', 'STAFF'])(
		'denies %s from changing tenant store settings',
		async (roleCode) => {
			const findFirst = jest.fn().mockResolvedValue({
				id: 'user-1',
				tenantId: 'tenant-1',
				role: { code: roleCode, permissions: [] },
			});
			const tenantSettings = { findUnique: jest.fn() };
			const audit = { run: jest.fn() };
			const service = new TenantAuthService(
				{
					user: { findFirst },
					tenantSettings,
				} as never,
				{} as never,
				{} as never,
				{} as never,
				audit as never,
				{} as never,
			);

			await expect(
				service.updateProfile('user-1', 'tenant-1', {
					fullName: 'Nhân viên cập nhật',
					address: 'Địa chỉ mới',
					bankId: '970436',
					bankAccountNumber: '123456',
					bankAccountName: 'TENANT',
				}),
			).rejects.toBeInstanceOf(ForbiddenException);
			expect(tenantSettings.findUnique).not.toHaveBeenCalled();
			expect(audit.run).not.toHaveBeenCalled();
		},
	);
});
