import {
	BadRequestException,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditActorType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuditQueryService } from './audit-query.service';
import { AuditQueryDto } from './dto/audit-query.dto';

describe('AuditQueryService', () => {
	const findMany = jest.fn();
	const count = jest.fn();
	const findUnique = jest.fn();
	const service = new AuditQueryService({
		auditLog: { findMany, count, findUnique },
	} as never);

	beforeEach(() => {
		findMany.mockReset();
		count.mockReset();
		findUnique.mockReset();
	});

	it('returns bounded, stable newest-first results and total', async () => {
		findMany.mockResolvedValue([
			{
				id: 'a',
				tenantId: null,
				actorType: AuditActorType.SYSTEM,
				actorId: null,
				actorRoleCode: null,
				action: AuditAction.LOGIN,
				resource: 'auth',
				resourceId: null,
				createdAt: new Date('2026-01-01T00:00:00Z'),
				before: { passwordHash: 'secret' },
				after: { accessToken: 'secret' },
			},
		]);
		count.mockResolvedValue(101);

		const result = await service.list({
			page: 1,
			pageSize: 100,
			action: AuditAction.LOGIN,
		});

		expect(result).toMatchObject({ page: 1, pageSize: 100, total: 101 });
		expect(result.items[0]).toMatchObject({
			id: 'a',
			before: { passwordHash: '[REDACTED]' },
			after: { accessToken: '[REDACTED]' },
		});
		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				take: 100,
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			}),
		);
		expect(count).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.any(Object) }),
		);
	});

	it('clamps oversized pages and applies approved identifier search', async () => {
		findMany.mockResolvedValue([]);
		count.mockResolvedValue(0);

		await service.list({ page: 2, pageSize: 1000, q: 'admin-1' });

		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({ skip: 100, take: 100 }),
		);
		const where = findMany.mock.calls[0][0].where;
		expect(where.OR).toHaveLength(3);
		expect(where.OR[0]).toEqual({
			actorId: { contains: 'admin-1', mode: 'insensitive' },
		});
	});

	it('clamps page sizes below one at the HTTP DTO boundary', () => {
		expect(plainToInstance(AuditQueryDto, { pageSize: 0 }).pageSize).toBe(1);
	});

	it('rejects invalid date and enum query values at validation boundary', async () => {
		const errors = await validate(
			plainToInstance(AuditQueryDto, {
				from: 'not-a-date',
				action: 'NOT_AN_AUDIT_ACTION',
			}),
		);
		expect(errors.map((error) => error.property)).toEqual(
			expect.arrayContaining(['from', 'action']),
		);
	});

	it('accepts every current AuditAction value in the read contract', async () => {
		for (const action of Object.values(AuditAction)) {
			const errors = await validate(plainToInstance(AuditQueryDto, { action }));
			expect(errors).toHaveLength(0);
		}
	});

	it('rejects inverted dates before touching the database', async () => {
		await expect(
			service.list({
				page: 1,
				pageSize: 20,
				from: '2026-02-01T00:00:00Z',
				to: '2026-01-01T00:00:00Z',
			}),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(findMany).not.toHaveBeenCalled();
	});

	it('converts database failures to the standard 500 exception', async () => {
		findMany.mockRejectedValue(new Error('database credentials must not leak'));
		count.mockResolvedValue(0);

		await expect(
			service.list({ page: 1, pageSize: 20 }),
		).rejects.toBeInstanceOf(InternalServerErrorException);
	});

	it('returns a sanitized detail event and hides database errors', async () => {
		findUnique.mockResolvedValue({
			id: 'event-1',
			tenantId: 'tenant-1',
			actorType: AuditActorType.PLATFORM_ADMIN,
			actorId: 'admin-1',
			actorRoleCode: 'SALER',
			action: AuditAction.ADMIN_CREATE,
			resource: 'admin',
			resourceId: 'admin-2',
			createdAt: new Date('2026-01-01T00:00:00Z'),
			before: { passwordHash: 'raw', displayName: 'Old' },
			after: [{ accessToken: 'raw-token', displayName: 'New' }],
		});

		await expect(service.findById('event-1')).resolves.toMatchObject({
			id: 'event-1',
			before: { passwordHash: '[REDACTED]', displayName: 'Old' },
			after: [{ accessToken: '[REDACTED]', displayName: 'New' }],
		});

		findUnique.mockResolvedValue(null);
		await expect(service.findById('missing')).rejects.toBeInstanceOf(
			NotFoundException,
		);
		findUnique.mockRejectedValue(new Error('raw database detail'));
		await expect(service.findById('event-1')).rejects.toBeInstanceOf(
			InternalServerErrorException,
		);
	});
});
