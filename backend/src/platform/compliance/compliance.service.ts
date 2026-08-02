import {
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { Prisma, type TenantLicense, TenantLicenseType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeIngredientName } from '../sales/sale-eligibility-policy';
import type {
	CreateBannedIngredientDto,
	CreateTenantLicenseDto,
	TenantLicenseQueryDto,
	UpdateBannedIngredientDto,
	UpdateTenantLicenseDto,
} from './dto/compliance.dto';

const DEFAULT_EXPIRING_WITHIN_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type LicenseStatus = 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'NO_EXPIRY';

/** Trạng thái hiệu lực giấy phép — cảnh báo trước khi hết hạn. */
export function licenseStatus(
	expiresAt: Date | null,
	now: Date,
	warnWithinDays: number,
): { status: LicenseStatus; daysRemaining: number | null } {
	if (!expiresAt) return { status: 'NO_EXPIRY', daysRemaining: null };
	const daysRemaining = Math.ceil(
		(startOfDay(expiresAt).getTime() - startOfDay(now).getTime()) / MS_PER_DAY,
	);
	if (daysRemaining < 0) return { status: 'EXPIRED', daysRemaining };
	if (daysRemaining <= warnWithinDays)
		return { status: 'EXPIRING_SOON', daysRemaining };
	return { status: 'VALID', daysRemaining };
}

function startOfDay(value: Date): Date {
	const day = new Date(value);
	day.setUTCHours(0, 0, 0, 0);
	return day;
}

@Injectable()
export class ComplianceService {
	constructor(private readonly prisma: PrismaService) {}

	async listLicenses(
		tenantId: string,
		query: TenantLicenseQueryDto = {},
		now = new Date(),
	) {
		const warnWithinDays =
			query.expiringWithinDays ?? DEFAULT_EXPIRING_WITHIN_DAYS;
		const licenses = await this.prisma.tenantLicense.findMany({
			where: { tenantId, deletedAt: null },
			orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
		});
		const items = licenses.map((license) =>
			this.toResponse(license, now, warnWithinDays),
		);
		const alerts = items.filter(
			(item) => item.status === 'EXPIRING_SOON' || item.status === 'EXPIRED',
		);
		return {
			warnWithinDays,
			items: query.expiringOnly ? alerts : items,
			alertCount: alerts.length,
		};
	}

	async createLicense(tenantId: string, dto: CreateTenantLicenseDto) {
		const license = await this.prisma.tenantLicense.create({
			data: {
				tenantId,
				licenseType: dto.licenseType,
				licenseNo: dto.licenseNo.trim(),
				holderName: dto.holderName?.trim() || null,
				issuedBy: dto.issuedBy?.trim() || null,
				issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
				expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
				note: dto.note?.trim() || null,
			},
		});
		return this.toResponse(license, new Date(), DEFAULT_EXPIRING_WITHIN_DAYS);
	}

	async updateLicense(
		tenantId: string,
		id: string,
		dto: UpdateTenantLicenseDto,
	) {
		await this.requireLicense(tenantId, id);
		const license = await this.prisma.tenantLicense.update({
			where: { id },
			data: {
				licenseType: dto.licenseType,
				licenseNo: dto.licenseNo?.trim(),
				holderName: optionalText(dto.holderName),
				issuedBy: optionalText(dto.issuedBy),
				issuedAt: optionalDate(dto.issuedAt),
				expiresAt: optionalDate(dto.expiresAt),
				note: optionalText(dto.note),
			},
		});
		return this.toResponse(license, new Date(), DEFAULT_EXPIRING_WITHIN_DAYS);
	}

	async removeLicense(tenantId: string, id: string) {
		await this.requireLicense(tenantId, id);
		await this.prisma.tenantLicense.update({
			where: { id },
			data: { deletedAt: new Date() },
		});
		return { id, deleted: true };
	}

	async listBannedIngredients(tenantId: string) {
		const items = await this.prisma.bannedActiveIngredient.findMany({
			where: { tenantId, deletedAt: null },
			orderBy: [{ name: 'asc' }, { id: 'asc' }],
		});
		return { items };
	}

	async createBannedIngredient(
		tenantId: string,
		dto: CreateBannedIngredientDto,
	) {
		const name = dto.name.trim();
		const nameNormalized = normalizeIngredientName(name);
		const existing = await this.prisma.bannedActiveIngredient.findFirst({
			where: { tenantId, nameNormalized },
		});
		if (existing && existing.deletedAt === null)
			throw new ConflictException({ reason: 'INGREDIENT_ALREADY_BANNED' });
		// Khai báo lại hoạt chất đã xóa mềm thì hồi sinh bản ghi cũ, tránh vướng
		// unique (tenantId, nameNormalized).
		if (existing)
			return this.prisma.bannedActiveIngredient.update({
				where: { id: existing.id },
				data: { name, note: dto.note?.trim() || null, deletedAt: null },
			});
		return this.prisma.bannedActiveIngredient.create({
			data: { tenantId, name, nameNormalized, note: dto.note?.trim() || null },
		});
	}

	async updateBannedIngredient(
		tenantId: string,
		id: string,
		dto: UpdateBannedIngredientDto,
	) {
		const current = await this.prisma.bannedActiveIngredient.findFirst({
			where: { id, tenantId, deletedAt: null },
		});
		if (!current)
			throw new NotFoundException('Banned active ingredient not found');
		const name = dto.name?.trim();
		try {
			return await this.prisma.bannedActiveIngredient.update({
				where: { id },
				data: {
					name,
					nameNormalized: name ? normalizeIngredientName(name) : undefined,
					note: optionalText(dto.note),
				},
			});
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === 'P2002'
			)
				throw new ConflictException({ reason: 'INGREDIENT_ALREADY_BANNED' });
			throw error;
		}
	}

	async removeBannedIngredient(tenantId: string, id: string) {
		const result = await this.prisma.bannedActiveIngredient.updateMany({
			where: { id, tenantId, deletedAt: null },
			data: { deletedAt: new Date() },
		});
		if (result.count === 0)
			throw new NotFoundException('Banned active ingredient not found');
		return { id, deleted: true };
	}

	private async requireLicense(tenantId: string, id: string) {
		const license = await this.prisma.tenantLicense.findFirst({
			where: { id, tenantId, deletedAt: null },
			select: { id: true },
		});
		if (!license) throw new NotFoundException('Tenant license not found');
		return license;
	}

	private toResponse(
		license: TenantLicense,
		now: Date,
		warnWithinDays: number,
	) {
		const { status, daysRemaining } = licenseStatus(
			license.expiresAt,
			now,
			warnWithinDays,
		);
		return {
			id: license.id,
			licenseType: license.licenseType as TenantLicenseType,
			licenseNo: license.licenseNo,
			holderName: license.holderName,
			issuedBy: license.issuedBy,
			issuedAt: license.issuedAt,
			expiresAt: license.expiresAt,
			note: license.note,
			status,
			daysRemaining,
			createdAt: license.createdAt,
			updatedAt: license.updatedAt,
		};
	}
}

function optionalText(value: string | null | undefined) {
	if (value === undefined) return undefined;
	return value === null ? null : value.trim() || null;
}

function optionalDate(value: string | null | undefined) {
	if (value === undefined) return undefined;
	return value === null ? null : new Date(value);
}
