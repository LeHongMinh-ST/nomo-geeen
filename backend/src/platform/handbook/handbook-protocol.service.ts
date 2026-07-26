import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditActorType, type Prisma } from '@prisma/client';
import { AuditLogger } from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ProtocolInputDto, ReplaceProtocolsDto } from './dto/protocol.dto';

const PROTOCOL_INCLUDE = {
	items: {
		orderBy: { sortOrder: 'asc' },
		include: {
			product: {
				select: {
					id: true,
					name: true,
					sku: true,
					netContent: true,
					netContentUnit: true,
				},
			},
		},
	},
} satisfies Prisma.DiseaseProtocolInclude;

type ProtocolRow = Prisma.DiseaseProtocolGetPayload<{
	include: typeof PROTOCOL_INCLUDE;
}>;

@Injectable()
export class HandbookProtocolService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditLogger,
	) {}

	/** Ordered protocols for a disease; default first, then explicit sort order. */
	async listForDisease(tenantId: string, diseaseId: string) {
		const rows = await this.prisma.diseaseProtocol.findMany({
			where: { tenantId, diseaseId },
			orderBy: [
				{ isDefault: 'desc' },
				{ sortOrder: 'asc' },
				{ createdAt: 'asc' },
			],
			include: PROTOCOL_INCLUDE,
		});
		return rows.map((row) => this.toResponse(row));
	}

	/**
	 * Replace every protocol on a disease in one transaction. Simpler and more predictable
	 * than diffing rows, and safe because sales snapshot protocol data by value.
	 */
	async replaceAll(
		tenantId: string,
		userId: string,
		diseaseId: string,
		dto: ReplaceProtocolsDto,
	) {
		const disease = await this.prisma.disease.findFirst({
			where: { id: diseaseId, tenantId, deletedAt: null },
			select: { id: true },
		});
		if (!disease) throw new NotFoundException('Handbook entry not found');

		const protocols = dto.protocols ?? [];
		this.assertItemsHaveTarget(protocols);
		await this.assertProductsBelongToTenant(tenantId, protocols);

		await this.prisma.$transaction(async (tx) => {
			await tx.diseaseProtocol.deleteMany({ where: { tenantId, diseaseId } });

			for (const [index, protocol] of protocols.entries()) {
				const created = await tx.diseaseProtocol.create({
					data: {
						tenantId,
						diseaseId,
						name: protocol.name.trim(),
						note: protocol.note?.trim() || null,
						// Exactly one default: honour the first flagged protocol, else the first row.
						isDefault: this.resolveIsDefault(protocols, index),
						isActive: protocol.isActive ?? true,
						sortOrder: index,
					},
					select: { id: true },
				});
				if (!protocol.items.length) continue;
				await tx.diseaseProtocolItem.createMany({
					data: protocol.items.map((item, sortOrder) => ({
						tenantId,
						protocolId: created.id,
						productId: item.productId ?? null,
						activeIngredient: item.activeIngredient?.trim() || null,
						doseAmount: item.doseAmount,
						doseUnit: item.doseUnit.trim(),
						perAreaAmount: item.perAreaAmount,
						perAreaUnit: item.perAreaUnit,
						mixing: item.mixing?.trim() || null,
						usage: item.usage?.trim() || null,
						sortOrder,
					})),
				});
			}

			await this.audit.writeInTx(tx, {
				tenantId,
				actorId: userId,
				actorType: AuditActorType.USER,
				actorRoleCode: null,
				action: AuditAction.HANDBOOK_PROTOCOL_UPDATE,
				resource: 'handbook_protocol',
				resourceId: diseaseId,
				after: {
					protocolCount: protocols.length,
					itemCount: protocols.reduce((sum, p) => sum + p.items.length, 0),
				},
			});
		});

		return { protocols: await this.listForDisease(tenantId, diseaseId) };
	}

	private resolveIsDefault(protocols: ProtocolInputDto[], index: number) {
		const firstFlagged = protocols.findIndex((p) => p.isDefault);
		return firstFlagged === -1 ? index === 0 : firstFlagged === index;
	}

	private assertItemsHaveTarget(protocols: ProtocolInputDto[]) {
		for (const [pIndex, protocol] of protocols.entries()) {
			for (const [iIndex, item] of protocol.items.entries()) {
				if (!item.productId && !item.activeIngredient?.trim()) {
					throw new BadRequestException({
						message: 'Each drug line needs a product or an active ingredient',
						errors: [
							{
								field: `protocols[${pIndex}].items[${iIndex}]`,
								message: 'productId or activeIngredient is required',
							},
						],
					});
				}
			}
		}
	}

	private async assertProductsBelongToTenant(
		tenantId: string,
		protocols: ProtocolInputDto[],
	) {
		const ids = [
			...new Set(
				protocols.flatMap((p) =>
					p.items.map((i) => i.productId).filter((id): id is string => !!id),
				),
			),
		];
		if (!ids.length) return;
		const found = await this.prisma.product.findMany({
			where: { id: { in: ids }, tenantId, deletedAt: null },
			select: { id: true },
		});
		if (found.length === ids.length) return;
		const known = new Set(found.map((p) => p.id));
		throw new BadRequestException({
			message: 'Product does not belong to this tenant',
			errors: ids
				.filter((id) => !known.has(id))
				.map((id) => ({ field: 'productId', message: id })),
		});
	}

	private toResponse(row: ProtocolRow) {
		return {
			id: row.id,
			name: row.name,
			note: row.note,
			isDefault: row.isDefault,
			isActive: row.isActive,
			sortOrder: row.sortOrder,
			items: row.items.map((item) => ({
				id: item.id,
				productId: item.productId,
				productName: item.product?.name ?? null,
				productSku: item.product?.sku ?? null,
				activeIngredient: item.activeIngredient,
				doseAmount: Number(item.doseAmount),
				doseUnit: item.doseUnit,
				perAreaAmount: Number(item.perAreaAmount),
				perAreaUnit: item.perAreaUnit,
				mixing: item.mixing,
				usage: item.usage,
				sortOrder: item.sortOrder,
			})),
		};
	}
}
