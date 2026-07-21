import { SuppliersController } from './suppliers.controller';

describe('SuppliersController', () => {
	it('delegates tenant identity and DTOs to the service', async () => {
		const service = {
			list: jest
				.fn()
				.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 }),
			create: jest.fn(),
		};
		const controller = new SuppliersController(service as never);
		const request = { user: { tenantId: 'tenant-1' } } as never;
		await controller.list(request, { page: 1, pageSize: 20 } as never);
		expect(service.list).toHaveBeenCalledWith('tenant-1', {
			page: 1,
			pageSize: 20,
		});
	});
});
