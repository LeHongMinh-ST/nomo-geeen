import {
	ConflictException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, type SupplierType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
	CreateSupplierDto,
	SupplierQueryDto,
	UpdateSupplierDto,
} from './dto/supplier.dto';
import { mapSupplierType } from './supplier-type';

type SupplierRow = {
	id: string;
	code: string;
	name: string;
	supplierType: SupplierType | null;
	contactName: string | null;
	phone: string | null;
	email: string | null;
	address: string | null;
	province: string | null;
	taxCode: string | null;
	balance: bigint;
	status: string;
	createdAt: Date;
	updatedAt: Date;
};

@Injectable()
export class SuppliersService {
	constructor(private readonly prisma: PrismaService) {}

	async list(tenantId: string, query: SupplierQueryDto) {
		const page = Math.max(1, query.page ?? 1);
		const pageSize = Math.min(20, Math.max(1, query.pageSize ?? 20));
		const search = query.search?.trim();
		const where: Prisma.SupplierWhereInput = {
			tenantId,
			deletedAt: null,
			status: 'ACTIVE',
		};
		if (search)
			where.OR = [
				{ code: { contains: search, mode: 'insensitive' } },
				{ name: { contains: search, mode: 'insensitive' } },
				{ phone: { contains: search, mode: 'insensitive' } },
			];
		const [items, total] = await Promise.all([
			this.prisma.supplier.findMany({
				where,
				orderBy: [{ name: 'asc' }, { id: 'asc' }],
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			this.prisma.supplier.count({ where }),
		]);
		return {
			items: items.map((item) => this.toResponse(item)),
			page,
			pageSize,
			total,
		};
	}

	async findById(tenantId: string, id: string) {
		const supplier = await this.prisma.supplier.findFirst({
			where: { id, tenantId, deletedAt: null, status: 'ACTIVE' },
		});
		if (!supplier) throw new NotFoundException('Supplier not found');
		return this.toResponse(supplier);
	}

	async create(tenantId: string, dto: CreateSupplierDto) {
		const data = this.normalize(dto);
		if (!data.name) throw this.invalidInput();
		for (let attempt = 0; attempt < 3; attempt += 1) {
			const code = data.code ?? (await this.nextCode(tenantId));
			try {
				const supplier = await this.prisma.supplier.create({
					data: {
						tenantId,
						...data,
						code,
						name: data.name,
						status: 'ACTIVE',
					},
				});
				return this.toResponse(supplier);
			} catch (error) {
				if (!data.code && this.isCodeConflict(error)) continue;
				this.throwIfCodeConflict(error);
				throw error;
			}
		}
		throw new ConflictException('Could not generate a unique supplier code');
	}

	async update(tenantId: string, id: string, dto: UpdateSupplierDto) {
		const current = await this.prisma.supplier.findFirst({
			where: { id, tenantId, deletedAt: null, status: 'ACTIVE' },
		});
		if (!current) throw new NotFoundException('Supplier not found');
		const data = this.normalize(dto);
		if (dto.code !== undefined && !data.code) throw this.invalidInput();
		if (dto.name !== undefined && !data.name) throw this.invalidInput();
		try {
			const deactivation = dto.status === 'INACTIVE';
			const supplier = await this.prisma.supplier.update({
				where: { id },
				data: {
					...data,
					...(dto.status ? { status: dto.status } : {}),
					...(deactivation ? { deletedAt: new Date() } : {}),
				},
			});
			return this.toResponse(supplier);
		} catch (error) {
			this.throwIfCodeConflict(error);
			throw error;
		}
	}

	async remove(tenantId: string, id: string) {
		const current = await this.prisma.supplier.findFirst({
			where: { id, tenantId, deletedAt: null, status: 'ACTIVE' },
		});
		if (!current) throw new NotFoundException('Supplier not found');
		await this.prisma.supplier.update({
			where: { id },
			data: { deletedAt: new Date(), status: 'INACTIVE' },
		});
		return { id, deleted: true };
	}

	private normalize(dto: CreateSupplierDto | UpdateSupplierDto) {
		return {
			...(dto.code !== undefined ? { code: dto.code.trim() || undefined } : {}),
			...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
			...(dto.supplierType !== undefined
				? { supplierType: this.normalizeSupplierType(dto.supplierType) }
				: {}),
			...(dto.contactName !== undefined
				? { contactName: dto.contactName.trim() || null }
				: {}),
			...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
			...(dto.email !== undefined ? { email: dto.email.trim() || null } : {}),
			...(dto.address !== undefined
				? { address: dto.address.trim() || null }
				: {}),
			...(dto.province !== undefined
				? { province: dto.province.trim() || null }
				: {}),
			...(dto.taxCode !== undefined
				? { taxCode: dto.taxCode.trim() || null }
				: {}),
		};
	}

	private async nextCode(tenantId: string) {
		const rows = await this.prisma.supplier.findMany({
			where: { tenantId },
			select: { code: true },
		});
		const used = new Set(rows.map((row) => row.code));
		let sequence = 1;
		while (used.has(`NCC-${String(sequence).padStart(3, '0')}`)) sequence += 1;
		return `NCC-${String(sequence).padStart(3, '0')}`;
	}

	/** Chuoi rong => xoa phan loai; chuoi khong map duoc => tu choi thay vi am tham null. */
	private normalizeSupplierType(raw: string): SupplierType | null {
		if (!raw.trim()) return null;
		const mapped = mapSupplierType(raw);
		if (!mapped) throw this.invalidSupplierType();
		return mapped;
	}

	private toResponse(supplier: SupplierRow) {
		return {
			id: supplier.id,
			code: supplier.code,
			name: supplier.name,
			supplierType: supplier.supplierType,
			contactName: supplier.contactName,
			phone: supplier.phone,
			email: supplier.email,
			address: supplier.address,
			province: supplier.province,
			taxCode: supplier.taxCode,
			balance: Number(supplier.balance),
			status: supplier.status,
			createdAt: supplier.createdAt,
			updatedAt: supplier.updatedAt,
		};
	}

	private invalidInput() {
		return new UnprocessableEntityException({
			reason: 'VALIDATION_ERROR',
			message: 'Supplier name is required',
		});
	}
	private invalidSupplierType() {
		return new UnprocessableEntityException({
			reason: 'VALIDATION_ERROR',
			field: 'supplierType',
			message: 'Supplier type must be CROP_PROTECTION, FERTILIZER or BOTH',
		});
	}
	private throwIfCodeConflict(error: unknown): void {
		if (this.isCodeConflict(error))
			throw new ConflictException({
				reason: 'DUPLICATE_SUPPLIER_CODE',
				message: 'Supplier code already exists in this tenant',
			});
	}
	private isCodeConflict(error: unknown): boolean {
		return (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		);
	}
}
