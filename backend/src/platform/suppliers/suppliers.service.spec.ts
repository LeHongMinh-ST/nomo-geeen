import 'reflect-metadata';
import { Prisma } from '@prisma/client';
import { SuppliersService } from './suppliers.service';

describe('SuppliersService', () => {
	function makeService() {
		const prisma = {
			supplier: {
				findMany: jest.fn(),
				count: jest.fn(),
				create: jest.fn(),
				findFirst: jest.fn(),
				update: jest.fn(),
			},
		};
		return { service: new SuppliersService(prisma as never), prisma };
	}
	const input = { code: ' SUP-01 ', name: ' Main supplier ', phone: '0901' };
	it('lists only active tenant suppliers with bounded pagination and search', async () => {
		const { service, prisma } = makeService();
		prisma.supplier.findMany.mockResolvedValue([
			{
				...input,
				id: 's1',
				code: 'SUP-01',
				name: 'Main supplier',
				supplierType: null,
				contactName: null,
				phone: '0901',
				email: null,
				address: null,
				taxCode: null,
				balance: 0n,
				status: 'ACTIVE',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);
		prisma.supplier.count.mockResolvedValue(1);
		const result = await service.list('tenant-1', {
			search: '0901',
			page: 2,
			pageSize: 99,
		} as never);
		expect(result).toEqual(
			expect.objectContaining({ page: 2, pageSize: 20, total: 1 }),
		);
		expect(prisma.supplier.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					tenantId: 'tenant-1',
					deletedAt: null,
					status: 'ACTIVE',
					OR: expect.any(Array),
				}),
				take: 20,
				skip: 20,
				orderBy: [{ name: 'asc' }, { id: 'asc' }],
			}),
		);
	});
	it.each([[{ code: '   ', name: 'Valid' }], [{ code: 'Valid', name: '   ' }]])(
		'rejects empty required fields on create',
		async (dto) => {
			const { service, prisma } = makeService();
			await expect(service.create('tenant-1', dto)).rejects.toMatchObject({
				response: { reason: 'VALIDATION_ERROR' },
			});
			expect(prisma.supplier.create).not.toHaveBeenCalled();
		},
	);
	it('rejects empty required fields on update and does not write balance', async () => {
		const { service, prisma } = makeService();
		prisma.supplier.findFirst.mockResolvedValue({ id: 's1' });
		await expect(
			service.update('tenant-1', 's1', { name: '  ' } as never),
		).rejects.toMatchObject({ response: { reason: 'VALIDATION_ERROR' } });
		expect(prisma.supplier.update).not.toHaveBeenCalled();
	});
	it('keeps inactive status updates aligned with soft-delete retention', async () => {
		const { service, prisma } = makeService();
		prisma.supplier.findFirst.mockResolvedValue({ id: 's1' });
		prisma.supplier.update.mockResolvedValue({
			id: 's1',
			code: 'SUP-1',
			name: 'Supplier',
			supplierType: null,
			contactName: null,
			phone: null,
			email: null,
			address: null,
			taxCode: null,
			balance: 0n,
			status: 'INACTIVE',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await service.update('tenant-1', 's1', { status: 'INACTIVE' } as never);
		expect(prisma.supplier.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: 'INACTIVE',
					deletedAt: expect.any(Date),
				}),
			}),
		);
	});
	it('serializes bigint balance as a JSON number', async () => {
		const { service, prisma } = makeService();
		prisma.supplier.findFirst.mockResolvedValue({
			id: 's1',
			code: 'SUP-1',
			name: 'Supplier',
			supplierType: null,
			contactName: null,
			phone: null,
			email: null,
			address: null,
			taxCode: null,
			balance: 123456n,
			status: 'ACTIVE',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await expect(service.findById('tenant-1', 's1')).resolves.toEqual(
			expect.objectContaining({ balance: 123456 }),
		);
		expect(prisma.supplier.findFirst).toHaveBeenCalledWith({
			where: {
				id: 's1',
				tenantId: 'tenant-1',
				deletedAt: null,
				status: 'ACTIVE',
			},
		});
	});
	it('does not return inactive suppliers from detail reads', async () => {
		const { service, prisma } = makeService();
		prisma.supplier.findFirst.mockResolvedValue(null);
		await expect(
			service.findById('tenant-1', 'inactive'),
		).rejects.toMatchObject({
			status: 404,
		});
	});
	it('normalizes create input and maps duplicate code to conflict', async () => {
		const { service, prisma } = makeService();
		prisma.supplier.create.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('duplicate', {
				code: 'P2002',
				clientVersion: 'test',
			}),
		);
		await expect(service.create('tenant-1', input)).rejects.toMatchObject({
			response: { reason: 'DUPLICATE_SUPPLIER_CODE' },
		});
		expect(prisma.supplier.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					tenantId: 'tenant-1',
					code: 'SUP-01',
					name: 'Main supplier',
					status: 'ACTIVE',
				}),
			}),
		);
	});
	it('soft-deletes inside the verified tenant and preserves record history', async () => {
		const { service, prisma } = makeService();
		const current = { id: 's1', tenantId: 'tenant-1' };
		prisma.supplier.findFirst.mockResolvedValue(current);
		prisma.supplier.update.mockResolvedValue({
			...current,
			code: 'SUP-01',
			name: 'Supplier',
			supplierType: null,
			contactName: null,
			phone: null,
			email: null,
			address: null,
			taxCode: null,
			balance: 100n,
			status: 'INACTIVE',
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		await expect(service.remove('tenant-1', 's1')).resolves.toEqual({
			id: 's1',
			deleted: true,
		});
		expect(prisma.supplier.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 's1' },
				data: expect.objectContaining({
					status: 'INACTIVE',
					deletedAt: expect.any(Date),
				}),
			}),
		);
	});
});
