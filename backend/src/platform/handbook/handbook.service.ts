import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import {
	AuditAction,
	AuditActorType,
	DiseaseType,
	HandbookCategory,
	Prisma,
} from '@prisma/client';
import { AuditLogger } from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import {
	CreateHandbookEntryDto,
	DiseaseTypeInput,
	HandbookQueryDto,
	UpdateHandbookEntryDto,
} from './dto/handbook.dto';
import {
	HANDBOOK_CATEGORY_CATALOG,
	handbookCategoryLabel,
	isSelectableHandbookCategory,
	mapLegacyAgriDomain,
} from './handbook-category';
import {
	normalizeSearchList,
	normalizeVietnameseSearch,
} from './vietnamese-search';
import { toSquareMeters } from './area-conversion';
import { HandbookProtocolService } from './handbook-protocol.service';
import { evaluateProtocol } from './protocol-availability';
import type { QuickSuggestionsQueryDto } from './dto/protocol.dto';

type DiseaseRow = {
	id: string;
	tenantId: string;
	name: string;
	aliases: Prisma.JsonValue | null;
	domain: string;
	handbookCategory: HandbookCategory;
	target: string | null;
	type: DiseaseType | null;
	symptom: string | null;
	note: string | null;
	isPinned: boolean;
	sortOrder: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
	ingredients?: Array<{ activeIngredient: string; sortOrder: number }>;
	pins?: Array<{
		productId: string;
		sortOrder: number;
		isExcluded: boolean;
	}>;
};

