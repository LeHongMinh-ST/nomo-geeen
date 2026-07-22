import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import {
	BusinessGroup,
	ConversionKind,
	Prisma,
	ProductKind,
} from '@prisma/client';
import { EntitlementService } from '../entitlements/entitlement.service';
import { TenantQuotaCounterService } from '../entitlements/tenant-quota-counter.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ProductLookupResponse } from './dto/product-lookup.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import {
	assertSelectableBusinessGroup,
	resolveBusinessGroup,
	validateProductContract,
} from './product-contract';

type ProductRow = {
	id: string;
	sku: string;
	name: string;
	barcode: string | null;
	baseUnitId: string;
	categoryId: string | null;
	brandId: string | null;
	manufacturerId: string | null;
	domain: string | null;
	productKind: ProductKind;
	businessGroup: BusinessGroup | null;
	attrs: Prisma.JsonValue | null;
	costPrice: bigint;
	salePrice: bigint;
	wholesalePrice: bigint | null;
	isLocked: boolean;
	isRecalled: boolean;
	status: string;
	createdAt: Date;
	updatedAt?: Date;
	conversions?: Array<{
		unitId: string;
		factorToBase: Prisma.Decimal;
		kind: string;
		unit: { id: string; code: string; name: string };
	}>;
};

@Injectable()
export class ProductsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly entitlements: EntitlementService,
		private readonly counters: TenantQuotaCounterService,
	) {}

	async list(tenantId: string) {
		const products = await this.prisma.product.findMany({
			where: { tenantId, deletedAt: null },
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			take: 100,
			select: {
				id: true,
				sku: true,
				name: true,
				barcode: true,
				baseUnitId: true,
				categoryId: true,
				brandId: true,
				manufacturerId: true,
				domain: true,
				productKind: true,
				businessGroup: true,
				attrs: true,
				costPrice: true,
				salePrice: true,
				wholesalePrice: true,
				isLocked: true,
				isRecalled: true,
				status: true,
				createdAt: true,
			},
		});
		const stockRows = products.length
			? await this.prisma.stock.groupBy({
					by: ['productId'],
					where: {
						tenantId,
						productId: { in: products.map((product) => product.id) },
					},
					_sum: { qty: true },
				})
			: [];
		const stockByProduct = new Map(
			stockRows.map((row) => [row.productId, row._sum.qty]),
		);
		return products.map((product) =>
			this.toPublicProduct(product, stockByProduct.get(product.id)),
		);
	}

	async findById(tenantId: string, id: string) {
		const product = await this.prisma.product.findFirst({
			where: { id, tenantId, deletedAt: null },
			select: {
				id: true,
				sku: true,
				name: true,
				barcode: true,
				baseUnitId: true,
				categoryId: true,
				brandId: true,
				manufacturerId: true,
				domain: true,
				productKind: true,
				businessGroup: true,
				attrs: true,
				costPrice: true,
				salePrice: true,
				wholesalePrice: true,
				isLocked: true,
				isRecalled: true,
				status: true,
				createdAt: true,
				updatedAt: true,
				conversions: {
					where: {
						kind: { in: [ConversionKind.PURCHASE, ConversionKind.BOTH] },
					},
					select: {
						unitId: true,
						factorToBase: true,
						kind: true,
						unit: { select: { id: true, code: true, name: true } },
					},
				},
			},
		});
		if (!product) throw new NotFoundException('Product not found');
		const stock = await this.prisma.stock.aggregate({
			where: { tenantId, productId: product.id },
			_sum: { qty: true },
		});
		return this.toPublicProduct(product, stock._sum.qty);
	}

	async lookups(tenantId: string): Promise<ProductLookupResponse> {
		const [categories, brands, manufacturers, units] = await Promise.all([
			this.prisma.category.findMany({
				where: { tenantId, deletedAt: null },
				select: { id: true, name: true },
				orderBy: { name: 'asc' },
			}),
			this.prisma.brand.findMany({
				where: { tenantId, deletedAt: null },
				select: { id: true, name: true },
				orderBy: { name: 'asc' },
			}),
			this.prisma.manufacturer.findMany({
				where: { tenantId, deletedAt: null },
				select: { id: true, name: true },
				orderBy: { name: 'asc' },
			}),
			this.prisma.unit.findMany({
				where: { tenantId, deletedAt: null },
				select: { id: true, code: true, name: true },
				orderBy: { name: 'asc' },
			}),
		]);
		return { categories, brands, manufacturers, units };
	}

	async businessGroups(tenantId: string) {
		const configured = await this.prisma.tenantBusinessGroup.findMany({
			where: { tenantId },
			select: { businessGroup: true, enabled: true },
			orderBy: { businessGroup: 'asc' },
		});
		return { configured: configured.length > 0, groups: configured };
	}

	async updateBusinessGroups(tenantId: string, enabledGroups: BusinessGroup[]) {
		const enabled = new Set(enabledGroups);
		return this.prisma.$transaction(async (tx) => {
			for (const businessGroup of Object.values(BusinessGroup)) {
				await tx.tenantBusinessGroup.upsert({
					where: { tenantId_businessGroup: { tenantId, businessGroup } },
					create: {
						tenantId,
						businessGroup,
						enabled: enabled.has(businessGroup),
					},
					update: { enabled: enabled.has(businessGroup) },
				});
			}
			const groups = await tx.tenantBusinessGroup.findMany({
				where: { tenantId },
				select: { businessGroup: true, enabled: true },
				orderBy: { businessGroup: 'asc' },
			});
			return { configured: groups.length > 0, groups };
		});
	}

	async create(tenantId: string, dto: CreateProductDto) {
		const sku = dto.sku.trim();
		const name = dto.name.trim();
		if (!sku || !name)
			throw new BadRequestException('sku and name are required');
		validateProductContract(dto.productKind, dto.businessGroup, dto.attrs);

		return this.prisma.$transaction(async (tx) => {
			await this.entitlements.assertFeature(tenantId, 'inventory', tx);
			await this.counters.reserve(tx, tenantId, 'maxProducts', 1n);
			const unit = await tx.unit.findFirst({
				where: { id: dto.baseUnitId, tenantId, deletedAt: null },
				select: { id: true },
			});
			if (!unit) throw new NotFoundException('Base unit not found');
			if (dto.categoryId) {
				const category = await tx.category.findFirst({
					where: { id: dto.categoryId, tenantId, deletedAt: null },
					select: { id: true },
				});
				if (!category) throw new NotFoundException('Category not found');
			}
			if (dto.businessGroup) {
				const configuredGroups = await tx.tenantBusinessGroup.findMany({
					where: { tenantId },
					select: { businessGroup: true, enabled: true },
				});
				assertSelectableBusinessGroup(dto.businessGroup, configuredGroups);
			}

			try {
				return await tx.product.create({
					data: {
						tenantId,
						sku,
						name,
						barcode: dto.barcode?.trim() || null,
						baseUnitId: unit.id,
						categoryId: dto.categoryId,
						brandId: await this.validateReference(
							tx,
							'brand',
							tenantId,
							dto.brandId,
						),
						manufacturerId: await this.validateReference(
							tx,
							'manufacturer',
							tenantId,
							dto.manufacturerId,
						),
						productKind: dto.productKind,
						businessGroup: dto.businessGroup,
						attrs: dto.attrs as Prisma.InputJsonValue | undefined,
						costPrice: BigInt(dto.costPrice),
						salePrice: BigInt(dto.salePrice),
						wholesalePrice:
							dto.wholesalePrice == null ? null : BigInt(dto.wholesalePrice),
					},
					select: { id: true, sku: true, name: true, baseUnitId: true },
				});
			} catch (error) {
				if (this.isSkuConflict(error)) {
					throw new BadRequestException('SKU already exists');
				}
				throw error;
			}
		});
	}

	async update(tenantId: string, id: string, dto: UpdateProductDto) {
		if (dto.sku !== undefined && !dto.sku.trim())
			throw new BadRequestException('sku is required');
		if (dto.name !== undefined && !dto.name.trim())
			throw new BadRequestException('name is required');
		return this.prisma.$transaction(async (tx) => {
			const current = await tx.product.findFirst({
				where: { id, tenantId, deletedAt: null },
				select: {
					id: true,
					productKind: true,
					businessGroup: true,
					attrs: true,
				},
			});
			if (!current) throw new NotFoundException('Product not found');
			const nextKind = dto.productKind ?? current.productKind;
			const nextGroup = dto.businessGroup ?? current.businessGroup;
			const nextAttrs = dto.attrs ?? current.attrs;
			validateProductContract(
				nextKind === ProductKind.OTHER ? null : nextKind,
				nextGroup,
				nextAttrs,
			);
			if (nextGroup) {
				const configuredGroups = await tx.tenantBusinessGroup.findMany({
					where: { tenantId },
					select: { businessGroup: true, enabled: true },
				});
				assertSelectableBusinessGroup(nextGroup, configuredGroups);
			}
			if (dto.baseUnitId)
				await this.requireReference(
					tx,
					'unit',
					tenantId,
					dto.baseUnitId,
					'Base unit not found',
				);
			if (dto.categoryId)
				await this.requireReference(
					tx,
					'category',
					tenantId,
					dto.categoryId,
					'Category not found',
				);
			if (dto.brandId)
				await this.requireReference(
					tx,
					'brand',
					tenantId,
					dto.brandId,
					'Brand not found',
				);
			if (dto.manufacturerId)
				await this.requireReference(
					tx,
					'manufacturer',
					tenantId,
					dto.manufacturerId,
					'Manufacturer not found',
				);
			try {
				const product = await tx.product.update({
					where: { id },
					data: {
						sku: dto.sku?.trim(),
						name: dto.name?.trim(),
						barcode:
							dto.barcode === undefined
								? undefined
								: dto.barcode.trim() || null,
						baseUnitId: dto.baseUnitId,
						categoryId: dto.categoryId,
						brandId: dto.brandId,
						manufacturerId: dto.manufacturerId,
						costPrice:
							dto.costPrice === undefined ? undefined : BigInt(dto.costPrice),
						salePrice:
							dto.salePrice === undefined ? undefined : BigInt(dto.salePrice),
						wholesalePrice:
							dto.wholesalePrice === undefined
								? undefined
								: dto.wholesalePrice === null
									? null
									: BigInt(dto.wholesalePrice),
						isLocked: dto.isLocked,
						productKind: dto.productKind,
						businessGroup: dto.businessGroup,
						attrs: dto.attrs as Prisma.InputJsonValue | undefined,
					},
					select: this.productSelect(),
				});
				const stock = await tx.stock.aggregate({
					where: { tenantId, productId: product.id },
					_sum: { qty: true },
				});
				return this.toPublicProduct(product, stock._sum.qty);
			} catch (error) {
				if (this.isSkuConflict(error))
					throw new BadRequestException('SKU already exists');
				throw error;
			}
		});
	}

	async remove(tenantId: string, id: string) {
		const result = await this.prisma.product.updateMany({
			where: { id, tenantId, deletedAt: null },
			data: { deletedAt: new Date() },
		});
		if (result.count === 0) throw new NotFoundException('Product not found');
		return { id, deleted: true };
	}

	private productSelect() {
		return {
			id: true,
			sku: true,
			name: true,
			barcode: true,
			baseUnitId: true,
			categoryId: true,
			brandId: true,
			manufacturerId: true,
			domain: true,
			productKind: true,
			businessGroup: true,
			attrs: true,
			costPrice: true,
			salePrice: true,
			wholesalePrice: true,
			isLocked: true,
			isRecalled: true,
			status: true,
			createdAt: true,
			updatedAt: true,
			conversions: {
				where: { kind: { in: [ConversionKind.PURCHASE, ConversionKind.BOTH] } },
				select: {
					unitId: true,
					factorToBase: true,
					kind: true,
					unit: { select: { id: true, code: true, name: true } },
				},
			},
		} as const satisfies Prisma.ProductSelect;
	}

	private toPublicProduct(product: ProductRow, stockQty?: unknown) {
		return {
			...product,
			businessGroup:
				product.businessGroup ??
				resolveBusinessGroup(product.productKind, product.domain),
			costPrice: product.costPrice.toString(),
			salePrice: product.salePrice.toString(),
			wholesalePrice: product.wholesalePrice?.toString() ?? null,
			stock: stockQty?.toString() ?? '0',
			conversions: (product.conversions ?? []).map((conversion) => ({
				unitId: conversion.unitId,
				factor: Number(conversion.factorToBase),
				kind: conversion.kind,
				unit: conversion.unit.name,
			})),
		};
	}

	private async validateReference(
		tx: Prisma.TransactionClient,
		model: 'brand' | 'manufacturer',
		tenantId: string,
		id: string | undefined,
	) {
		if (!id) return null;
		return this.requireReference(tx, model, tenantId, id, `${model} not found`);
	}

	private async requireReference(
		tx: Prisma.TransactionClient,
		model: 'unit' | 'category' | 'brand' | 'manufacturer',
		tenantId: string,
		id: string,
		message: string,
	) {
		const where = { id, tenantId, deletedAt: null };
		const row =
			model === 'unit'
				? await tx.unit.findFirst({ where, select: { id: true } })
				: model === 'category'
					? await tx.category.findFirst({ where, select: { id: true } })
					: model === 'brand'
						? await tx.brand.findFirst({ where, select: { id: true } })
						: await tx.manufacturer.findFirst({ where, select: { id: true } });
		if (!row) throw new NotFoundException(message);
		return row.id;
	}

	private isSkuConflict(error: unknown): boolean {
		return (
			typeof error === 'object' &&
			error !== null &&
			'code' in error &&
			(error as Prisma.PrismaClientKnownRequestError).code === 'P2002'
		);
	}
}
