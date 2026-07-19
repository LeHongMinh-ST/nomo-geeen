import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuditLogger } from '../src/platform/audit/audit-logger.service';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

/**
 * POST /admin/tenants e2e (R1-01): transactional tenant + OWNER creation.
 * Covers happy path (201, public shape, generated password once), 403 mount
 * proof, 409 SLUG_TAKEN, 400 PASSWORD_MODE_INVALID, and full rollback on a
 * forced owner-insert failure. Requires Postgres + Redis (docker compose).
 */
describe('Admin tenant creation (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let audit: AuditLogger;
	let superToken: string;
	let limitedToken: string;

	const ts = Date.now();
	const superEmail = `e2e-tc-super-${ts}@nomogreen.vn`;
	const limitedEmail = `e2e-tc-limited-${ts}@nomogreen.vn`;
	const password = 'Tc-E2E-Super-Pw1';
	const limitedRoleCode = `E2E_LIMITED_${ts}`;

	let superAdminId: string;
	let limitedAdminId: string;
	let limitedRoleId: string;
	const createdSlugs: string[] = [];

	function auth(req: request.Test, token: string) {
		return req.set('Authorization', `Bearer ${token}`);
	}

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		app = moduleRef.createNestApplication();
		app.use(cookieParser());
		app.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				forbidNonWhitelisted: true,
				transform: true,
			}),
		);
		await app.init();

		prisma = app.get(PrismaService);
		audit = app.get(AuditLogger);
		const passwords = app.get(PasswordService);
		const passwordHash = await passwords.hash(password);

		const superAdmin = await prisma.platformAdmin.create({
			data: {
				email: superEmail,
				passwordHash,
				fullName: 'E2E TC Super',
				role: 'SUPER_ADMIN',
				status: 'ACTIVE',
			},
		});
		superAdminId = superAdmin.id;

		// Limited admin: non-SUPER_ADMIN with an admin role that has NO
		// admin.tenant:create grant, so POST must 403 (proves route mount + authz).
		const limitedAdmin = await prisma.platformAdmin.create({
			data: {
				email: limitedEmail,
				passwordHash,
				fullName: 'E2E TC Limited',
				role: 'SUPPORT',
				status: 'ACTIVE',
			},
		});
		limitedAdminId = limitedAdmin.id;

		const limitedRole = await prisma.role.create({
			data: {
				tenantId: null,
				code: limitedRoleCode,
				name: 'E2E Limited Admin',
				isSystem: false,
				isAdmin: true,
			},
		});
		limitedRoleId = limitedRole.id;
		await prisma.adminRoleAssignment.create({
			data: { adminId: limitedAdminId, roleId: limitedRoleId },
		});

		const superLogin = await request(app.getHttpServer())
			.post('/auth/admin/login')
			.send({ email: superEmail, password })
			.expect(200);
		superToken = superLogin.body.accessToken;

		const limitedLogin = await request(app.getHttpServer())
			.post('/auth/admin/login')
			.send({ email: limitedEmail, password })
			.expect(200);
		limitedToken = limitedLogin.body.accessToken;
	});

	afterAll(async () => {
		if (createdSlugs.length > 0) {
			// Tenant delete cascades to its roles + users.
			await prisma.tenant.deleteMany({ where: { slug: { in: createdSlugs } } });
		}
		await prisma.auditLog.deleteMany({
			where: { actorId: { in: [superAdminId, limitedAdminId] } },
		});
		await prisma.adminRoleAssignment.deleteMany({
			where: { roleId: limitedRoleId },
		});
		await prisma.role.deleteMany({ where: { id: limitedRoleId } });
		await prisma.platformAdmin.deleteMany({
			where: { email: { in: [superEmail, limitedEmail] } },
		});
		await app.close();
	});

	it('403 without admin.tenant:create (route mounts, R7.1)', async () => {
		const slug = `tc-403-${ts}`;
		await auth(
			request(app.getHttpServer()).post('/admin/tenants'),
			limitedToken,
		)
			.send({
				tenant: { name: 'Blocked', slug, tenantType: 'RETAIL_DEALER' },
				owner: {
					fullName: 'Owner',
					username: `owner-403-${ts}`,
					generatePassword: true,
				},
			})
			.expect(403);
		const row = await prisma.tenant.findUnique({ where: { slug } });
		expect(row).toBeNull();
	});

	it('201 happy path with generated password returns public shapes + 3 roles', async () => {
		const slug = `tc-ok-gen-${ts}`;
		createdSlugs.push(slug);
		const res = await auth(
			request(app.getHttpServer()).post('/admin/tenants'),
			superToken,
		)
			.send({
				tenant: {
					name: 'Happy Store',
					slug,
					tenantType: 'RETAIL_DEALER',
					seatBonus: 25,
				},
				owner: {
					fullName: 'Chủ Cửa Hàng',
					username: `owner-gen-${ts}`,
					email: 'owner@example.com',
					generatePassword: true,
				},
			})
			.expect(201);

		expect(res.body.tenant).toEqual(
			expect.objectContaining({ slug, status: 'ACTIVE', seatBonus: 25 }),
		);
		expect(res.body.owner).toEqual(
			expect.objectContaining({
				username: `owner-gen-${ts}`,
				roleCode: 'OWNER',
				status: 'ACTIVE',
			}),
		);
		// Never leak passwordHash.
		expect(res.body.owner.passwordHash).toBeUndefined();
		// Generated password revealed once.
		expect(typeof res.body.generatedPassword).toBe('string');
		expect(res.body.generatedPassword.length).toBeGreaterThanOrEqual(12);

		// DB: exactly 3 per-tenant roles; owner bound to the seeded OWNER role.
		const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug } });
		const roles = await prisma.role.findMany({
			where: { tenantId: tenant.id },
			select: { code: true },
		});
		expect(roles.map((r) => r.code).sort()).toEqual([
			'MANAGER',
			'OWNER',
			'STAFF',
		]);
		const ownerUser = await prisma.user.findFirstOrThrow({
			where: { tenantId: tenant.id },
			include: { role: true },
		});
		expect(ownerUser.role.code).toBe('OWNER');
		expect(ownerUser.role.tenantId).toBe(tenant.id);
	});

	it('201 with explicit password returns generatedPassword: null', async () => {
		const slug = `tc-ok-pw-${ts}`;
		createdSlugs.push(slug);
		const res = await auth(
			request(app.getHttpServer()).post('/admin/tenants'),
			superToken,
		)
			.send({
				tenant: { name: 'Explicit Pw', slug, tenantType: 'HOUSEHOLD' },
				owner: {
					fullName: 'Owner Pw',
					username: `owner-pw-${ts}`,
					password: 'OwnerPass!123',
				},
			})
			.expect(201);
		expect(res.body.generatedPassword).toBeNull();
		// seatBonus defaults to 10 when omitted.
		expect(res.body.tenant.seatBonus).toBe(10);
	});

	it('409 SLUG_TAKEN on duplicate slug', async () => {
		const slug = `tc-dup-${ts}`;
		createdSlugs.push(slug);
		await auth(
			request(app.getHttpServer()).post('/admin/tenants'),
			superToken,
		)
			.send({
				tenant: { name: 'First', slug, tenantType: 'RETAIL_DEALER' },
				owner: {
					fullName: 'Owner A',
					username: `owner-dup-a-${ts}`,
					password: 'OwnerPass!123',
				},
			})
			.expect(201);

		const res = await auth(
			request(app.getHttpServer()).post('/admin/tenants'),
			superToken,
		)
			.send({
				tenant: { name: 'Second', slug, tenantType: 'RETAIL_DEALER' },
				owner: {
					fullName: 'Owner B',
					username: `owner-dup-b-${ts}`,
					password: 'OwnerPass!123',
				},
			})
			.expect(409);
		expect(res.body.reason).toBe('SLUG_TAKEN');
	});

	it('400 when owner object is missing (nested @IsDefined, not 500)', async () => {
		await auth(
			request(app.getHttpServer()).post('/admin/tenants'),
			superToken,
		)
			.send({
				tenant: {
					name: 'No Owner',
					slug: `tc-noowner-${ts}`,
					tenantType: 'RETAIL_DEALER',
				},
			})
			.expect(400);
		const row = await prisma.tenant.findUnique({
			where: { slug: `tc-noowner-${ts}` },
		});
		expect(row).toBeNull();
	});

	it('400 PASSWORD_MODE_INVALID when neither password nor generatePassword', async () => {
		const res = await auth(
			request(app.getHttpServer()).post('/admin/tenants'),
			superToken,
		)
			.send({
				tenant: {
					name: 'No Pw',
					slug: `tc-nopw-${ts}`,
					tenantType: 'RETAIL_DEALER',
				},
				owner: { fullName: 'Owner', username: `owner-nopw-${ts}` },
			})
			.expect(400);
		expect(res.body.reason).toBe('PASSWORD_MODE_INVALID');
		const row = await prisma.tenant.findUnique({
			where: { slug: `tc-nopw-${ts}` },
		});
		expect(row).toBeNull();
	});

	it('rolls back fully when an in-transaction write fails (R1.2)', async () => {
		const slug = `tc-rollback-${ts}`;
		// writeInTx runs inside the service $transaction. Let the first call
		// (TENANT_CREATE) commit a real audit row, then fail the second
		// (USER_CREATE): tenant + roles + owner + the first audit row are all
		// already written, so a correct rollback must erase every one of them.
		const spy = jest
			.spyOn(audit, 'writeInTx')
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('forced in-tx failure'));

		await auth(
			request(app.getHttpServer()).post('/admin/tenants'),
			superToken,
		)
			.send({
				tenant: { name: 'Rollback', slug, tenantType: 'RETAIL_DEALER' },
				owner: {
					fullName: 'Owner R',
					username: `owner-rollback-${ts}`,
					password: 'OwnerPass!123',
				},
			})
			.expect(500);

		spy.mockRestore();

		// No orphan tenant, and therefore no cascaded roles/users, for the slug.
		const tenant = await prisma.tenant.findUnique({ where: { slug } });
		expect(tenant).toBeNull();
		const orphanUser = await prisma.user.findFirst({
			where: { username: `owner-rollback-${ts}` },
		});
		expect(orphanUser).toBeNull();
		// The first audit row (TENANT_CREATE) was written inside the tx and must
		// NOT survive the rollback — this is the non-vacuous atomicity proof.
		const orphanAudit = await prisma.auditLog.findFirst({
			where: {
				actorId: superAdminId,
				action: 'TENANT_CREATE',
				after: { path: ['slug'], equals: slug },
			},
		});
		expect(orphanAudit).toBeNull();
	});
});
