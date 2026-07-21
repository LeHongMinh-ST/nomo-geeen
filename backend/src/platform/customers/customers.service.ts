import {
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
	CreateCustomerDto,
	CustomerQueryDto,
	UpdateCustomerDto,
} from './dto/customer.dto';

type CustomerRow = {
	id: string;
	code: string | null;
	name: string;
	phone: string | null;
	address: string | null;
	type: string | null;
	note: string | null;
	openingBalance: bigint;
	balance: bigint;
	createdAt: Date;
	updatedAt: Date;
};

@Injectable()
export class CustomersService {
	constructor(private readonly prisma: PrismaService) {}
	async list(tenantId: string, query: CustomerQueryDto) {
		const page = Math.max(1, query.page ?? 1);
		const pageSize = Math.min(20, Math.max(1, query.pageSize ?? 20));
		const search = query.search?.trim();
		const where: Prisma.CustomerWhereInput = { tenantId, deletedAt: null };
		if (search)
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ phone: { contains: search, mode: 'insensitive' } },
				{ code: { contains: search, mode: 'insensitive' } },
			];
		const [items, total] = await Promise.all([
			this.prisma.customer.findMany({
				where,
				orderBy: [{ name: 'asc' }, { id: 'asc' }],
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			this.prisma.customer.count({ where }),
		]);
		return {
			items: items.map((item) => this.toResponse(item)),
			page,
			pageSize,
			total,
		};
	}
	async findById(tenantId: string, id: string) {
		const customer = await this.prisma.customer.findFirst({
			where: { id, tenantId, deletedAt: null },
		});
		if (!customer) throw new NotFoundException('Customer not found');
		return this.toResponse(customer);
	}
	async create(tenantId: string, dto: CreateCustomerDto) {
		const data = this.normalize(dto);
		if (!data.name) throw this.invalidInput();
		const customer = await this.prisma.customer.create({
			data: { tenantId, ...data, name: data.name },
		});
		return this.toResponse(customer);
	}
	async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
		const current = await this.prisma.customer.findFirst({
			where: { id, tenantId, deletedAt: null },
		});
		if (!current) throw new NotFoundException('Customer not found');
		const data = this.normalize(dto);
		if (dto.name !== undefined && !data.name) throw this.invalidInput();
		const customer = await this.prisma.customer.update({ where: { id }, data });
		return this.toResponse(customer);
	}
	async remove(tenantId: string, id: string) {
		const current = await this.prisma.customer.findFirst({
			where: { id, tenantId, deletedAt: null },
		});
		if (!current) throw new NotFoundException('Customer not found');
		await this.prisma.customer.update({
			where: { id },
			data: { deletedAt: new Date() },
		});
		return { id, deleted: true };
	}
	private normalize(dto: CreateCustomerDto | UpdateCustomerDto) {
		return {
			...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
			...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
			...(dto.code !== undefined ? { code: dto.code.trim() || null } : {}),
			...(dto.address !== undefined
				? { address: dto.address.trim() || null }
				: {}),
			...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
			...(dto.type !== undefined ? { type: dto.type } : {}),
		};
	}
	private toResponse(customer: CustomerRow) {
		return {
			id: customer.id,
			code: customer.code,
			name: customer.name,
			phone: customer.phone,
			address: customer.address,
			type: customer.type,
			note: customer.note,
			balance: Number(customer.balance),
			openingBalance: Number(customer.openingBalance),
			createdAt: customer.createdAt,
			updatedAt: customer.updatedAt,
		};
	}
	private invalidInput() {
		return new UnprocessableEntityException({
			reason: 'VALIDATION_ERROR',
			message: 'Customer name is required',
		});
	}
}
