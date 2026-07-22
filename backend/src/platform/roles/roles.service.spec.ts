import {
	BadRequestException,
	ConflictException,
	NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditActorType } from '@prisma/client';
import type { AuditLogger } from '../audit/audit-logger.service';
import type { PrismaService } from '../prisma/prisma.service';
import { RolesService } from './roles.service';

describe('RolesService', () => {
	let prisma: {
		role: {
			findMany: jest.Mock;
			findUnique: jest.Mock;
			findFirst: jest.Mock;
			create: jest.Mock;
			update: jest.Mock;
			findUniqueOrThrow: jest.Mock;
			delete: jest.Mock;
		};
		permission: { findMany: jest.Mock; count: jest.Mock };
		rolePermission: { createMany: jest.Mock; deleteMany: jest.Mock };
		adminRoleAssignment: { count: jest.Mock };
		auditLogCreate: jest.Mock;
	};
	let audit: { run: jest.Mock };
	let service: RolesService;

	const ctx = { actorId: 'actor-1', actorRoleCode: 'SUPER_ADMIN' };

	function roleRow(overrides: Record<string, unknown> = {}) {
		return {
			id: 'role-1',
			code: 'SUPPORT',
			name: 'Support',
			isSystem: false,
			isAdmin: true,
			tenantId: null,
			createdAt: new Date('2024-01-01'),
			updatedAt: new Date('2024-01-02'),
			permissions: [],
			...overrides,
		};
	}

	function permRow(id: string, code: string) {
		return { permission: { id, code } };
	}

	beforeEach(() => {
		const auditLogCreate = jest.fn().mockResolvedValue({});
		prisma = {
			role: {
				findMany: jest.fn(),
				findUnique: jest.fn(),
				findFirst: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				findUniqueOrThrow: jest.fn(),
				delete: jest.fn(),
			},
			permission: { findMany: jest.fn(), count: jest.fn() },
			rolePermission: { createMany: jest.fn(), deleteMany: jest.fn() },
			adminRoleAssignment: { count: jest.fn() },
			auditLogCreate,
		};
		audit = {
			run: jest.fn(async (_input, fn) => {
				const tx = {
					role: prisma.role,
					rolePermission: prisma.rolePermission,
					auditLog: { create: prisma.auditLogCreate },
				};
				return fn(tx);
			}),
		};
		service = new RolesService(
			prisma as unknown as PrismaService,
			audit as unknown as AuditLogger,
		);
	});

	describe('list', () => {
		it('returns platform roles with sorted permission codes', async () => {
			prisma.role.findMany.mockResolvedValue([
				roleRow({
					permissions: [
						permRow('p2', 'admin.role:view'),
						permRow('p1', 'admin.role:edit'),
					],
				}),
			]);

			const result = await service.list();

			expect(prisma.role.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { tenantId: null, isAdmin: true },
					orderBy: { code: 'asc' },
				}),
			);
			expect(result[0].permissions).toEqual([
				'admin.role:edit',
				'admin.role:view',
			]);
		});
	});

	describe('findById', () => {
		it('404 when missing', async () => {
			prisma.role.findUnique.mockResolvedValue(null);
			await expect(service.findById('missing')).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});

		it('404 when role is tenant-scoped (not admin)', async () => {
			prisma.role.findUnique.mockResolvedValue(
				roleRow({ tenantId: 'tenant-1', isAdmin: false }),
			);
			await expect(service.findById('role-1')).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});
	});

	describe('create', () => {
		it('rejects unknown permissionIds with INVALID_PERMISSION_ID', async () => {
			prisma.permission.count.mockResolvedValue(1);

			await expect(
				service.create(
					{ code: 'NEW_ROLE', name: 'New Role', permissionIds: ['p1', 'p2'] },
					ctx,
				),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(audit.run).not.toHaveBeenCalled();
		});

		it('rejects duplicate role code with ROLE_CODE_DUPLICATE', async () => {
			prisma.permission.count.mockResolvedValue(0);
			prisma.role.findFirst.mockResolvedValue(roleRow());

			await expect(
				service.create({ code: 'SUPPORT', name: 'Support' }, ctx),
			).rejects.toBeInstanceOf(ConflictException);
		});

		it('creates role + writes role_permission rows + emits ROLE_CREATE audit', async () => {
			prisma.permission.count.mockResolvedValue(2);
			prisma.role.findFirst.mockResolvedValue(null);
			prisma.role.create.mockResolvedValue(roleRow({ id: 'role-2' }));
			prisma.rolePermission.createMany.mockResolvedValue({ count: 2 });
			prisma.role.findUniqueOrThrow.mockResolvedValue(
				roleRow({
					id: 'role-2',
					permissions: [
						permRow('p1', 'admin.role:view'),
						permRow('p2', 'admin.role:edit'),
					],
				}),
			);

			const result = await service.create(
				{ code: 'NEW_ROLE', name: 'New Role', permissionIds: ['p1', 'p2'] },
				ctx,
			);

			expect(result.id).toBe('role-2');
			expect(audit.run.mock.calls[0][0].action).toBe(AuditAction.ROLE_CREATE);
			expect(audit.run.mock.calls[0][0].actorType).toBe(
				AuditActorType.PLATFORM_ADMIN,
			);
			expect(prisma.role.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						tenantId: null,
						isAdmin: true,
						isSystem: false,
					}),
				}),
			);
			expect(prisma.rolePermission.createMany).toHaveBeenCalledWith({
				data: [
					{ roleId: 'role-2', permissionId: 'p1' },
					{ roleId: 'role-2', permissionId: 'p2' },
				],
			});
		});
	});

	describe('update', () => {
		it('404 when role missing or not admin-scoped', async () => {
			prisma.role.findUnique.mockResolvedValue(null);
			await expect(
				service.update('role-1', { name: 'X' }, ctx),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(audit.run).not.toHaveBeenCalled();
		});

		it('rejects unknown addPermissionIds', async () => {
			prisma.role.findUnique.mockResolvedValue(roleRow());
			prisma.permission.count.mockResolvedValue(0);

			await expect(
				service.update('role-1', { addPermissionIds: ['p-ghost'] }, ctx),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(audit.run).not.toHaveBeenCalled();
		});

		it('emits 1 ROLE_UPDATE + N GRANT + M REVOKE audit rows', async () => {
			prisma.role.findUnique.mockResolvedValue(
				roleRow({ permissions: [permRow('p-old', 'admin.role:view')] }),
			);
			prisma.permission.count.mockResolvedValue(1);
			prisma.role.update.mockResolvedValue({});
			prisma.rolePermission.createMany.mockResolvedValue({ count: 1 });
			prisma.rolePermission.deleteMany.mockResolvedValue({ count: 1 });
			prisma.role.findUniqueOrThrow.mockResolvedValue(
				roleRow({
					name: 'Renamed',
					permissions: [permRow('p-new', 'admin.role:edit')],
				}),
			);

			await service.update(
				'role-1',
				{
					name: 'Renamed',
					addPermissionIds: ['p-new'],
					removePermissionIds: ['p-old'],
				},
				ctx,
			);

			expect(audit.run.mock.calls[0][0].action).toBe(AuditAction.ROLE_UPDATE);
			expect(prisma.role.update).toHaveBeenCalledWith({
				where: { id: 'role-1' },
				data: { name: 'Renamed' },
			});
			expect(prisma.auditLogCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						action: AuditAction.ROLE_PERMISSION_GRANT,
						after: { permissionId: 'p-new' },
					}),
				}),
			);
			expect(prisma.auditLogCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						action: AuditAction.ROLE_PERMISSION_REVOKE,
						before: { permissionId: 'p-old' },
					}),
				}),
			);
		});

		it('ignores addPermissionIds already granted and removePermissionIds not present', async () => {
			prisma.role.findUnique.mockResolvedValue(
				roleRow({ permissions: [permRow('p-existing', 'admin.role:view')] }),
			);
			prisma.permission.count.mockResolvedValue(0);
			prisma.role.findUniqueOrThrow.mockResolvedValue(roleRow());

			await service.update(
				'role-1',
				{ addPermissionIds: ['p-existing'], removePermissionIds: ['p-absent'] },
				ctx,
			);

			expect(prisma.rolePermission.createMany).not.toHaveBeenCalled();
			expect(prisma.rolePermission.deleteMany).not.toHaveBeenCalled();
			expect(prisma.auditLogCreate).not.toHaveBeenCalled();
		});

		it('400 SYSTEM_ROLE_PROTECTED when renaming or changing grants on isSystem role', async () => {
			prisma.role.findUnique.mockResolvedValue(
				roleRow({
					isSystem: true,
					code: 'SUPER_ADMIN',
					permissions: [permRow('p-old', 'admin.role:view')],
				}),
			);
			await expect(
				service.update(
					'role-1',
					{ name: 'Hacked', addPermissionIds: ['p-new'] },
					ctx,
				),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(audit.run).not.toHaveBeenCalled();
		});
	});

	describe('remove', () => {
		it('404 when role missing or not admin-scoped', async () => {
			prisma.role.findUnique.mockResolvedValue(null);
			await expect(service.remove('role-1', ctx)).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});

		it('400 SYSTEM_ROLE_PROTECTED when isSystem=true', async () => {
			prisma.role.findUnique.mockResolvedValue(roleRow({ isSystem: true }));
			await expect(service.remove('role-1', ctx)).rejects.toBeInstanceOf(
				BadRequestException,
			);
			expect(audit.run).not.toHaveBeenCalled();
		});

		it('409 ROLE_IN_USE when assignments exist', async () => {
			prisma.role.findUnique.mockResolvedValue(roleRow());
			prisma.adminRoleAssignment.count.mockResolvedValue(2);
			await expect(service.remove('role-1', ctx)).rejects.toBeInstanceOf(
				ConflictException,
			);
			expect(audit.run).not.toHaveBeenCalled();
		});

		it('deletes role + emits ROLE_DELETE audit when free', async () => {
			prisma.role.findUnique.mockResolvedValue(roleRow());
			prisma.adminRoleAssignment.count.mockResolvedValue(0);
			prisma.role.delete.mockResolvedValue({});

			await service.remove('role-1', ctx);

			expect(prisma.role.delete).toHaveBeenCalledWith({
				where: { id: 'role-1' },
			});
			expect(audit.run.mock.calls[0][0].action).toBe(AuditAction.ROLE_DELETE);
		});
	});

	describe('listPermissions', () => {
		it('queries only admin-prefixed permission codes ordered by resource, action', async () => {
			prisma.permission.findMany.mockResolvedValue([]);
			await service.listPermissions();
			expect(prisma.permission.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { code: { startsWith: 'admin.' } },
					orderBy: [{ resource: 'asc' }, { action: 'asc' }],
				}),
			);
		});
	});
});
