import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditActorType } from '@prisma/client';
import type { AuditLogger } from '../audit/audit-logger.service';
import type { PasswordService } from '../auth/password.service';
import type { RefreshTokenStore } from '../auth/refresh-token.store';
import type { PrismaService } from '../prisma/prisma.service';
import { SUPER_ADMIN_ROLE_CODE } from './admin.constants';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
	let prisma: {
		platformAdmin: {
			findUnique: jest.Mock;
			findMany: jest.Mock;
			count: jest.Mock;
			create: jest.Mock;
			update: jest.Mock;
		};
		role: { findMany: jest.Mock; findFirst: jest.Mock };
		adminRoleAssignment: {
			count: jest.Mock;
			findFirst: jest.Mock;
			findMany: jest.Mock;
			createMany: jest.Mock;
			deleteMany: jest.Mock;
		};
		$executeRaw: jest.Mock;
		auditLogCreate: jest.Mock;
	};
	let passwords: { hash: jest.Mock };
	let store: { revokeAllForAdmin: jest.Mock };
	let audit: { run: jest.Mock };
	let service: AdminUsersService;

	const superRoleId = 'role-sa';
	const supportRoleId = 'role-support';
	const actorSa = {
		actorId: 'actor-1',
		actorRoleCode: SUPER_ADMIN_ROLE_CODE,
		actorRoleCodes: [SUPER_ADMIN_ROLE_CODE],
	};
	const actorBilling = {
		actorId: 'actor-billing',
		actorRoleCode: 'BILLING',
		actorRoleCodes: ['BILLING'],
	};

	function adminRow(overrides: Record<string, unknown> = {}) {
		return {
			id: 'admin-1',
			email: 'a@x.com',
			fullName: 'Admin One',
			status: 'ACTIVE',
			lastLoginAt: null,
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-02'),
			roleAssignments: [
				{
					role: {
						code: SUPER_ADMIN_ROLE_CODE,
						permissions: [],
					},
				},
			],
			...overrides,
		};
	}

	beforeEach(() => {
		const auditLogCreate = jest.fn().mockResolvedValue({});
		prisma = {
			platformAdmin: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
				count: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
			},
			role: {
				findMany: jest.fn(),
				findFirst: jest.fn(),
			},
			adminRoleAssignment: {
				count: jest.fn(),
				findFirst: jest.fn(),
				findMany: jest.fn().mockResolvedValue([]),
				createMany: jest.fn(),
				deleteMany: jest.fn(),
			},
			$executeRaw: jest.fn().mockResolvedValue(1),
			auditLogCreate,
		};
		passwords = { hash: jest.fn().mockResolvedValue('hashed') };
		store = { revokeAllForAdmin: jest.fn().mockResolvedValue(undefined) };
		audit = {
			run: jest.fn(async (_input, fn) => {
				const tx = {
					platformAdmin: prisma.platformAdmin,
					adminRoleAssignment: prisma.adminRoleAssignment,
					$executeRaw: prisma.$executeRaw,
					auditLog: { create: prisma.auditLogCreate },
				};
				return fn(tx);
			}),
		};
		service = new AdminUsersService(
			prisma as unknown as PrismaService,
			passwords as unknown as PasswordService,
			store as unknown as RefreshTokenStore,
			audit as unknown as AuditLogger,
		);
	});

	describe('create — SUPER_ADMIN assign gate', () => {
		it('forbids non-SUPER_ADMIN from assigning SUPER_ADMIN role', async () => {
			prisma.platformAdmin.findUnique.mockResolvedValue(null);
			prisma.role.findMany.mockResolvedValue([{ id: superRoleId }]);
			prisma.role.findFirst.mockResolvedValue({ id: superRoleId });

			await expect(
				service.create(
					{
						email: 'new@x.com',
						fullName: 'New',
						password: 'Password1!',
						roleIds: [superRoleId],
					},
					actorBilling,
				),
			).rejects.toBeInstanceOf(ForbiddenException);

			expect(audit.run).not.toHaveBeenCalled();
		});

		it('allows SUPER_ADMIN to assign SUPER_ADMIN role + emits ASSIGN audit', async () => {
			prisma.platformAdmin.findUnique
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(adminRow());
			prisma.role.findMany.mockResolvedValue([{ id: superRoleId }]);
			prisma.role.findFirst.mockResolvedValue({ id: superRoleId });
			prisma.platformAdmin.create.mockResolvedValue({ id: 'admin-1' });
			prisma.adminRoleAssignment.createMany.mockResolvedValue({ count: 1 });

			const result = await service.create(
				{
					email: 'new@x.com',
					fullName: 'New',
					password: 'Password1!',
					roleIds: [superRoleId],
				},
				actorSa,
			);

			expect(result.id).toBe('admin-1');
			expect(audit.run).toHaveBeenCalled();
			expect(audit.run.mock.calls[0][0].action).toBe(AuditAction.ADMIN_CREATE);
			expect(audit.run.mock.calls[0][0].actorType).toBe(
				AuditActorType.PLATFORM_ADMIN,
			);
			expect(prisma.auditLogCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						action: AuditAction.ADMIN_ROLE_ASSIGN,
						after: { roleId: superRoleId },
					}),
				}),
			);
		});
	});

	describe('update — SUPER_ADMIN assign gate', () => {
		it('forbids BILLING from promoting target to SUPER_ADMIN', async () => {
			prisma.platformAdmin.findUnique.mockResolvedValue(
				adminRow({
					roleAssignments: [
						{ role: { code: 'SUPPORT', permissions: [] } },
					],
				}),
			);
			prisma.adminRoleAssignment.findMany.mockResolvedValue([
				{ roleId: supportRoleId, role: { code: 'SUPPORT' } },
			]);
			prisma.role.findMany.mockResolvedValue([{ id: superRoleId }]);
			prisma.role.findFirst.mockResolvedValue({ id: superRoleId });

			await expect(
				service.update('admin-1', { roleIds: [superRoleId] }, actorBilling),
			).rejects.toBeInstanceOf(ForbiddenException);
			expect(audit.run).not.toHaveBeenCalled();
		});
	});

	describe('update — sole SUPER_ADMIN demote lockout', () => {
		it('rejects stripping SUPER_ADMIN from last active SUPER_ADMIN', async () => {
			prisma.platformAdmin.findUnique.mockResolvedValue(adminRow());
			prisma.adminRoleAssignment.findMany.mockResolvedValue([
				{ roleId: superRoleId, role: { code: SUPER_ADMIN_ROLE_CODE } },
			]);
			prisma.role.findMany.mockResolvedValue([
				{ id: supportRoleId, code: 'SUPPORT' },
			]);
			prisma.adminRoleAssignment.findFirst.mockResolvedValue({ id: 'asg-1' });
			prisma.adminRoleAssignment.count.mockResolvedValue(1);

			await expect(
				service.update('admin-1', { roleIds: [supportRoleId] }, actorSa),
			).rejects.toBeInstanceOf(ConflictException);

			expect(prisma.$executeRaw).toHaveBeenCalled();
			expect(prisma.adminRoleAssignment.deleteMany).not.toHaveBeenCalled();
		});

		it('allows demote when another SUPER_ADMIN remains + emits REVOKE/ASSIGN', async () => {
			prisma.platformAdmin.findUnique
				.mockResolvedValueOnce(adminRow())
				.mockResolvedValueOnce(
					adminRow({
						roleAssignments: [
							{ role: { code: 'SUPPORT', permissions: [] } },
						],
					}),
				);
			prisma.adminRoleAssignment.findMany.mockResolvedValue([
				{ roleId: superRoleId, role: { code: SUPER_ADMIN_ROLE_CODE } },
			]);
			prisma.role.findMany.mockResolvedValue([
				{ id: supportRoleId, code: 'SUPPORT' },
			]);
			prisma.adminRoleAssignment.findFirst.mockResolvedValue({ id: 'asg-1' });
			prisma.adminRoleAssignment.count.mockResolvedValue(2);
			prisma.adminRoleAssignment.deleteMany.mockResolvedValue({ count: 1 });
			prisma.adminRoleAssignment.createMany.mockResolvedValue({ count: 1 });

			await service.update('admin-1', { roleIds: [supportRoleId] }, actorSa);

			expect(prisma.adminRoleAssignment.deleteMany).toHaveBeenCalled();
			expect(prisma.auditLogCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						action: AuditAction.ADMIN_ROLE_REVOKE,
						before: { roleId: superRoleId },
					}),
				}),
			);
			expect(prisma.auditLogCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						action: AuditAction.ADMIN_ROLE_ASSIGN,
						after: { roleId: supportRoleId },
					}),
				}),
			);
		});
	});

	describe('deactivate — sole SUPER_ADMIN + advisory lock', () => {
		it('acquires advisory lock then rejects last active SUPER_ADMIN', async () => {
			prisma.platformAdmin.findUnique.mockResolvedValue({
				id: 'admin-1',
				status: 'ACTIVE',
			});
			prisma.adminRoleAssignment.findFirst.mockResolvedValue({ id: 'asg-1' });
			prisma.adminRoleAssignment.count.mockResolvedValue(1);

			await expect(
				service.deactivate('admin-1', actorSa),
			).rejects.toBeInstanceOf(ConflictException);

			expect(prisma.$executeRaw).toHaveBeenCalled();
			expect(prisma.platformAdmin.update).not.toHaveBeenCalled();
		});

		it('rejects self-deactivate', async () => {
			await expect(
				service.deactivate('actor-1', actorSa),
			).rejects.toBeInstanceOf(BadRequestException);
		});

		it('deactivates when another SUPER_ADMIN remains', async () => {
			prisma.platformAdmin.findUnique.mockResolvedValue({
				id: 'admin-2',
				status: 'ACTIVE',
			});
			prisma.adminRoleAssignment.findFirst.mockResolvedValue({ id: 'asg-2' });
			prisma.adminRoleAssignment.count.mockResolvedValue(2);
			prisma.platformAdmin.update.mockResolvedValue({});

			await service.deactivate('admin-2', actorSa);

			expect(prisma.$executeRaw).toHaveBeenCalled();
			expect(prisma.platformAdmin.update).toHaveBeenCalledWith({
				where: { id: 'admin-2' },
				data: { status: 'DISABLED' },
			});
		});
	});

	describe('resetPassword — best-effort revoke', () => {
		it('succeeds even when Redis revoke throws', async () => {
			prisma.platformAdmin.findUnique.mockResolvedValue({ id: 'admin-2' });
			prisma.platformAdmin.update.mockResolvedValue({});
			store.revokeAllForAdmin.mockRejectedValue(new Error('redis down'));

			await expect(
				service.resetPassword(
					'admin-2',
					{ newPassword: 'NewPass1!' },
					actorSa,
				),
			).resolves.toBeUndefined();

			expect(prisma.platformAdmin.update).toHaveBeenCalled();
			expect(store.revokeAllForAdmin).toHaveBeenCalledWith('admin-2');
		});

		it('rejects reset of own password via admin API', async () => {
			await expect(
				service.resetPassword(
					'actor-1',
					{ newPassword: 'NewPass1!' },
					actorSa,
				),
			).rejects.toBeInstanceOf(BadRequestException);
		});
	});

	describe('list — pageSize clamp', () => {
		it('clamps pageSize to 100', async () => {
			prisma.platformAdmin.findMany.mockResolvedValue([]);
			prisma.platformAdmin.count.mockResolvedValue(0);

			const result = await service.list({ page: 1, pageSize: 10_000 });
			expect(result.pageSize).toBe(100);
			expect(prisma.platformAdmin.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ take: 100 }),
			);
		});
	});

	describe('findById', () => {
		it('404 when missing', async () => {
			prisma.platformAdmin.findUnique.mockResolvedValue(null);
			await expect(service.findById('missing')).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});

		it('filters to admin roles only in include where', async () => {
			prisma.platformAdmin.findUnique.mockResolvedValue(adminRow());
			await service.findById('admin-1');
			expect(prisma.platformAdmin.findUnique).toHaveBeenCalledWith(
				expect.objectContaining({
					include: expect.objectContaining({
						roleAssignments: expect.objectContaining({
							where: {
								role: { isAdmin: true, tenantId: null },
							},
						}),
					}),
				}),
			);
		});
	});

	describe('validate role ids', () => {
		it('rejects unknown roleIds on create', async () => {
			prisma.platformAdmin.findUnique.mockResolvedValue(null);
			prisma.role.findMany.mockResolvedValue([{ id: supportRoleId }]);

			await expect(
				service.create(
					{
						email: 'x@y.com',
						fullName: 'X',
						password: 'Password1!',
						roleIds: [supportRoleId, 'ghost'],
					},
					actorSa,
				),
			).rejects.toBeInstanceOf(BadRequestException);
		});
	});
});
