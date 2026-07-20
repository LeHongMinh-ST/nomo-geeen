import { BadRequestException } from '@nestjs/common';
import { AuditAction, AuditActorType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { AuditLogger } from './audit-logger.service';

describe('AuditLogger.run', () => {
	let prisma: PrismaService;
	let logger: AuditLogger;

	beforeEach(() => {
		prisma = {
			$transaction: jest.fn(async (fnOrOps: unknown) => {
				// Interactive transaction signature: receives a function. Pass a
				// mock tx with `auditLog.create` and call fn(tx).
				if (typeof fnOrOps === 'function') {
					const tx = {
						auditLog: {
							create: jest.fn().mockResolvedValue({}),
						},
					};
					return fnOrOps(tx);
				}
				return [];
			}),
		} as unknown as PrismaService;
		logger = new AuditLogger(prisma);
	});

	const baseInput = {
		actorId: 'admin-1',
		actorType: AuditActorType.PLATFORM_ADMIN,
		actorRoleCode: 'SUPER_ADMIN',
		action: AuditAction.ADMIN_CREATE,
		resource: 'platform_admin',
		resourceId: 'admin-2',
		after: { email: 'new@x' },
	};

	it('writes one audit row inside the same transaction as state change', async () => {
		const txAuditCreate = jest.fn().mockResolvedValue({});
		prisma.$transaction = jest.fn(async (fnOrOps: unknown) => {
			if (typeof fnOrOps === 'function') {
				const tx = { auditLog: { create: txAuditCreate } };
				return fnOrOps(tx);
			}
			return [];
		});

		const created = { id: 'admin-2' };
		const result = await logger.run(baseInput, async (_tx) => {
			// Caller may use tx to do related state changes (e.g. role assignment).
			// Demo: do nothing here; just return the created entity.
			return created;
		});

		expect(result).toBe(created);
		expect(txAuditCreate).toHaveBeenCalledTimes(1);
		expect(txAuditCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				actorType: AuditActorType.PLATFORM_ADMIN,
				actorId: 'admin-1',
				actorRoleCode: 'SUPER_ADMIN',
				action: AuditAction.ADMIN_CREATE,
				resource: 'platform_admin',
				resourceId: 'admin-2',
				after: { email: 'new@x' },
			}),
		});
	});

	it('propagates an optional tenant scope in transactional and event-only writes', async () => {
		const txCreate = jest.fn().mockResolvedValue({});
		prisma.$transaction = jest.fn(async (fnOrOps: unknown) => {
			if (typeof fnOrOps === 'function') {
				return fnOrOps({ auditLog: { create: txCreate } });
			}
			return [];
		});

		await logger.run(
			{ ...baseInput, tenantId: 'tenant-1' },
			async () => undefined,
		);
		expect(txCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({ tenantId: 'tenant-1' }),
		});

		const eventCreate = jest.fn().mockResolvedValue({});
		(prisma as unknown as { auditLog: { create: jest.Mock } }).auditLog = {
			create: eventCreate,
		};
		await logger.log({ ...baseInput, tenantId: 'tenant-1' });
		expect(eventCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({ tenantId: 'tenant-1' }),
		});
	});

	it('throws BadRequestException on unknown action (R6.5 allowlist)', async () => {
		await expect(
			logger.run(
				{ ...baseInput, action: 'INVALID_CODE' as unknown as AuditAction },
				async () => undefined,
			),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('rejects SYSTEM actor with non-null actorId (R6.1)', async () => {
		await expect(
			logger.run(
				{
					...baseInput,
					actorType: AuditActorType.SYSTEM,
					actorId: 'admin-1',
				},
				async () => undefined,
			),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it('accepts SYSTEM actor with actorId=null (R6.1 + R6.2 actor_role_code nullable)', async () => {
		const txAuditCreate = jest.fn().mockResolvedValue({});
		prisma.$transaction = jest.fn(async (fnOrOps: unknown) => {
			if (typeof fnOrOps === 'function') {
				const tx = { auditLog: { create: txAuditCreate } };
				return fnOrOps(tx);
			}
			return [];
		});

		await logger.run(
			{
				actorId: null,
				actorType: AuditActorType.SYSTEM,
				actorRoleCode: null,
				action: AuditAction.ROLE_CREATE,
				resource: 'role',
				resourceId: 'role-1',
				after: { code: 'SUPER_ADMIN' },
			},
			async () => undefined,
		);
		expect(txAuditCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				actorType: AuditActorType.SYSTEM,
				actorId: null,
				actorRoleCode: null,
				action: AuditAction.ROLE_CREATE,
			}),
		});
	});

	it('rolls back state change when audit create fails (R6.4 same-tx)', async () => {
		const stateChange = jest.fn().mockResolvedValue({ id: 'admin-2' });
		const txAuditCreate = jest
			.fn()
			.mockRejectedValue(new Error('audit failed'));
		prisma.$transaction = jest.fn(async (fnOrOps: unknown) => {
			if (typeof fnOrOps === 'function') {
				const tx = { auditLog: { create: txAuditCreate } };
				return fnOrOps(tx); // audit failure propagates -> tx rolls back
			}
			return [];
		});

		await expect(logger.run(baseInput, stateChange)).rejects.toThrow(
			'audit failed',
		);
		expect(stateChange).toHaveBeenCalledTimes(1); // ran, then rolled back
	});

	it('persists before/after JSON snapshots for diff capability', async () => {
		const txAuditCreate = jest.fn().mockResolvedValue({});
		prisma.$transaction = jest.fn(async (fnOrOps: unknown) => {
			if (typeof fnOrOps === 'function') {
				const tx = { auditLog: { create: txAuditCreate } };
				return fnOrOps(tx);
			}
			return [];
		});

		await logger.run(
			{
				...baseInput,
				action: AuditAction.ADMIN_UPDATE,
				before: { fullName: 'Old Name' },
				after: { fullName: 'New Name' },
			},
			async () => undefined,
		);
		expect(txAuditCreate).toHaveBeenCalledWith({
			data: expect.objectContaining({
				before: { fullName: 'Old Name' },
				after: { fullName: 'New Name' },
			}),
		});
	});

	it('log() writes event-only audit row without transaction', async () => {
		const create = jest.fn().mockResolvedValue({});
		(prisma as unknown as { auditLog: { create: jest.Mock } }).auditLog = {
			create,
		};

		await logger.log({
			...baseInput,
			action: AuditAction.ROLE_PERMISSION_GRANT,
			after: { permissionId: 'perm-1' },
		});

		expect(prisma.$transaction).not.toHaveBeenCalled();
		expect(create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				action: AuditAction.ROLE_PERMISSION_GRANT,
				after: { permissionId: 'perm-1' },
			}),
		});
	});
});
