import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HandbookProtocolService } from './handbook-protocol.service';
import type { ReplaceProtocolsDto } from './dto/protocol.dto';

function makeService() {
	const tx = {
		diseaseProtocol: {
			deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
			create: jest.fn().mockResolvedValue({ id: 'proto-new' }),
		},
		diseaseProtocolItem: {
			createMany: jest.fn().mockResolvedValue({ count: 0 }),
		},
	};
	const prisma = {
		disease: { findFirst: jest.fn() },
		product: { findMany: jest.fn().mockResolvedValue([]) },
		diseaseProtocol: { findMany: jest.fn().mockResolvedValue([]) },
		$transaction: jest.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
	};
	const audit = { writeInTx: jest.fn() };
	return {
		service: new HandbookProtocolService(prisma as never, audit as never),
		prisma,
		tx,
		audit,
	};
}

const validItem = {
	productId: '11111111-1111-4111-8111-111111111111',
	doseAmount: 25,
	doseUnit: 'ml',
	perAreaAmount: 1000,
	perAreaUnit: 'M2' as const,
};

function payload(
	overrides: Partial<ReplaceProtocolsDto['protocols'][number]>[] = [],
): ReplaceProtocolsDto {
	return {
		protocols: overrides.length
			? (overrides as ReplaceProtocolsDto['protocols'])
			: [{ name: 'Phác đồ 1', items: [validItem] }],
	};
}

describe('HandbookProtocolService.replaceAll', () => {
	it('404s when the disease belongs to another tenant', async () => {
		const { service, prisma } = makeService();
		prisma.disease.findFirst.mockResolvedValue(null);

		await expect(
			service.replaceAll('tenant-1', 'user-1', 'd1', payload()),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it('scopes the disease lookup to the tenant', async () => {
		const { service, prisma } = makeService();
		prisma.disease.findFirst.mockResolvedValue({ id: 'd1' });
		prisma.product.findMany.mockResolvedValue([{ id: validItem.productId }]);

		await service.replaceAll('tenant-1', 'user-1', 'd1', payload());

		expect(prisma.disease.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'd1', tenantId: 'tenant-1', deletedAt: null },
			}),
		);
	});

	it('rejects a product from another tenant', async () => {
		const { service, prisma } = makeService();
		prisma.disease.findFirst.mockResolvedValue({ id: 'd1' });
		prisma.product.findMany.mockResolvedValue([]);

		await expect(
			service.replaceAll('tenant-1', 'user-1', 'd1', payload()),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it('rejects a drug line with neither product nor ingredient', async () => {
		const { service, prisma } = makeService();
		prisma.disease.findFirst.mockResolvedValue({ id: 'd1' });

		await expect(
			service.replaceAll(
				'tenant-1',
				'user-1',
				'd1',
				payload([
					{
						name: 'P',
						items: [{ ...validItem, productId: undefined }],
					},
				]),
			),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it('accepts a line carrying only an active ingredient', async () => {
		const { service, prisma, tx } = makeService();
		prisma.disease.findFirst.mockResolvedValue({ id: 'd1' });

		await service.replaceAll(
			'tenant-1',
			'user-1',
			'd1',
			payload([
				{
					name: 'P',
					items: [
						{
							...validItem,
							productId: undefined,
							activeIngredient: 'Tricyclazole',
						},
					],
				},
			]),
		);

		expect(tx.diseaseProtocolItem.createMany).toHaveBeenCalledWith({
			data: [
				expect.objectContaining({
					productId: null,
					activeIngredient: 'Tricyclazole',
				}),
			],
		});
	});

	it('deletes existing protocols before recreating them', async () => {
		const { service, prisma, tx } = makeService();
		prisma.disease.findFirst.mockResolvedValue({ id: 'd1' });
		prisma.product.findMany.mockResolvedValue([{ id: validItem.productId }]);

		await service.replaceAll('tenant-1', 'user-1', 'd1', payload());

		expect(tx.diseaseProtocol.deleteMany).toHaveBeenCalledWith({
			where: { tenantId: 'tenant-1', diseaseId: 'd1' },
		});
		expect(tx.diseaseProtocol.create).toHaveBeenCalledTimes(1);
	});

	it('clears every protocol when given an empty list', async () => {
		const { service, prisma, tx } = makeService();
		prisma.disease.findFirst.mockResolvedValue({ id: 'd1' });

		await service.replaceAll('tenant-1', 'user-1', 'd1', { protocols: [] });

		expect(tx.diseaseProtocol.deleteMany).toHaveBeenCalled();
		expect(tx.diseaseProtocol.create).not.toHaveBeenCalled();
	});

	it('marks the first protocol default when none is flagged', async () => {
		const { service, prisma, tx } = makeService();
		prisma.disease.findFirst.mockResolvedValue({ id: 'd1' });
		prisma.product.findMany.mockResolvedValue([{ id: validItem.productId }]);

		await service.replaceAll(
			'tenant-1',
			'user-1',
			'd1',
			payload([
				{ name: 'A', items: [validItem] },
				{ name: 'B', items: [validItem] },
			]),
		);

		expect(tx.diseaseProtocol.create).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				data: expect.objectContaining({ isDefault: true, sortOrder: 0 }),
			}),
		);
		expect(tx.diseaseProtocol.create).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				data: expect.objectContaining({ isDefault: false, sortOrder: 1 }),
			}),
		);
	});

	it('honours exactly one flagged default', async () => {
		const { service, prisma, tx } = makeService();
		prisma.disease.findFirst.mockResolvedValue({ id: 'd1' });
		prisma.product.findMany.mockResolvedValue([{ id: validItem.productId }]);

		await service.replaceAll(
			'tenant-1',
			'user-1',
			'd1',
			payload([
				{ name: 'A', items: [validItem] },
				{ name: 'B', isDefault: true, items: [validItem] },
				{ name: 'C', isDefault: true, items: [validItem] },
			]),
		);

		const defaults = tx.diseaseProtocol.create.mock.calls.map(
			([arg]) => (arg as { data: { isDefault: boolean } }).data.isDefault,
		);
		expect(defaults).toEqual([false, true, false]);
	});

	it('writes an audit entry with protocol and item counts', async () => {
		const { service, prisma, audit } = makeService();
		prisma.disease.findFirst.mockResolvedValue({ id: 'd1' });
		prisma.product.findMany.mockResolvedValue([{ id: validItem.productId }]);

		await service.replaceAll(
			'tenant-1',
			'user-1',
			'd1',
			payload([{ name: 'A', items: [validItem, validItem] }]),
		);

		expect(audit.writeInTx).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				tenantId: 'tenant-1',
				action: 'HANDBOOK_PROTOCOL_UPDATE',
				after: { protocolCount: 1, itemCount: 2 },
			}),
		);
	});
});
