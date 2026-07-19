import {
	BadRequestException,
	ConflictException,
	HttpException,
	NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, TenantStatus } from '@prisma/client';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
	const now = new Date('2026-07-18T00:00:00.000Z');
	const baseRow = {
		id: '11111111-1111-4111-8111-111111111111',
		slug: 'acme',
		name: 'Acme Store',
		tenantType: 'RETAIL_DEALER' as const,
		mode: 'SIMPLE' as const,
		status: TenantStatus.ACTIVE,
		logoUrl: null as string | null,
		createdAt: now,
		updatedAt: now,
	};

	const prisma = {
		tenant: {
			findMany: jest.fn(),
			count: jest.fn(),
			findFirst: jest.fn(),
			findFirstOrThrow: jest.fn(),
			updateMany: jest.fn(),
		},
		supportTicket: {
			count: jest.fn(),
		},
		warehouse: { count: jest.fn() },
		product: { count: jest.fn() },
		customer: { count: jest.fn() },
		sale: { count: jest.fn() },
		storedFile: { aggregate: jest.fn() },
		role: { findMany: jest.fn() },
		$transaction: jest.fn(),
	};

	const audit = {
		run: jest.fn(),
		log: jest.fn(),
		writeInTx: jest.fn(),
	};

	const passwords = {
		hash: jest.fn(),
		verify: jest.fn(),
		generate: jest.fn(),
	};

	const ctx = {
		actorId: 'admin-1',
		actorRoleCode: 'SUPER_ADMIN',
		ipAddress: '127.0.0.1',
		userAgent: 'jest',
	};

	let service: TenantsService;

	beforeEach(() => {
		jest.clearAllMocks();
		audit.run.mockImplementation(
			async (_input: unknown, fn: (tx: typeof prisma) => Promise<unknown>) =>
				fn(prisma as never),
		);
		audit.log.mockResolvedValue(undefined);
		prisma.warehouse.count.mockResolvedValue(0);
		prisma.product.count.mockResolvedValue(0);
		prisma.customer.count.mockResolvedValue(0);
		prisma.sale.count.mockResolvedValue(0);
		prisma.storedFile.aggregate.mockResolvedValue({
			_sum: { sizeBytes: BigInt(0) },
		});
		service = new TenantsService(
			prisma as never,
			audit as never,
			passwords as never,
		);
	});

	describe('list', () => {
		it('returns paginated items ordered by createdAt desc, id desc with soft-delete filter', async () => {
			prisma.tenant.findMany.mockResolvedValue([baseRow]);
			prisma.tenant.count.mockResolvedValue(1);

			const result = await service.list({ page: 1, pageSize: 20 });

			expect(prisma.tenant.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { deletedAt: null },
					orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
					skip: 0,
					take: 20,
				}),
			);
			expect(result).toEqual({
				items: [
					{
						...baseRow,
						createdAt: now.toISOString(),
						updatedAt: now.toISOString(),
					},
				],
				page: 1,
				pageSize: 20,
				total: 1,
			});
		});

		it('applies status and free-text q filters', async () => {
			prisma.tenant.findMany.mockResolvedValue([]);
			prisma.tenant.count.mockResolvedValue(0);

			await service.list({
				page: 2,
				pageSize: 10,
				status: TenantStatus.SUSPENDED,
				q: 'acme',
			});

			expect(prisma.tenant.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						deletedAt: null,
						status: TenantStatus.SUSPENDED,
						OR: [
							{ name: { contains: 'acme', mode: 'insensitive' } },
							{ slug: { contains: 'acme', mode: 'insensitive' } },
						],
					},
					skip: 10,
					take: 10,
				}),
			);
		});
	});

	describe('findById', () => {
		it('returns detail with aggregate counts', async () => {
			prisma.tenant.findFirst.mockResolvedValue({
				...baseRow,
				_count: { users: 3, subscriptions: 1 },
			});
			prisma.supportTicket.count.mockResolvedValue(2);

			const detail = await service.findById(baseRow.id);

			expect(prisma.tenant.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: baseRow.id, deletedAt: null },
				}),
			);
			expect(prisma.supportTicket.count).toHaveBeenCalledWith({
				where: {
					tenantId: baseRow.id,
					status: { in: ['OPEN', 'IN_PROGRESS'] },
				},
			});
			expect(detail.counts).toEqual({
				users: 3,
				subscriptions: 1,
				openTickets: 2,
			});
		});

		it('throws NotFoundException when missing or soft-deleted', async () => {
			prisma.tenant.findFirst.mockResolvedValue(null);
			await expect(service.findById(baseRow.id)).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});
	});

	describe('update', () => {
		it('updates with optimistic concurrency and audits before/after', async () => {
			const afterRow = {
				...baseRow,
				name: 'Acme Renamed',
				updatedAt: new Date('2026-07-18T01:00:00.000Z'),
			};
			prisma.tenant.findFirst
				.mockResolvedValueOnce(baseRow)
				.mockResolvedValueOnce({
					...afterRow,
					_count: { users: 0, subscriptions: 0 },
				});
			prisma.tenant.updateMany.mockResolvedValue({ count: 1 });
			prisma.tenant.findFirstOrThrow.mockResolvedValue(afterRow);
			prisma.supportTicket.count.mockResolvedValue(0);

			const result = await service.update(
				baseRow.id,
				{
					name: 'Acme Renamed',
					expectedUpdatedAt: now.toISOString(),
				},
				ctx,
			);

			expect(audit.run).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.TENANT_UPDATE,
					resourceId: baseRow.id,
					before: expect.objectContaining({ name: 'Acme Store' }),
				}),
				expect.any(Function),
			);
			const auditArg = audit.run.mock.calls[0][0] as {
				after?: { name: string };
			};
			expect(auditArg.after?.name).toBe('Acme Renamed');
			expect(result.name).toBe('Acme Renamed');
		});

		it('rejects stale expectedUpdatedAt with 409', async () => {
			prisma.tenant.findFirst.mockResolvedValue(baseRow);
			await expect(
				service.update(
					baseRow.id,
					{
						name: 'X',
						expectedUpdatedAt: '2020-01-01T00:00:00.000Z',
					},
					ctx,
				),
			).rejects.toBeInstanceOf(ConflictException);
			expect(audit.run).not.toHaveBeenCalled();
		});

		it('rejects private-host logoUrl marker', async () => {
			await expect(
				service.update(
					baseRow.id,
					{
						logoUrl: '__PRIVATE_HOST__',
						expectedUpdatedAt: now.toISOString(),
					},
					ctx,
				),
			).rejects.toBeInstanceOf(BadRequestException);
		});
	});

	describe('transitionStatus', () => {
		it('applies allowed transition with atomic update + audit', async () => {
			prisma.tenant.findFirst
				.mockResolvedValueOnce(baseRow)
				.mockResolvedValueOnce({
					...baseRow,
					status: TenantStatus.SUSPENDED,
					_count: { users: 0, subscriptions: 0 },
				});
			prisma.tenant.updateMany.mockResolvedValue({ count: 1 });
			prisma.supportTicket.count.mockResolvedValue(0);

			const result = await service.transitionStatus(
				baseRow.id,
				{ status: TenantStatus.SUSPENDED, reason: 'abuse' },
				ctx,
			);

			expect(audit.run).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.TENANT_STATUS_CHANGE,
					before: { status: TenantStatus.ACTIVE },
					after: {
						status: TenantStatus.SUSPENDED,
						reason: 'abuse',
					},
				}),
				expect.any(Function),
			);
			expect(prisma.tenant.updateMany).toHaveBeenCalledWith({
				where: {
					id: baseRow.id,
					deletedAt: null,
					status: TenantStatus.ACTIVE,
				},
				data: { status: TenantStatus.SUSPENDED },
			});
			expect(result.status).toBe(TenantStatus.SUSPENDED);
		});

		it('rejects no-op / unsupported transition with 409', async () => {
			prisma.tenant.findFirst.mockResolvedValue(baseRow);
			await expect(
				service.transitionStatus(
					baseRow.id,
					{ status: TenantStatus.ACTIVE },
					ctx,
				),
			).rejects.toBeInstanceOf(ConflictException);
			expect(audit.run).not.toHaveBeenCalled();
		});
	});

	describe('exportCsv', () => {
		it('returns formula-safe CSV and audits before body', async () => {
			prisma.tenant.findMany.mockResolvedValue([
				{ ...baseRow, name: "=cmd|'/c calc'" },
			]);

			const csv = await service.exportCsv({ page: 1, pageSize: 20 }, ctx);

			expect(
				csv.startsWith(
					'id,slug,name,tenantType,mode,status,createdAt,updatedAt\n',
				),
			).toBe(true);
			expect(csv).toContain("'=cmd|'/c calc'");
			expect(audit.log).toHaveBeenCalledWith(
				expect.objectContaining({
					action: AuditAction.TENANT_EXPORT,
					after: expect.objectContaining({ rowCount: 1 }),
				}),
			);
		});

		it('returns 413 when more than 10000 rows match', async () => {
			prisma.tenant.findMany.mockResolvedValue(
				Array.from({ length: 10_001 }, (_, i) => ({
					...baseRow,
					id: `id-${i}`,
					slug: `s-${i}`,
				})),
			);

			await expect(
				service.exportCsv({ page: 1, pageSize: 20 }, ctx),
			).rejects.toBeInstanceOf(HttpException);
			expect(audit.log).not.toHaveBeenCalled();
		});
	});

	describe('create', () => {
		const dtoBase = {
			tenant: {
				name: 'Acme Store',
				slug: 'acme',
				tenantType: 'RETAIL_DEALER' as const,
			},
			owner: {
				fullName: 'Owner',
				username: 'owner',
				password: 'OwnerPass!123',
			},
		};

		// Reproduce the real @prisma/adapter-pg P2002 shape: no `meta.target`,
		// info nested under driverAdapterError.cause.constraint.fields.
		function knownRequestError(code: string, fields: string[]) {
			return new Prisma.PrismaClientKnownRequestError('unique failed', {
				code,
				clientVersion: 'test',
				meta: {
					modelName: 'Tenant',
					driverAdapterError: {
						name: 'DriverAdapterError',
						cause: {
							originalCode: '23505',
							originalMessage: `duplicate key value violates unique constraint "${fields.join('_')}_key"`,
							kind: 'UniqueConstraintViolation',
							constraint: { fields },
						},
					},
				},
			});
		}

		it('rejects when neither password nor generatePassword given (400 PASSWORD_MODE_INVALID)', async () => {
			const dto = {
				tenant: dtoBase.tenant,
				owner: { fullName: 'Owner', username: 'owner' },
			};
			await expect(service.create(dto as never, ctx)).rejects.toBeInstanceOf(
				BadRequestException,
			);
			expect(prisma.$transaction).not.toHaveBeenCalled();
		});

		it('rejects when both password and generatePassword given (400 PASSWORD_MODE_INVALID)', async () => {
			const dto = {
				tenant: dtoBase.tenant,
				owner: {
					fullName: 'Owner',
					username: 'owner',
					password: 'OwnerPass!123',
					generatePassword: true,
				},
			};
			await expect(service.create(dto as never, ctx)).rejects.toBeInstanceOf(
				BadRequestException,
			);
			expect(prisma.$transaction).not.toHaveBeenCalled();
		});

		it('maps P2002 on username to 409 USERNAME_TAKEN', async () => {
			passwords.hash.mockResolvedValue('hashed');
			prisma.role.findMany.mockResolvedValue([]);
			prisma.$transaction.mockRejectedValue(
				knownRequestError('P2002', ['tenantId', 'username']),
			);

			await expect(service.create(dtoBase as never, ctx)).rejects.toMatchObject({
				response: { reason: 'USERNAME_TAKEN' },
			});
		});

		it('maps P2002 on slug to 409 SLUG_TAKEN', async () => {
			passwords.hash.mockResolvedValue('hashed');
			prisma.role.findMany.mockResolvedValue([]);
			prisma.$transaction.mockRejectedValue(
				knownRequestError('P2002', ['slug']),
			);

			await expect(service.create(dtoBase as never, ctx)).rejects.toMatchObject({
				response: { reason: 'SLUG_TAKEN' },
			});
		});

		it('rethrows unrelated P2002 without mislabeling as SLUG_TAKEN', async () => {
			passwords.hash.mockResolvedValue('hashed');
			prisma.role.findMany.mockResolvedValue([]);
			// A role uniqueness violation (tenantId, code) — neither slug nor username.
			const err = knownRequestError('P2002', ['tenantId', 'code']);
			prisma.$transaction.mockRejectedValue(err);

			await expect(service.create(dtoBase as never, ctx)).rejects.toBe(err);
		});
	});
});
