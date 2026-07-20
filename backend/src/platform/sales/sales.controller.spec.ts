import 'reflect-metadata';
import { TENANT_PERMISSIONS_KEY } from '../auth/decorators/require-tenant-permission.decorator';
import { ENTITLEMENT_FEATURE_KEY } from '../entitlements/entitlement.constants';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

describe('SalesController', () => {
	it('exposes the protected quick-sale contract and forwards tenant identity', () => {
		const service = {
			createQuickSale: jest.fn().mockReturnValue({ ok: true }),
		} as unknown as SalesService;
		const controller = new SalesController(service);
		const dto = { idempotencyKey: 'key' } as never;
		const request = { user: { tenantId: 'tenant-1', id: 'user-1' } } as never;

		expect(controller.createQuickSale(request, dto)).toEqual({ ok: true });
		expect(service.createQuickSale).toHaveBeenCalledWith(
			'tenant-1',
			'user-1',
			dto,
		);
		expect(
			Reflect.getMetadata(TENANT_PERMISSIONS_KEY, SalesController),
		).toEqual(undefined);
		expect(
			Reflect.getMetadata(
				TENANT_PERMISSIONS_KEY,
				SalesController.prototype.createQuickSale,
			),
		).toEqual(['sales:create']);
		expect(
			Reflect.getMetadata(
				ENTITLEMENT_FEATURE_KEY,
				SalesController.prototype.createQuickSale,
			),
		).toBe('inventory');
	});
});