@Injectable()
export class HandbookService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditLogger,
		private readonly protocols: HandbookProtocolService,
	) {}

	catalog() {
		return {
			items: HANDBOOK_CATEGORY_CATALOG.map((c) => ({
				id: c.id,
				label: c.label,
				selectable: c.selectable,
			})),
		};
	}

	async list(tenantId: string, query: HandbookQueryDto) {
		const page = Math.max(1, query.page ?? 1);
		const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 20));
		const search = query.search?.trim();
		const where: Prisma.DiseaseWhereInput = {
			tenantId,
			deletedAt: null,
		};
		if (query.category) where.handbookCategory = query.category;
		if (search) {
			// Search columns hold diacritic-free text, so the query is folded the same way
			// before matching. Raw contains is kept so accented input still works on rows
			// written before the backfill.
			const normalized = normalizeVietnameseSearch(search);
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ target: { contains: search, mode: 'insensitive' } },
				...(normalized
					? [
							{
								nameSearch: {
									contains: normalized,
									mode: 'insensitive' as const,
								},
							},
							{
								aliasesSearch: {
									contains: normalized,
									mode: 'insensitive' as const,
								},
							},
						]
					: []),
			];
		}
		const [items, total] = await Promise.all([
			this.prisma.disease.findMany({
				where,
				orderBy: [
					{ isPinned: 'desc' },
					{ sortOrder: 'asc' },
					{ updatedAt: 'desc' },
					{ id: 'asc' },
				],
				skip: (page - 1) * pageSize,
				take: pageSize,
				include: {
					ingredients: {
						orderBy: { sortOrder: 'asc' },
						select: { activeIngredient: true, sortOrder: true },
					},
					pins: {
						orderBy: { sortOrder: 'asc' },
						select: {
							productId: true,
							sortOrder: true,
							isExcluded: true,
						},
					},
				},
			}),
			this.prisma.disease.count({ where }),
		]);
		return {
			items: items.map((row) => this.toResponse(row)),
			page,
			pageSize,
			total,
		};
	}

	async findById(tenantId: string, id: string) {
		const row = await this.prisma.disease.findFirst({
			where: { id, tenantId, deletedAt: null },
			include: {
				ingredients: {
					orderBy: { sortOrder: 'asc' },
					select: { activeIngredient: true, sortOrder: true },
				},
				pins: {
					orderBy: { sortOrder: 'asc' },
					select: {
						productId: true,
						sortOrder: true,
						isExcluded: true,
					},
				},
			},
		});
		if (!row) throw new NotFoundException('Handbook entry not found');
		return {
			...this.toResponse(row),
			protocols: await this.protocols.listForDisease(tenantId, id),
		};
	}

	async quickSuggestions(
		tenantId: string,
		id: string,
		query: QuickSuggestionsQueryDto = {},
	) {
		const disease = await this.prisma.disease.findFirst({
			where: { id, tenantId, deletedAt: null, isActive: true },
			include: {
				ingredients: { orderBy: { sortOrder: 'asc' }, select: { activeIngredient: true } },
				pins: { orderBy: { sortOrder: 'asc' }, select: { productId: true, isExcluded: true } },
				consultFields: { where: { tenantId, isEnabled: true }, orderBy: { sortOrder: 'asc' } },
				protocols: {
					orderBy: [
						{ isDefault: 'desc' },
						{ sortOrder: 'asc' },
						{ createdAt: 'asc' },
					],
					where: { isActive: true },
					include: {
						items: {
							orderBy: { sortOrder: 'asc' },
							include: {
								product: {
									select: {
										id: true,
										name: true,
										netContent: true,
										netContentUnit: true,
									},
								},
							},
						},
					},
				},
			},
		});
		if (!disease) throw new NotFoundException('Handbook entry not found');
		const warehouse = await this.prisma.warehouse.findFirst({
			where: { tenantId, isDefault: true, deletedAt: null }, select: { id: true },
		});
		const products = await this.prisma.product.findMany({
			where: { tenantId, deletedAt: null },
			include: { baseUnit: { select: { id: true, name: true } }, stocks: warehouse ? { where: { warehouseId: warehouse.id }, select: { qty: true } } : false },
		});
		const excluded = new Set(disease.pins.filter((p) => p.isExcluded).map((p) => p.productId));
		const pinned = new Map(disease.pins.filter((p) => !p.isExcluded).map((p, i) => [p.productId, i]));
		const ingredients = disease.ingredients.map((i) => i.activeIngredient.toLowerCase());
		const terms = [disease.name, ...(Array.isArray(disease.aliases) ? disease.aliases.filter((a): a is string => typeof a === 'string') : [])].map((v) => v.toLowerCase());
		const suggestions = products.filter((p) => !excluded.has(p.id)).map((p) => {
			const text = [p.name, p.activeIngredient ?? '', ...(Array.isArray(p.pestTags) ? p.pestTags.filter((v): v is string => typeof v === 'string') : [])].join(' ').toLowerCase();
			const pinRank = pinned.get(p.id);
			const ingredientMatch = !!p.activeIngredient && ingredients.some((i) => p.activeIngredient!.toLowerCase().includes(i));
			const tagMatch = terms.some((term) => text.includes(term));
			const availableQty = Number(p.stocks?.[0]?.qty ?? 0);
			const available = p.status === 'ACTIVE' && !p.isLocked && !p.isRecalled && availableQty > 0;
			return { productId: p.id, name: p.name, unitId: p.baseUnit.id, unit: p.baseUnit.name, unitPrice: Number(p.salePrice), availableQty, available, reason: pinRank !== undefined ? 'OWNER_PIN' : ingredientMatch ? 'ACTIVE_INGREDIENT' : 'TARGET_MATCH', warnings: [], matched: pinRank !== undefined || ingredientMatch || tagMatch, rank: pinRank !== undefined ? pinRank : ingredientMatch ? 100 : 200 };
		}).filter((item) => item.matched).sort((a, b) => a.rank - b.rank || Number(b.available) - Number(a.available) || a.productId.localeCompare(b.productId)).map(({ rank: _rank, matched: _matched, ...item }) => item);
		const productById = new Map(products.map((p) => [p.id, p]));
		const area = this.resolveArea(query);
		const protocols = disease.protocols.map((protocol) =>
			evaluateProtocol(
				{
					id: protocol.id,
					name: protocol.name,
					note: protocol.note,
					isDefault: protocol.isDefault,
					sortOrder: protocol.sortOrder,
					items: protocol.items.map((item) => {
						const product = item.productId
							? productById.get(item.productId)
							: undefined;
						const availableQty = Number(product?.stocks?.[0]?.qty ?? 0);
						return {
							id: item.id,
							productId: item.productId,
							productName: item.product?.name ?? null,
							activeIngredient: item.activeIngredient,
							doseAmount: Number(item.doseAmount),
							doseUnit: item.doseUnit,
							perAreaAmount: Number(item.perAreaAmount),
							perAreaUnit: item.perAreaUnit,
							mixing: item.mixing,
							usage: item.usage,
							sortOrder: item.sortOrder,
							product: product
								? {
										id: product.id,
										unitId: product.baseUnit.id,
										unitName: product.baseUnit.name,
										unitPrice: Number(product.salePrice),
										availableQty,
										sellable:
											product.status === 'ACTIVE' &&
											!product.isLocked &&
											!product.isRecalled,
										netContent:
											item.product?.netContent === null ||
											item.product?.netContent === undefined
												? null
												: Number(item.product.netContent),
										netContentUnit: item.product?.netContentUnit ?? null,
									}
								: null,
						};
					}),
				},
				area.squareMeters,
			),
		);

		return {
			disease: { id: disease.id, name: disease.name, category: disease.handbookCategory, symptom: disease.symptom, aliases: disease.aliases, note: disease.note, formulaExpr: disease.formulaExpr },
			consultFields: disease.consultFields,
			suggestions,
			area: area.echo,
			protocols,
		};
	}

	/** Resolve the optional area filter; an invalid pair simply yields no quantities. */
	private resolveArea(query: QuickSuggestionsQueryDto) {
		if (query.areaValue === undefined || query.areaUnit === undefined) {
			return { squareMeters: null, echo: null };
		}
		const converted = toSquareMeters(query.areaValue, query.areaUnit);
		if (!converted.ok) {
			throw new BadRequestException({
				message: 'Invalid area',
				errors: [{ field: 'areaValue', message: converted.reason }],
			});
		}
		return {
			squareMeters: converted.squareMeters,
			echo: {
				value: query.areaValue,
				unit: query.areaUnit,
				squareMeters: converted.squareMeters,
			},
		};
	}

	async create(tenantId: string, userId: string, dto: CreateHandbookEntryDto) {
		const category = this.requireSelectableCategory(dto.category);
		const name = dto.name.trim();
		if (!name) throw this.invalidCategory('name', 'Name is required');
		const aliases = this.normalizeStringList(dto.aliases);
		const ingredients = this.normalizeStringList(dto.recommendedIngredients);
		const row = await this.prisma.$transaction(async (tx) => {
			const disease = await tx.disease.create({
				data: {
					tenantId,
					name,
					nameSearch: normalizeVietnameseSearch(name),
					aliases: aliases.length ? aliases : undefined,
					aliasesSearch: aliases.length
						? normalizeSearchList(aliases)
						: undefined,
					domain: 'GENERAL',
					handbookCategory: category,
					target: dto.subject?.trim() || null,
					type: this.mapType(dto.type),
					symptom: dto.symptom?.trim() || null,
					note: dto.note?.trim() || null,
				},
			});
			if (ingredients.length) {
				await tx.diseaseIngredient.createMany({
					data: ingredients.map((activeIngredient, sortOrder) => ({
						tenantId,
						diseaseId: disease.id,
						activeIngredient,
						sortOrder,
					})),
				});
			}
			const created = await tx.disease.findFirstOrThrow({
				where: { id: disease.id, tenantId },
				include: {
					ingredients: {
						orderBy: { sortOrder: 'asc' },
						select: { activeIngredient: true, sortOrder: true },
					},
					pins: {
						orderBy: { sortOrder: 'asc' },
						select: {
							productId: true,
							sortOrder: true,
							isExcluded: true,
						},
					},
				},
			});
			await this.audit.writeInTx(tx, {
				tenantId,
				actorId: userId,
				actorType: AuditActorType.USER,
				actorRoleCode: null,
				action: AuditAction.HANDBOOK_CREATE,
				resource: 'handbook',
				resourceId: created.id,
				after: {
					category: created.handbookCategory,
					type: created.type,
					ingredientCount: ingredients.length,
				},
			});
			return created;
		});
		return this.toResponse(row);
	}

	async update(
		tenantId: string,
		userId: string,
		id: string,
		dto: UpdateHandbookEntryDto,
	) {
		const current = await this.prisma.disease.findFirst({
			where: { id, tenantId, deletedAt: null },
		});
		if (!current) throw new NotFoundException('Handbook entry not found');
		const data: Prisma.DiseaseUpdateInput = {};
		if (dto.name !== undefined) {
			const name = dto.name.trim();
			if (!name) throw this.invalidCategory('name', 'Name is required');
			data.name = name;
			data.nameSearch = normalizeVietnameseSearch(name);
		}
		if (dto.category !== undefined) {
			data.handbookCategory = this.requireSelectableCategory(dto.category);
		}
		if (dto.subject !== undefined) data.target = dto.subject.trim() || null;
		if (dto.type !== undefined) data.type = this.mapType(dto.type);
		if (dto.symptom !== undefined) data.symptom = dto.symptom.trim() || null;
		if (dto.note !== undefined) data.note = dto.note.trim() || null;
		if (dto.aliases !== undefined) {
			const aliases = this.normalizeStringList(dto.aliases);
			data.aliases = aliases.length ? aliases : Prisma.JsonNull;
			data.aliasesSearch = aliases.length ? normalizeSearchList(aliases) : null;
		}
		const ingredients =
			dto.recommendedIngredients !== undefined
				? this.normalizeStringList(dto.recommendedIngredients)
				: null;
		const row = await this.prisma.$transaction(async (tx) => {
			await tx.disease.update({ where: { id }, data });
			if (ingredients) {
				await tx.diseaseIngredient.deleteMany({
					where: { diseaseId: id, tenantId },
				});
				if (ingredients.length) {
					await tx.diseaseIngredient.createMany({
						data: ingredients.map((activeIngredient, sortOrder) => ({
							tenantId,
							diseaseId: id,
							activeIngredient,
							sortOrder,
						})),
					});
				}
			}
			const updated = await tx.disease.findFirstOrThrow({
				where: { id, tenantId, deletedAt: null },
				include: {
					ingredients: {
						orderBy: { sortOrder: 'asc' },
						select: { activeIngredient: true, sortOrder: true },
					},
					pins: {
						orderBy: { sortOrder: 'asc' },
						select: {
							productId: true,
							sortOrder: true,
							isExcluded: true,
						},
					},
				},
			});
			await this.audit.writeInTx(tx, {
				tenantId,
				actorId: userId,
				actorType: AuditActorType.USER,
				actorRoleCode: null,
				action: AuditAction.HANDBOOK_UPDATE,
				resource: 'handbook',
				resourceId: updated.id,
				after: {
					category: updated.handbookCategory,
					type: updated.type,
					updatedFields: Object.keys(data),
				},
			});
			return updated;
		});
		return this.toResponse(row);
	}

	/** Backfill helper for ops: count mapped vs uncategorized from domain. */
	async migrationReport(tenantId: string) {
		const rows = await this.prisma.disease.groupBy({
			by: ['handbookCategory'],
			where: { tenantId, deletedAt: null },
			_count: { _all: true },
		});
		return {
			byCategory: rows.map((r) => ({
				category: r.handbookCategory,
				label: handbookCategoryLabel(r.handbookCategory),
				count: r._count._all,
			})),
			mapLegacyAgriDomain: {
				CROP: mapLegacyAgriDomain('CROP'),
				LIVESTOCK: mapLegacyAgriDomain('LIVESTOCK'),
				AQUACULTURE: mapLegacyAgriDomain('AQUACULTURE'),
				GENERAL: mapLegacyAgriDomain('GENERAL'),
			},
		};
	}

	private requireSelectableCategory(raw: string): HandbookCategory {
		if (!isSelectableHandbookCategory(raw)) {
			throw this.invalidCategory(
				'category',
				'Category must be one of the five selectable Handbook categories',
			);
		}
		return raw;
	}

	private invalidCategory(field: string, message: string) {
		return new BadRequestException({
			message,
			errors: [{ field, message }],
		});
	}

	private normalizeStringList(values?: string[]) {
		if (!values?.length) return [] as string[];
		return [
			...new Set(values.map((v) => v.trim()).filter((v) => v.length > 0)),
		];
	}

	private mapType(type?: DiseaseTypeInput | null): DiseaseType | null {
		if (!type) return null;
		switch (type) {
			case DiseaseTypeInput.DISEASE:
				return DiseaseType.DISEASE;
			case DiseaseTypeInput.PEST:
				return DiseaseType.PEST;
			case DiseaseTypeInput.WEED:
				return DiseaseType.WEED;
			case DiseaseTypeInput.OTHER:
				return DiseaseType.OTHER;
			default:
				return DiseaseType.OTHER;
		}
	}

	private toResponse(row: DiseaseRow) {
		const category = row.handbookCategory ?? HandbookCategory.UNCATEGORIZED;
		const aliases = Array.isArray(row.aliases)
			? (row.aliases as unknown[]).filter(
					(a): a is string => typeof a === 'string',
				)
			: [];
		return {
			id: row.id,
			name: row.name,
			aliases,
			category,
			categoryLabel: handbookCategoryLabel(category),
			subject: row.target,
			type: row.type,
			symptom: row.symptom,
			note: row.note,
			recommendedIngredients: (row.ingredients ?? []).map(
				(i) => i.activeIngredient,
			),
			pinnedProductIds: (row.pins ?? [])
				.filter((p) => !p.isExcluded)
				.map((p) => p.productId),
			excludedProductIds: (row.pins ?? [])
				.filter((p) => p.isExcluded)
				.map((p) => p.productId),
			isPinned: row.isPinned,
			isActive: row.isActive,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			/** Legacy domain retained for migration audit; not a write target. */
			legacyDomain: row.domain,
		};
	}
}
