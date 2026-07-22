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
	it('protects and forwards the tenant order query routes', () => {
		const service = {
			listOrders: jest
				.fn()
				.mockReturnValue({ items: [], page: 1, pageSize: 20, total: 0 }),
			findOrder: jest.fn().mockReturnValue({ id: 'order-1' }),
		} as unknown as SalesService;
		const controller = new SalesController(service);
		const request = { user: { tenantId: 'tenant-1' } } as never;
		const query = { page: 1, pageSize: 20 } as never;

		expect(controller.listOrders(request, query)).toEqual({
			items: [],
			page: 1,
			pageSize: 20,
			total: 0,
		});
		expect(controller.findOrder(request, 'order-1')).toEqual({ id: 'order-1' });
		expect(service.listOrders).toHaveBeenCalledWith('tenant-1', query);
		expect(service.findOrder).toHaveBeenCalledWith('tenant-1', 'order-1');
		for (const method of ['listOrders', 'findOrder'] as const) {
			expect(
				Reflect.getMetadata(
					TENANT_PERMISSIONS_KEY,
					SalesController.prototype[method],
				),
			).toEqual(['sales:view']);
			expect(
				Reflect.getMetadata(
					ENTITLEMENT_FEATURE_KEY,
					SalesController.prototype[method],
				),
			).toBe('advanced_mode');
		}
	});

	it('protects and forwards order cancellation with token identities', () => {
		const service = {
			cancelOrder: jest.fn().mockReturnValue({ id: 'order-1', status: 'CANCELLED' }),
		} as unknown as SalesService;
		const controller = new SalesController(service);
		const request = {
			user: { tenantId: 'tenant-1', id: 'user-1' },
		} as never;

		expect(controller.cancelOrder(request, 'order-1')).toEqual({
			id: 'order-1',
			status: 'CANCELLED',
		});
		expect(service.cancelOrder).toHaveBeenCalledWith(
			'tenant-1',
			'user-1',
			'order-1',
		);
		expect(
			Reflect.getMetadata(
				TENANT_PERMISSIONS_KEY,
				SalesController.prototype.cancelOrder,
			),
		).toEqual(['sales:edit']);
		expect(
			Reflect.getMetadata(
				ENTITLEMENT_FEATURE_KEY,
				SalesController.prototype.cancelOrder,
			),
		).toBe('advanced_mode');
	});

	it('forwards create and complete order mutations with token identities', () => {
		const service = {
			createOrder: jest.fn().mockReturnValue({ status: 'DRAFT' }),
			completeOrder: jest.fn().mockReturnValue({ status: 'COMPLETED' }),
		} as unknown as SalesService;
		const controller = new SalesController(service);
		const request = {
			user: { tenantId: 'tenant-1', id: 'user-1' },
		} as never;
		const createDto = { status: 'DRAFT' } as never;
		const completeDto = { paymentMethod: 'CASH', amountPaid: 1000 } as never;

		expect(controller.createOrder(request, createDto)).toEqual({ status: 'DRAFT' });
		expect(controller.completeOrder(request, 'order-1', completeDto)).toEqual({
			status: 'COMPLETED',
		});
		expect(service.createOrder).toHaveBeenCalledWith(
			'tenant-1',
			'user-1',
			createDto,
		);
		expect(service.completeOrder).toHaveBeenCalledWith(
			'tenant-1',
			'user-1',
			'order-1',
			completeDto,
		);
		for (const method of ['createOrder', 'completeOrder'] as const) {
			expect(
				Reflect.getMetadata(
					ENTITLEMENT_FEATURE_KEY,
					SalesController.prototype[method],
				),
			).toBe('advanced_mode');
		}
	});
});
