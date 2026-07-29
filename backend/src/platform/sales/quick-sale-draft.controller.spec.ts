import 'reflect-metadata';
import { TENANT_PERMISSIONS_KEY } from '../auth/decorators/require-tenant-permission.decorator';
import { ENTITLEMENT_FEATURE_KEY } from '../entitlements/entitlement.constants';
import { QuickSaleDraftController } from './quick-sale-draft.controller';
import { QuickSaleDraftService } from './quick-sale-draft.service';
import { QuickSaleDraftEventsService } from './quick-sale-draft-events.service';

describe('QuickSaleDraftController', () => {
	it('exposes the protected routes with the right tenant permission metadata', () => {
		const drafts = {} as unknown as QuickSaleDraftService;
		const events = {} as unknown as QuickSaleDraftEventsService;
		const controller = new QuickSaleDraftController(drafts, events);

		// Reachability smoke-check (constructor wiring must not throw).
		expect(controller).toBeInstanceOf(QuickSaleDraftController);

		const cases: Array<{
			handler: keyof QuickSaleDraftController;
			permission: string;
			feature: string;
		}> = [
			{ handler: 'getCurrent', permission: 'sales:view', feature: 'inventory' },
			{ handler: 'create', permission: 'sales:create', feature: 'inventory' },
			{ handler: 'join', permission: 'sales:view', feature: 'inventory' },
			{ handler: 'addLine', permission: 'sales:create', feature: 'inventory' },
			{ handler: 'patch', permission: 'sales:edit', feature: 'inventory' },
			{
				handler: 'setLineQuantity',
				permission: 'sales:edit',
				feature: 'inventory',
			},
			{
				handler: 'removeLine',
				permission: 'sales:edit',
				feature: 'inventory',
			},
			{ handler: 'checkout', permission: 'sales:create', feature: 'inventory' },
			{ handler: 'close', permission: 'sales:edit', feature: 'inventory' },
		];

		for (const { handler, permission, feature } of cases) {
			const fn = QuickSaleDraftController.prototype[handler];
			expect(Reflect.getMetadata(TENANT_PERMISSIONS_KEY, fn)).toEqual([
				permission,
			]);
			expect(Reflect.getMetadata(ENTITLEMENT_FEATURE_KEY, fn)).toBe(feature);
		}
	});

	it('forwards join token lookups with tenant identity', async () => {
		const drafts = {
			findByToken: jest.fn().mockResolvedValue({ id: 'draft-1' }),
		} as unknown as QuickSaleDraftService;
		const events = {} as unknown as QuickSaleDraftEventsService;
		const controller = new QuickSaleDraftController(drafts, events);
		const request = {
			user: { tenantId: 'tenant-1', id: 'user-1' },
		} as never;

		const out = await controller.join(request, { joinToken: 'abc' } as never);
		expect(out).toEqual({ id: 'draft-1' });
		expect(drafts.findByToken as jest.Mock).toHaveBeenCalledWith(
			'tenant-1',
			'abc',
		);
	});
});
