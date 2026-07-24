import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
	it('returns tenant-scoped stock and batch rows', async () => {
		const prisma = {
			stock: { findMany: jest.fn().mockResolvedValue([{ warehouseId: 'w1', productId: 'p1', qty: '4', avgCost: 100n, product: { id: 'p1', name: 'Pesticide', productKind: 'PESTICIDE', businessGroup: 'CROP_INPUTS', sku: 'SKU-1', baseUnitId: 'u1' } }]) },
			productBatch: { findMany: jest.fn().mockResolvedValue([{ productId: 'p1', warehouseId: 'w1', qtyOnHand: '4' }]) },
		} as never;
		const result = await new ReportsService(prisma).stockSummary('tenant-1');
		expect(result.items).toHaveLength(1);
		expect(result.items[0].batches).toHaveLength(1);
		expect(prisma.stock.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-1' } }));
	});

	it('rejects inverted and oversized date ranges', async () => {
		const service = new ReportsService({} as never);
		await expect(service.salesSummary('tenant-1', { from: '2026-02-01', to: '2026-01-01' })).rejects.toBeInstanceOf(BadRequestException);
		await expect(service.salesSummary('tenant-1', { from: '2024-01-01', to: '2026-01-01' })).rejects.toBeInstanceOf(BadRequestException);
	});
});
