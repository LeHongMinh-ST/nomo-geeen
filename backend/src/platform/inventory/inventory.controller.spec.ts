import { PATH_METADATA } from '@nestjs/common/constants';
import { InventoryController } from './inventory.controller';

describe('InventoryController', () => {
	function makeController() {
		const inventory = {
			list: jest.fn().mockResolvedValue({ items: [] }),
			detail: jest.fn().mockResolvedValue({}),
			expirySummary: jest.fn().mockResolvedValue({}),
		};
		return {
			controller: new InventoryController(inventory as never),
			inventory,
		};
	}

	const req = { user: { tenantId: 't-1' } } as never;

	it('passes the tenant from the token to the expiry summary', async () => {
		const { controller, inventory } = makeController();

		await controller.expirySummary(req);

		expect(inventory.expirySummary).toHaveBeenCalledWith('t-1');
	});

	it('exposes the summary at GET expiry-summary', () => {
		expect(
			Reflect.getMetadata(
				PATH_METADATA,
				InventoryController.prototype.expirySummary,
			),
		).toBe('expiry-summary');
	});

	/**
	 * Nest matches routes in declaration order, so ':productId' would swallow
	 * '/expiry-summary' if it were declared first. Guard the ordering.
	 */
	it('declares expiry-summary before the :productId catch-all', () => {
		const methods = Object.getOwnPropertyNames(
			InventoryController.prototype,
		).filter((name) => name !== 'constructor');

		expect(methods.indexOf('expirySummary')).toBeLessThan(
			methods.indexOf('detail'),
		);
	});
});
