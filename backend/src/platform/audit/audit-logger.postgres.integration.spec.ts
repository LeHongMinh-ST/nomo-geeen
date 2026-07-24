import { AuditAction, AuditActorType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogger } from './audit-logger.service';

const describePostgres =
	process.env.RUN_POSTGRES_INTEGRATION === '1' ? describe : describe.skip;

describePostgres('AuditLogger PostgreSQL transaction boundary', () => {
	let prisma: PrismaService;
	let logger: AuditLogger;

	beforeAll(async () => {
		prisma = new PrismaService();
		await prisma.$connect();
		logger = new AuditLogger(prisma);
		await prisma.$executeRawUnsafe(
			'CREATE TEMP TABLE audit_rollback_probe (id integer PRIMARY KEY)',
		);
	});

	afterAll(async () => {
		await prisma.$disconnect();
	});

	it('rolls back the business mutation when the audit FK write fails', async () => {
		await expect(
			logger.run(
				{
					tenantId: 'tenant-does-not-exist',
					actorId: 'user-1',
					actorType: AuditActorType.USER,
					actorRoleCode: null,
					action: AuditAction.PRODUCT_CREATE,
					resource: 'product',
				},
				async (tx) => {
					await tx.$executeRawUnsafe(
						'INSERT INTO audit_rollback_probe (id) VALUES (1)',
					);
					return true;
				},
			),
		).rejects.toBeDefined();

		const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
			'SELECT COUNT(*)::bigint AS count FROM audit_rollback_probe',
		);
		expect(rows[0].count).toBe(0n);
	});
});
