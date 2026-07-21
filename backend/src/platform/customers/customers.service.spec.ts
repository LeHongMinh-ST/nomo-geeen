import { CustomersService } from './customers.service';

describe('CustomersService', () => {
	function makeService() {
		const prisma = {
			customer: {
				findMany: jest.fn(),
				count: jest.fn(),
				create: jest.fn(),
				findFirst: jest.fn(),
				update: jest.fn(),
			},
		};
		return { service: new CustomersService(prisma as never), prisma };
	}
	const row = {
		id: 'c1',
		code: null,
		name: 'Farmer',
		phone: '0901',
		address: null,
		type: 'FARMER',
		note: null,
		openingBalance: 0n,
		balance: 1200n,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
	it('lists active customers with bounded pagination and deterministic search', async () => {
		const { service, prisma } = makeService();
		prisma.customer.findMany.mockResolvedValue([row]);
		prisma.customer.count.mockResolvedValue(1);
		await expect(
			service.list('tenant-1', {
				search: '0901',
				page: 2,
				pageSize: 99,
			} as never),
		).resolves.toEqual({
			items: [expect.objectContaining({ balance: 1200 })],
			page: 2,
			pageSize: 20,
			total: 1,
		});
		expect(prisma.customer.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					tenantId: 'tenant-1',
					deletedAt: null,
					OR: expect.any(Array),
				}),
				orderBy: [{ name: 'asc' }, { id: 'asc' }],
				skip: 20,
				take: 20,
			}),
		);
	});
	it('requires a non-empty name and never writes balance fields', async () => {
		const { service, prisma } = makeService();
		await expect(
			service.create('tenant-1', { name: '  ' } as never),
		).rejects.toMatchObject({ response: { reason: 'VALIDATION_ERROR' } });
		prisma.customer.create.mockResolvedValue(row);
		await service.create('tenant-1', { name: ' New ', balance: 999 } as never);
		expect(prisma.customer.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: { tenantId: 'tenant-1', name: 'New' } }),
		);
	});
	it('soft-deletes only the verified active customer', async () => {
		const { service, prisma } = makeService();
		prisma.customer.findFirst.mockResolvedValue({ id: 'c1' });
		await expect(service.remove('tenant-1', 'c1')).resolves.toEqual({
			id: 'c1',
			deleted: true,
		});
		expect(prisma.customer.update).toHaveBeenCalledWith({
			where: { id: 'c1' },
			data: { deletedAt: expect.any(Date) },
		});
	});
});
