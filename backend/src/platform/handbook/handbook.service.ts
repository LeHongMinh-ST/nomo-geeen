import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { DiseaseType, HandbookCategory, Prisma } from '@prisma/client';
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
	constructor(private readonly prisma: PrismaService) {}

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
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ target: { contains: search, mode: 'insensitive' } },
				{ nameSearch: { contains: search, mode: 'insensitive' } },
				{ aliasesSearch: { contains: search, mode: 'insensitive' } },
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
		return this.toResponse(row);
	}

	async create(tenantId: string, dto: CreateHandbookEntryDto) {
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
					nameSearch: name.toLowerCase(),
					aliases: aliases.length ? aliases : undefined,
					aliasesSearch: aliases.length
						? aliases.join(' ').toLowerCase()
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
			return tx.disease.findFirstOrThrow({
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
		});
		return this.toResponse(row);
	}

	async update(tenantId: string, id: string, dto: UpdateHandbookEntryDto) {
		const current = await this.prisma.disease.findFirst({
			where: { id, tenantId, deletedAt: null },
		});
		if (!current) throw new NotFoundException('Handbook entry not found');
		const data: Prisma.DiseaseUpdateInput = {};
		if (dto.name !== undefined) {
			const name = dto.name.trim();
			if (!name) throw this.invalidCategory('name', 'Name is required');
			data.name = name;
			data.nameSearch = name.toLowerCase();
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
			data.aliasesSearch = aliases.length
				? aliases.join(' ').toLowerCase()
				: null;
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
			return tx.disease.findFirstOrThrow({
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
