import 'reflect-metadata';
import { TENANT_PERMISSIONS_KEY } from '../auth/decorators/require-tenant-permission.decorator';
import { ENTITLEMENT_FEATURE_KEY } from '../entitlements/entitlement.constants';
import { PurchasesController } from './purchases.controller';

describe('PurchasesController', () => {
	it('forwards the protected full-return route', () => {
		const purchases = {} as never;
		const returns = { createFullReturn: jest.fn().mockReturnValue({ id: 'return-1' }) } as never;
		const controller = new PurchasesController(purchases, returns);
		const request = { user: { tenantId: 'tenant-1', id: 'user-1' } } as never;
		const dto = { note: 'damaged' } as never;

		expect(controller.returnPurchase(request, 'purchase-1', dto)).toEqual({ id: 'return-1' });
		expect((returns as { createFullReturn: jest.Mock }).createFullReturn).toHaveBeenCalledWith('tenant-1', 'user-1', 'purchase-1', 'damaged');
		expect(Reflect.getMetadata(TENANT_PERMISSIONS_KEY, PurchasesController.prototype.returnPurchase)).toEqual(['purchase:edit']);
		expect(Reflect.getMetadata(ENTITLEMENT_FEATURE_KEY, PurchasesController.prototype.returnPurchase)).toBe('inventory');
	});
});
