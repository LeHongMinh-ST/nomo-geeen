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
			warehouse: { findFirst: jest.fn() },
			product: { findMany: jest.fn() },
			$transaction: jest.fn(async (cb: (client: typeof tx) => unknown) =>
				cb(tx),
			),
		};
		const audit = { writeInTx: jest.fn() };
		const protocols = { listForDisease: jest.fn().mockResolvedValue([]) };
		return {
			service: new HandbookService(
				prisma as never,
				audit as never,
				protocols as never,
			),
			prisma,
			tx,
			audit,
			protocols,
		};
	}

	it('rejects non-selectable category on create', async () => {
		const { service, prisma, audit } = makeService();
		await expect(
			service.create('tenant-1', 'user-1', {
				name: 'X',
				category: 'UNCATEGORIZED' as never,
			}),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.$transaction).not.toHaveBeenCalled();
		expect(audit.writeInTx).not.toHaveBeenCalled();
	});

	it('creates entry with selectable category and returns label', async () => {
		const { service, tx, audit } = makeService();
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
		const result = await service.create('tenant-1', 'user-1', {
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
		expect(audit.writeInTx).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				action: 'HANDBOOK_CREATE',
				after: expect.objectContaining({
					category: HandbookCategory.CROP_PROTECTION_AND_FERTILIZER,
				}),
			}),
		);
	});

	it('audits Handbook update with category metadata only', async () => {
		const { service, prisma, tx, audit } = makeService();
		prisma.disease.findFirst.mockResolvedValue({
			id: 'd1',
			tenantId: 'tenant-1',
			deletedAt: null,
		});
		tx.disease.update.mockResolvedValue({});
		tx.disease.findFirstOrThrow.mockResolvedValue({
			id: 'd1',
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
		await service.update('tenant-1', 'user-1', 'd1', {
			category: 'ANIMAL_FEED' as never,
			note: 'secret note',
		});
		expect(audit.writeInTx).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				action: 'HANDBOOK_UPDATE',
				after: expect.objectContaining({
					category: HandbookCategory.ANIMAL_FEED,
				}),
			}),
		);
		const auditInput = audit.writeInTx.mock.calls[0][1];
		expect(auditInput.after).not.toHaveProperty('note');
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
					aliasesSearch: expect.objectContaining({ contains: 'chay la' }),
				}),
				expect.objectContaining({
					nameSearch: expect.objectContaining({ contains: 'chay la' }),
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
		await service.create('tenant-1', 'user-1', {
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

	it('returns tenant-scoped ranked quick-sale suggestions and consult fields', async () => {
		const { service, prisma } = makeService();
		prisma.disease.findFirst.mockResolvedValue({
			id: 'd1', tenantId: 'tenant-1', name: 'Đạo ôn', aliases: ['cháy lá'], handbookCategory: HandbookCategory.CROP_PROTECTION_AND_FERTILIZER, symptom: 'vết thoi',
			ingredients: [{ activeIngredient: 'Tricyclazole' }], pins: [{ productId: 'pinned', isExcluded: false }, { productId: 'excluded', isExcluded: true }], consultFields: [{ fieldKey: 'area', label: 'Diện tích', fieldType: 'NUMBER', unit: 'ha', required: false, options: null, sortOrder: 0 }],
			protocols: [],
		});
		prisma.warehouse.findFirst.mockResolvedValue({ id: 'w1' });
		prisma.product.findMany.mockResolvedValue([
			{ id: 'pinned', name: 'Thuốc ghim', activeIngredient: null, pestTags: [], status: 'ACTIVE', isLocked: false, isRecalled: false, salePrice: 100n, baseUnit: { id: 'u1', name: 'Chai' }, stocks: [{ qty: 2 }] },
			{ id: 'ingredient', name: 'Thuốc hoạt chất', activeIngredient: 'Tricyclazole 75%', pestTags: [], status: 'ACTIVE', isLocked: false, isRecalled: false, salePrice: 200n, baseUnit: { id: 'u1', name: 'Chai' }, stocks: [{ qty: 0 }] },
		]);
		const result = await service.quickSuggestions('tenant-1', 'd1');
		expect(result.consultFields).toHaveLength(1);
		expect(result.suggestions[0]).toMatchObject({ productId: 'pinned', reason: 'OWNER_PIN', available: true });
		expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1' }) }));
	});

	describe('quickSuggestions protocols', () => {
		function seedDisease(prisma: ReturnType<typeof makeService>['prisma']) {
			prisma.disease.findFirst.mockResolvedValue({
				id: 'd1',
				tenantId: 'tenant-1',
				name: 'Đạo ôn',
				aliases: [],
				handbookCategory: HandbookCategory.CROP_PROTECTION_AND_FERTILIZER,
				symptom: null,
				ingredients: [],
				pins: [],
				consultFields: [],
				protocols: [
					{
						id: 'proto-1',
						name: 'Phác đồ chính',
						note: null,
						isDefault: true,
						sortOrder: 0,
						items: [
							{
								id: 'item-1',
								productId: 'p1',
								activeIngredient: null,
								doseAmount: 25,
								doseUnit: 'ml',
								perAreaAmount: 1000,
								perAreaUnit: 'M2',
								mixing: 'Pha 20 lít nước',
								usage: 'Phun đều',
								sortOrder: 0,
								product: {
									id: 'p1',
									name: 'Thuốc A',
									netContent: 100,
									netContentUnit: 'ml',
								},
							},
						],
					},
				],
			});
			prisma.warehouse.findFirst.mockResolvedValue({ id: 'w1' });
			prisma.product.findMany.mockResolvedValue([
				{
					id: 'p1',
					name: 'Thuốc A',
					activeIngredient: null,
					pestTags: [],
					status: 'ACTIVE',
					isLocked: false,
					isRecalled: false,
					salePrice: 50000n,
					baseUnit: { id: 'u1', name: 'Chai' },
					stocks: [{ qty: 10 }],
				},
			]);
		}

		it('computes needAmount and packs for the given area', async () => {
			const { service, prisma } = makeService();
			seedDisease(prisma);

			const result = await service.quickSuggestions('tenant-1', 'd1', {
				areaValue: 3,
				areaUnit: 'CONG_NAM',
			});

			expect(result.area).toEqual({
				value: 3,
				unit: 'CONG_NAM',
				squareMeters: 3000,
			});
			expect(result.protocols[0]).toMatchObject({
				id: 'proto-1',
				status: 'FULL',
			});
			expect(result.protocols[0].items[0]).toMatchObject({
				needAmount: 75,
				needUnit: 'ml',
				packs: 1,
				inStock: true,
				mixing: 'Pha 20 lít nước',
				usage: 'Phun đều',
			});
		});

		it('omits quantities when no area is supplied', async () => {
			const { service, prisma } = makeService();
			seedDisease(prisma);

			const result = await service.quickSuggestions('tenant-1', 'd1');

			expect(result.area).toBeNull();
			expect(result.protocols[0].items[0]).toMatchObject({
				needAmount: null,
				packs: null,
				cannotComputePacksReason: 'NO_AREA',
			});
		});

		it('marks the protocol OUT when the product is out of stock', async () => {
			const { service, prisma } = makeService();
			seedDisease(prisma);
			prisma.product.findMany.mockResolvedValue([
				{
					id: 'p1',
					name: 'Thuốc A',
					activeIngredient: null,
					pestTags: [],
					status: 'ACTIVE',
					isLocked: false,
					isRecalled: false,
					salePrice: 50000n,
					baseUnit: { id: 'u1', name: 'Chai' },
					stocks: [{ qty: 0 }],
				},
			]);

			const result = await service.quickSuggestions('tenant-1', 'd1', {
				areaValue: 1000,
				areaUnit: 'M2',
			});

			expect(result.protocols[0].status).toBe('OUT');
			expect(result.protocols[0].items[0].inStock).toBe(false);
		});

		it('rejects a non-positive area', async () => {
			const { service, prisma } = makeService();
			seedDisease(prisma);

			await expect(
				service.quickSuggestions('tenant-1', 'd1', {
					areaValue: 0,
					areaUnit: 'M2',
				}),
			).rejects.toBeInstanceOf(BadRequestException);
		});
	});
});
