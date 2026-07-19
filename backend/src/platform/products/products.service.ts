import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { EntitlementService } from '../entitlements/entitlement.service';
import { TenantQuotaCounterService } from '../entitlements/tenant-quota-counter.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProductDto } from './dto/create-product.dto';

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
				baseUnitId: true,
				costPrice: true,
				salePrice: true,
				createdAt: true,
			},
		});
		return products.map((product) => ({
			...product,
			costPrice: product.costPrice.toString(),
			salePrice: product.salePrice.toString(),
		}));
	}

	async create(tenantId: string, dto: CreateProductDto) {
		const sku = dto.sku.trim();
		const name = dto.name.trim();
		if (!sku || !name)
			throw new BadRequestException('sku and name are required');

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

			try {
				return await tx.product.create({
					data: {
						tenantId,
						sku,
						name,
						baseUnitId: unit.id,
						categoryId: dto.categoryId,
						costPrice: BigInt(dto.costPrice),
						salePrice: BigInt(dto.salePrice),
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

	private isSkuConflict(error: unknown): boolean {
		return (
			typeof error === 'object' &&
			error !== null &&
			'code' in error &&
			(error as Prisma.PrismaClientKnownRequestError).code === 'P2002'
		);
	}
}
