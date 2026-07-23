import { BadRequestException, NotFoundException } from '@nestjs/common';
import { HandbookCategory } from '@prisma/client';
import { HandbookService } from './handbook.service';

describe('HandbookService', () => {
	function makeService() {
		const tx = {
			disease: {
				create: jest.fn(),
				update: jest.fn(),
				findFirstOrThrow: jest.fn(),
			},
			diseaseIngredient: {
				createMany: jest.fn(),
				deleteMany: jest.fn(),
			},
		};
		const prisma = {
			disease: {
				findMany: jest.fn(),
				count: jest.fn(),
				findFirst: jest.fn(),
				groupBy: jest.fn(),
			},
			$transaction: jest.fn(async (cb: (client: typeof tx) => unknown) =>
				cb(tx),
			),
		};
		return {
			service: new HandbookService(prisma as never),
			prisma,
			tx,
		};
	}

	it('rejects non-selectable category on create', async () => {
		const { service, prisma } = makeService();
		await expect(
			service.create('tenant-1', {
				name: 'X',
				category: 'UNCATEGORIZED' as never,
			}),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it('creates entry with selectable category and returns label', async () => {
		const { service, tx } = makeService();
		tx.disease.create.mockResolvedValue({ id: 'd1' });
		tx.diseaseIngredient.createMany.mockResolvedValue({ count: 1 });
		tx.disease.findFirstOrThrow.mockResolvedValue({
			id: 'd1',
			tenantId: 'tenant-1',
			name: 'Đạo ôn',
			aliases: ['cháy lá'],
			domain: 'GENERAL',
			handbookCategory: HandbookCategory.CROP_PROTECTION_AND_FERTILIZER,
			target: 'Lúa',
			type: null,
			symptom: 'vết thoi',
			note: null,
			isPinned: false,
			sortOrder: 0,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			ingredients: [{ activeIngredient: 'Tricyclazole', sortOrder: 0 }],
			pins: [],
		});
		const result = await service.create('tenant-1', {
			name: 'Đạo ôn',
			category: 'CROP_PROTECTION_AND_FERTILIZER' as never,
			subject: 'Lúa',
			symptom: 'vết thoi',
			aliases: ['cháy lá'],
			recommendedIngredients: ['Tricyclazole'],
		});
		expect(result.category).toBe(
			HandbookCategory.CROP_PROTECTION_AND_FERTILIZER,
		);
		expect(result.categoryLabel).toBe('Thuốc bảo vệ thực vật + Phân bón');
		expect(tx.disease.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					tenantId: 'tenant-1',
					handbookCategory: HandbookCategory.CROP_PROTECTION_AND_FERTILIZER,
				}),
			}),
		);
	});

	it('lists only tenant-scoped rows with category filter', async () => {
		const { service, prisma } = makeService();
		prisma.disease.findMany.mockResolvedValue([]);
		prisma.disease.count.mockResolvedValue(0);
		await service.list('tenant-1', {
			category: HandbookCategory.VETERINARY_DRUGS,
			page: 1,
			pageSize: 20,
		});
		expect(prisma.disease.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					tenantId: 'tenant-1',
					deletedAt: null,
					handbookCategory: HandbookCategory.VETERINARY_DRUGS,
				}),
			}),
		);
	});

	it('throws not found for other tenant detail', async () => {
		const { service, prisma } = makeService();
		prisma.disease.findFirst.mockResolvedValue(null);
		await expect(service.findById('tenant-1', 'd-x')).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});

	it('maps DISEASE type explicitly and searches aliasesSearch', async () => {
		const { service, prisma, tx } = makeService();
		prisma.disease.findMany.mockResolvedValue([]);
		prisma.disease.count.mockResolvedValue(0);
		await service.list('tenant-1', {
			search: 'cháy lá',
			page: 1,
			pageSize: 20,
		});
		const where = prisma.disease.findMany.mock.calls[0][0].where;
		expect(where.OR).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					aliasesSearch: expect.objectContaining({ contains: 'cháy lá' }),
				}),
			]),
		);

		tx.disease.create.mockResolvedValue({ id: 'd2' });
		tx.disease.findFirstOrThrow.mockResolvedValue({
			id: 'd2',
			tenantId: 'tenant-1',
			name: 'X',
			aliases: null,
			domain: 'GENERAL',
			handbookCategory: HandbookCategory.ANIMAL_FEED,
			target: null,
			type: 'OTHER',
			symptom: null,
			note: null,
			isPinned: false,
			sortOrder: 0,
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			ingredients: [],
			pins: [],
		});
		await service.create('tenant-1', {
			name: 'X',
			category: 'ANIMAL_FEED' as never,
			type: 'OTHER' as never,
		});
		expect(tx.disease.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ type: 'OTHER' }),
			}),
		);
	});
});
