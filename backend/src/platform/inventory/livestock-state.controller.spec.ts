import 'reflect-metadata';
import { LivestockHealthState } from '@prisma/client';
import { TENANT_PERMISSIONS_KEY } from '../auth/decorators/require-tenant-permission.decorator';
import { ENTITLEMENT_FEATURE_KEY } from '../entitlements/entitlement.constants';
import { LivestockStateController } from './livestock-state.controller';
import { LivestockStateService } from './livestock-state.service';

describe('LivestockStateController', () => {
	it('forwards health-state change with tenant identity only', () => {
		const service = {
			changeState: jest.fn().mockReturnValue({
				id: 'batch-1',
				healthState: LivestockHealthState.QUARANTINED,
				version: 1,
			}),
		} as unknown as LivestockStateService;
		const controller = new LivestockStateController(service);
		const request = { user: { tenantId: 'tenant-1', id: 'user-1' } } as never;
		const dto = {
			toState: LivestockHealthState.QUARANTINED,
			expectedVersion: 0,
			reason: 'check',
		} as never;

		expect(controller.changeHealthState(request, 'batch-1', dto)).toEqual({
			id: 'batch-1',
			healthState: LivestockHealthState.QUARANTINED,
			version: 1,
		});
		expect(service.changeState).toHaveBeenCalledWith(
			'tenant-1',
			'user-1',
			'batch-1',
			{
				toState: LivestockHealthState.QUARANTINED,
				expectedVersion: 0,
				reason: 'check',
				note: undefined,
			},
		);
		expect(
			Reflect.getMetadata(
				TENANT_PERMISSIONS_KEY,
				LivestockStateController.prototype.changeHealthState,
			),
		).toEqual(['inventory:edit']);
		expect(
			Reflect.getMetadata(
				ENTITLEMENT_FEATURE_KEY,
				LivestockStateController.prototype.changeHealthState,
			),
		).toBe('inventory');
	});
});
