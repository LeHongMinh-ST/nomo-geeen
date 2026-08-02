import { ConflictException, NotFoundException } from '@nestjs/common';
import { ComplianceService, licenseStatus } from './compliance.service';

const now = new Date('2026-07-31T00:00:00.000Z');

function license(overrides: Record<string, unknown> = {}) {
	return {
		id: 'lic-1',
		licenseType: 'BUSINESS_ELIGIBILITY',
		licenseNo: 'GCN-001',
		holderName: null,
		issuedBy: null,
		issuedAt: null,
		expiresAt: null,
		note: null,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

describe('licenseStatus', () => {
	it('flags an expired licence', () => {
		expect(
			licenseStatus(new Date('2026-07-30T00:00:00.000Z'), now, 30),
		).toEqual({ status: 'EXPIRED', daysRemaining: -1 });
	});

	it('flags a licence inside the warning window, including today', () => {
		expect(licenseStatus(now, now, 30).status).toBe('EXPIRING_SOON');
		expect(
			licenseStatus(new Date('2026-08-30T00:00:00.000Z'), now, 30).status,
		).toBe('EXPIRING_SOON');
	});

	it('keeps a far-off licence valid and tolerates no expiry', () => {
		expect(
			licenseStatus(new Date('2026-09-30T00:00:00.000Z'), now, 30),
		).toMatchObject({ status: 'VALID' });
		expect(licenseStatus(null, now, 30)).toEqual({
			status: 'NO_EXPIRY',
			daysRemaining: null,
		});
	});
});

describe('ComplianceService licences', () => {
	it('returns every licence with its status plus an alert count', async () => {
		const prisma = {
			tenantLicense: {
				findMany: jest.fn().mockResolvedValue([
					license({ id: 'lic-1', expiresAt: new Date('2026-07-01') }),
					license({ id: 'lic-2', expiresAt: new Date('2026-08-10') }),
					license({ id: 'lic-3', expiresAt: new Date('2027-08-10') }),
				]),
			},
		};
		const result = await new ComplianceService(prisma as never).listLicenses(
			'tenant-1',
			{},
			now,
		);
		expect(result.warnWithinDays).toBe(30);
		expect(result.items.map((item) => item.status)).toEqual([
			'EXPIRED',
			'EXPIRING_SOON',
			'VALID',
		]);
		expect(result.alertCount).toBe(2);
	});

	it('narrows the list to alerts when expiringOnly is set', async () => {
		const prisma = {
			tenantLicense: {
				findMany: jest
					.fn()
					.mockResolvedValue([
						license({ id: 'lic-1', expiresAt: new Date('2026-08-10') }),
						license({ id: 'lic-2', expiresAt: new Date('2027-08-10') }),
					]),
			},
		};
		const result = await new ComplianceService(prisma as never).listLicenses(
			'tenant-1',
			{ expiringOnly: true, expiringWithinDays: 15 },
			now,
		);
		expect(result.items).toHaveLength(1);
		expect(result.items[0].id).toBe('lic-1');
		expect(result.warnWithinDays).toBe(15);
	});

	it('rejects updating a licence that belongs to another tenant', async () => {
		const prisma = {
			tenantLicense: {
				findFirst: jest.fn().mockResolvedValue(null),
				update: jest.fn(),
			},
		};
		await expect(
			new ComplianceService(prisma as never).updateLicense(
				'tenant-1',
				'lic-x',
				{ licenseNo: 'GCN-002' },
			),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(prisma.tenantLicense.update).not.toHaveBeenCalled();
	});
});

describe('ComplianceService banned ingredients', () => {
	it('stores a normalized name for matching at sale time', async () => {
		const prisma = {
			bannedActiveIngredient: {
				findFirst: jest.fn().mockResolvedValue(null),
				create: jest.fn().mockResolvedValue({ id: 'ban-1' }),
			},
		};
		await new ComplianceService(prisma as never).createBannedIngredient(
			'tenant-1',
			{ name: '  Paraquat   Dichloride ' },
		);
		expect(prisma.bannedActiveIngredient.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					name: 'Paraquat   Dichloride',
					nameNormalized: 'paraquat dichloride',
				}),
			}),
		);
	});

	it('rejects declaring the same ingredient twice', async () => {
		const prisma = {
			bannedActiveIngredient: {
				findFirst: jest
					.fn()
					.mockResolvedValue({ id: 'ban-1', deletedAt: null }),
				create: jest.fn(),
			},
		};
		await expect(
			new ComplianceService(prisma as never).createBannedIngredient(
				'tenant-1',
				{ name: 'Paraquat' },
			),
		).rejects.toBeInstanceOf(ConflictException);
		expect(prisma.bannedActiveIngredient.create).not.toHaveBeenCalled();
	});

	it('revives a soft-deleted declaration instead of hitting the unique index', async () => {
		const prisma = {
			bannedActiveIngredient: {
				findFirst: jest
					.fn()
					.mockResolvedValue({ id: 'ban-1', deletedAt: now }),
				update: jest.fn().mockResolvedValue({ id: 'ban-1' }),
				create: jest.fn(),
			},
		};
		await new ComplianceService(prisma as never).createBannedIngredient(
			'tenant-1',
			{ name: 'Paraquat' },
		);
		expect(prisma.bannedActiveIngredient.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'ban-1' },
				data: expect.objectContaining({ deletedAt: null }),
			}),
		);
		expect(prisma.bannedActiveIngredient.create).not.toHaveBeenCalled();
	});

	it('rejects removing an ingredient outside the tenant', async () => {
		const prisma = {
			bannedActiveIngredient: {
				updateMany: jest.fn().mockResolvedValue({ count: 0 }),
			},
		};
		await expect(
			new ComplianceService(prisma as never).removeBannedIngredient(
				'tenant-1',
				'ban-x',
			),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
