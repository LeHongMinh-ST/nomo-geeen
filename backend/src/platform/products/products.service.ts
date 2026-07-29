import { randomUUID } from 'node:crypto';
import {
	BadRequestException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import {
	AuditAction,
	AuditActorType,
	BusinessGroup,
	ConversionKind,
	Prisma,
	ProductKind,
	ProductStatus,
} from '@prisma/client';
import { AuditLogger } from '../audit/audit-logger.service';
import type { TenantIdentity } from '../auth/token.service';
import { EntitlementService } from '../entitlements/entitlement.service';
import { TenantQuotaCounterService } from '../entitlements/tenant-quota-counter.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ProductConversionDto } from './dto/product-conversion.dto';
import type { ProductLookupResponse } from './dto/product-lookup.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import {
	BUSINESS_GROUP_CATALOG,
	BUSINESS_GROUP_FEATURES,
	DEFAULT_BUSINESS_GROUPS,
	hasSpecializedAttrs,
	resolveBusinessGroup,
	validateProductContract,
} from './product-contract';

type ProductRow = {
	id: string;
	sku: string;
	name: string;
	barcode: string | null;
	baseUnitId: string | null;
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
		private readonly audit: AuditLogger,
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
		const [brands, manufacturers, units] = await Promise.all([
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
		return { brands, manufacturers, units };
	}
	async businessGroups(tenantId: string) {
		const [entitlement, configuredGroups, counts] = await Promise.all([
			typeof this.entitlements.getEffectiveEntitlement === 'function'
				? this.entitlements.getEffectiveEntitlement(tenantId)
				: Promise.resolve({ featureCodes: [] as string[] }),
			this.prisma.tenantBusinessGroup.findMany({
				where: { tenantId },
				select: { businessGroup: true, enabled: true },
			}),
			this.countActiveProductsByGroup(this.prisma, tenantId),
		]);
		const available = new Set<BusinessGroup>(DEFAULT_BUSINESS_GROUPS);
		for (const group of Object.keys(
			BUSINESS_GROUP_FEATURES,
		) as BusinessGroup[]) {
			const feature = BUSINESS_GROUP_FEATURES[group];
			if (feature && entitlement.featureCodes.includes(feature))
				available.add(group);
		}
		const configured = new Map(
			configuredGroups.map((group) => [group.businessGroup, group.enabled]),
		);
		const groups = BUSINESS_GROUP_CATALOG.map(({ id: businessGroup }) => ({
			businessGroup,
			available: available.has(businessGroup),
			enabled:
				available.has(businessGroup) &&
				(configured.get(businessGroup) ?? true),
		}));
		return {
			configured: configuredGroups.length > 0,
			groups,
			productCounts: counts,
		};
	}

	async updateBusinessGroups(
		tenantId: string,
		enabledGroups: BusinessGroup[],
		actor?: Pick<TenantIdentity, 'id' | 'tenantId' | 'roleCode'>,
	) {
		const enabled = new Set(enabledGroups);
		// An empty set would lock the shop out of creating any product, because
		// assertSelectableBusinessGroup rejects every group once rows exist.
		if (enabled.size === 0)
		throw new UnprocessableEntityException({
				reason: 'NO_ENABLED_BUSINESS_GROUP',
				message: 'At least one business group must stay enabled',
		});
		for (const group of enabled) {
			if (!Object.values(BusinessGroup).includes(group))
				throw new BadRequestException('This product group is not available');
		}
		return this.prisma.$transaction(async (tx) => {
			for (const group of enabled)
				await this.assertBusinessGroupEntitlement(tenantId, group, tx);
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
			const productCounts = await this.countActiveProductsByGroup(tx, tenantId);
			if (actor)
				await this.audit.writeInTx(tx, {
					tenantId,
					actorId: actor.id,
					actorType: AuditActorType.USER,
					actorRoleCode: actor.roleCode,
					action: AuditAction.PRODUCT_GROUP_UPDATE,
					resource: 'product_business_group',
					after: { groups },
				});
			return { configured: groups.length > 0, groups, productCounts };
		});
	}

	/**
	 * Active, non-deleted product count per business group. Counts the stored
	 * `businessGroup` column only — that column is what the enable/disable flag
	 * gates, so legacy rows with a null group are deliberately not inferred here.
	 */
	private async countActiveProductsByGroup(
		client: Pick<PrismaService, 'product'> | Prisma.TransactionClient,
		tenantId: string,
	): Promise<Record<BusinessGroup, number>> {
		const rows = await client.product.groupBy({
			by: ['businessGroup'],
			where: {
				tenantId,
				deletedAt: null,
				status: ProductStatus.ACTIVE,
				businessGroup: { not: null },
			},
			_count: { _all: true },
		});
		const counts = Object.fromEntries(
			BUSINESS_GROUP_CATALOG.map(({ id: group }) => [group, 0]),
		) as Record<BusinessGroup, number>;
		for (const row of rows)
			if (row.businessGroup && counts[row.businessGroup] !== undefined)
				counts[row.businessGroup] = row._count._all;
		return counts;
	}

	async create(
		tenantId: string,
		dto: CreateProductDto,
		actor?: Pick<TenantIdentity, 'id' | 'tenantId' | 'roleCode'>,
	) {
		const sku = dto.sku?.trim() || this.generateSku();
		const name = dto.name.trim();
		if (!name) throw new BadRequestException('name is required');
		validateProductContract(
			dto.productKind,
			dto.businessGroup,
			dto.attrs,
			true,
		);

		return this.prisma.$transaction(async (tx) => {
			await this.entitlements.assertFeature(tenantId, 'inventory', tx);
			if (dto.businessGroup)
				await this.assertBusinessGroupAccess(tenantId, dto.businessGroup, tx);
			await this.counters.reserve(tx, tenantId, 'maxProducts', 1n);
			const unit = dto.baseUnitId
				? await tx.unit.findFirst({
						where: { id: dto.baseUnitId, tenantId, deletedAt: null },
						select: { id: true },
					})
				: null;
			if (dto.baseUnitId && !unit)
				throw new NotFoundException('Base unit not found');
			if (dto.conversions?.length && !unit)
				throw new BadRequestException('Base unit is required for conversions');

			try {
				const created = await tx.product.create({
					data: {
						tenantId,
						sku,
						name,
						barcode: dto.barcode?.trim() || null,
						baseUnitId: unit?.id ?? null,
						brandId: await this.resolveNamedReference(
							tx,
							'brand',
							tenantId,
							dto.brandId,
							dto.brandName,
						),
						manufacturerId: await this.resolveNamedReference(
							tx,
							'manufacturer',
							tenantId,
							dto.manufacturerId,
							dto.manufacturerName,
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
				if (unit)
					await this.syncConversions(
						tx,
						tenantId,
						created.id,
						unit.id,
						dto.conversions,
					);
				if (actor)
					await this.audit.writeInTx(tx, {
						tenantId,
						actorId: actor.id,
						actorType: AuditActorType.USER,
						actorRoleCode: actor.roleCode,
						action: AuditAction.PRODUCT_CREATE,
						resource: 'product',
						resourceId: created.id,
						after: {
							sku: created.sku,
							name: created.name,
							productKind: dto.productKind,
							businessGroup: dto.businessGroup,
							attrs: dto.attrs,
						},
					});
				return created;
			} catch (error) {
				if (this.isSkuConflict(error)) {
					throw new BadRequestException('SKU already exists');
				}
				throw error;
			}
		});
	}

	async update(
		tenantId: string,
		id: string,
		dto: UpdateProductDto,
		actor?: Pick<TenantIdentity, 'id' | 'tenantId' | 'roleCode'>,
	) {
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
			const specializedAttrsPresent =
				hasSpecializedAttrs(current.attrs) || hasSpecializedAttrs(dto.attrs);
			validateProductContract(
				nextKind === ProductKind.OTHER ? null : nextKind,
				nextGroup,
				nextAttrs,
				dto.attrs !== undefined &&
					((dto.productKind !== undefined &&
						dto.productKind !== current.productKind) ||
						specializedAttrsPresent),
			);
			if (nextGroup)
				await this.assertBusinessGroupAccess(tenantId, nextGroup, tx);
			if (dto.baseUnitId)
				await this.requireReference(
					tx,
					'unit',
					tenantId,
					dto.baseUnitId,
					'Base unit not found',
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
			const nextBrandId =
				dto.brandName !== undefined
					? await this.resolveNamedReference(
							tx,
							'brand',
							tenantId,
							undefined,
							dto.brandName,
						)
					: dto.brandId;
			const nextManufacturerId =
				dto.manufacturerName !== undefined
					? await this.resolveNamedReference(
							tx,
							'manufacturer',
							tenantId,
							undefined,
							dto.manufacturerName,
						)
					: dto.manufacturerId;
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
						brandId: nextBrandId,
						manufacturerId: nextManufacturerId,
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
				if (dto.conversions !== undefined) {
					const nextBaseUnitId = dto.baseUnitId ?? product.baseUnitId;
					if (!nextBaseUnitId)
						throw new BadRequestException(
							'Base unit is required for conversions',
						);
					await this.syncConversions(
						tx,
						tenantId,
						product.id,
						nextBaseUnitId,
						dto.conversions,
					);
				}
				const stock = await tx.stock.aggregate({
					where: { tenantId, productId: product.id },
					_sum: { qty: true },
				});
				if (actor)
					await this.audit.writeInTx(tx, {
						tenantId,
						actorId: actor.id,
						actorType: AuditActorType.USER,
						actorRoleCode: actor.roleCode,
						action: AuditAction.PRODUCT_UPDATE,
						resource: 'product',
						resourceId: product.id,
						after: {
							sku: product.sku,
							name: product.name,
							productKind: product.productKind,
							businessGroup: product.businessGroup,
							attrs: product.attrs,
						},
					});
				return this.toPublicProduct(product, stock._sum.qty);
			} catch (error) {
				if (this.isSkuConflict(error))
					throw new BadRequestException('SKU already exists');
				throw error;
			}
		});
	}

	async remove(
		tenantId: string,
		id: string,
		actor?: Pick<TenantIdentity, 'id' | 'tenantId' | 'roleCode'>,
	) {
		return this.prisma.$transaction(async (tx) => {
			const result = await tx.product.updateMany({
				where: { id, tenantId, deletedAt: null },
				data: { deletedAt: new Date() },
			});
			if (result.count === 0) throw new NotFoundException('Product not found');
			if (actor)
				await this.audit.writeInTx(tx, {
					tenantId,
					actorId: actor.id,
					actorType: AuditActorType.USER,
					actorRoleCode: actor.roleCode,
					action: AuditAction.PRODUCT_DELETE,
					resource: 'product',
					resourceId: id,
					after: { deleted: true },
				});
			return { id, deleted: true };
		});
	}

	private productSelect() {
		return {
			id: true,
			sku: true,
			name: true,
			barcode: true,
			baseUnitId: true,
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

	private async assertBusinessGroupAccess(
		tenantId: string,
		group: BusinessGroup,
		client: Prisma.TransactionClient,
	) {
		await this.assertBusinessGroupEntitlement(tenantId, group, client);
		await this.assertManualBusinessGroupEnabled(tenantId, group, client);
	}

	private async assertBusinessGroupEntitlement(
		tenantId: string,
		group: BusinessGroup,
		client: Prisma.TransactionClient,
	) {
		if ((DEFAULT_BUSINESS_GROUPS as readonly BusinessGroup[]).includes(group))
			return;
		const feature = BUSINESS_GROUP_FEATURES[group];
		if (!feature) throw new BadRequestException('This product group is not available');
		await this.entitlements.assertFeature(tenantId, feature, client);
	}

	private async assertManualBusinessGroupEnabled(
		tenantId: string,
		group: BusinessGroup,
		client: Prisma.TransactionClient,
	) {
		const configured = await client.tenantBusinessGroup.findUnique({
			where: { tenantId_businessGroup: { tenantId, businessGroup: group } },
			select: { enabled: true },
		});
		if (configured && !configured.enabled)
			throw new BadRequestException('businessGroup is not enabled for this tenant');
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

	private generateSku(): string {
		return `SP-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
	}

	private async syncConversions(
		tx: Prisma.TransactionClient,
		tenantId: string,
		productId: string,
		baseUnitId: string,
		conversions?: ProductConversionDto[],
	) {
		if (conversions === undefined) return;
		const unitIds = [
			...new Set(conversions.map((conversion) => conversion.unitId)),
		];
		if (unitIds.includes(baseUnitId))
			throw new BadRequestException(
				'Conversion unit must differ from base unit',
			);
		const units = await tx.unit.findMany({
			where: { id: { in: unitIds }, tenantId, deletedAt: null },
			select: { id: true },
		});
		if (units.length !== unitIds.length)
			throw new NotFoundException('Conversion unit not found');
		await tx.productUnitConversion.deleteMany({
			where: { tenantId, productId },
		});
		if (conversions.length === 0) return;
		await tx.productUnitConversion.createMany({
			data: conversions.map((conversion) => ({
				tenantId,
				productId,
				unitId: conversion.unitId,
				factorToBase: conversion.factor,
				kind: conversion.kind,
			})),
		});
	}

	private async resolveNamedReference(
		tx: Prisma.TransactionClient,
		model: 'brand' | 'manufacturer',
		tenantId: string,
		id?: string | null,
		name?: string | null,
	) {
		if (name !== undefined) {
			const normalized = name?.trim() ?? '';
			if (!normalized) return null;
			const existing =
				model === 'brand'
					? await tx.brand.findFirst({
							where: { tenantId, deletedAt: null, name: normalized },
							select: { id: true },
						})
					: await tx.manufacturer.findFirst({
							where: { tenantId, deletedAt: null, name: normalized },
							select: { id: true },
						});
			if (existing) return existing.id;
			const created =
				model === 'brand'
					? await tx.brand.create({
							data: { tenantId, name: normalized },
							select: { id: true },
						})
					: await tx.manufacturer.create({
							data: { tenantId, name: normalized },
							select: { id: true },
						});
			return created.id;
		}
		return id ? this.validateReference(tx, model, tenantId, id) : null;
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
