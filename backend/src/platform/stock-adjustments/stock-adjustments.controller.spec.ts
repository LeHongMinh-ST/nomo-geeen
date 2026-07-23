import 'reflect-metadata';
import { TENANT_PERMISSIONS_KEY } from '../auth/decorators/require-tenant-permission.decorator';
import { ENTITLEMENT_FEATURE_KEY } from '../entitlements/entitlement.constants';
import { StockAdjustmentsController } from './stock-adjustments.controller';
import { StockAdjustmentsService } from './stock-adjustments.service';

describe('StockAdjustmentsController', () => {
	it('forwards create with tenant identity and inventory:edit', () => {
		const service = {
			createDraft: jest.fn().mockReturnValue({ id: 'adj-1', status: 'DRAFT' }),
			complete: jest.fn().mockReturnValue({ id: 'adj-1', status: 'COMPLETED' }),
			list: jest
				.fn()
				.mockReturnValue({ items: [], page: 1, pageSize: 20, total: 0 }),
			findById: jest.fn().mockReturnValue({ id: 'adj-1' }),
		} as unknown as StockAdjustmentsService;
		const controller = new StockAdjustmentsController(service);
		const request = { user: { tenantId: 'tenant-1', id: 'user-1' } } as never;
		const dto = {
			warehouseId: 'wh-1',
			lines: [
				{
					productId: 'p-1',
					delta: '-1',
					reasonCode: 'COUNT_CORRECTION',
				},
			],
		} as never;

		expect(controller.create(request, dto)).toEqual({
			id: 'adj-1',
			status: 'DRAFT',
		});
		expect(service.createDraft).toHaveBeenCalledWith('tenant-1', 'user-1', dto);
		expect(
			Reflect.getMetadata(
				TENANT_PERMISSIONS_KEY,
				StockAdjustmentsController.prototype.create,
			),
		).toEqual(['inventory:edit']);
		expect(
			Reflect.getMetadata(
				ENTITLEMENT_FEATURE_KEY,
				StockAdjustmentsController.prototype.create,
			),
		).toBe('inventory');
	});

	it('protects list/detail with inventory:view and complete with inventory:edit', () => {
		const service = {
			list: jest.fn().mockReturnValue({ items: [] }),
			findById: jest.fn().mockReturnValue({ id: 'adj-1' }),
			complete: jest.fn().mockReturnValue({ id: 'adj-1', status: 'COMPLETED' }),
		} as unknown as StockAdjustmentsService;
		const controller = new StockAdjustmentsController(service);
		const request = { user: { tenantId: 'tenant-1', id: 'user-1' } } as never;

		controller.list(request, { page: 1 } as never);
		controller.detail(request, 'adj-1');
		controller.complete(request, 'adj-1');

		expect(service.list).toHaveBeenCalledWith('tenant-1', { page: 1 });
		expect(service.findById).toHaveBeenCalledWith('tenant-1', 'adj-1');
		expect(service.complete).toHaveBeenCalledWith(
			'tenant-1',
			'user-1',
			'adj-1',
		);
		expect(
			Reflect.getMetadata(
				TENANT_PERMISSIONS_KEY,
				StockAdjustmentsController.prototype.list,
			),
		).toEqual(['inventory:view']);
		expect(
			Reflect.getMetadata(
				TENANT_PERMISSIONS_KEY,
				StockAdjustmentsController.prototype.detail,
			),
		).toEqual(['inventory:view']);
		expect(
			Reflect.getMetadata(
				TENANT_PERMISSIONS_KEY,
				StockAdjustmentsController.prototype.complete,
			),
		).toEqual(['inventory:edit']);
	});
});
