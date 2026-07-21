import { CustomersController } from './customers.controller';

describe('CustomersController', () => {
	it('delegates the verified tenant identity to the service', async () => {
		const service = {
			list: jest
				.fn()
				.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 }),
		};
		const controller = new CustomersController(service as never);
		await controller.list(
			{ user: { tenantId: 'tenant-1' } } as never,
			{ page: 1, pageSize: 20 } as never,
		);
		expect(service.list).toHaveBeenCalledWith('tenant-1', {
			page: 1,
			pageSize: 20,
		});
	});
});
