import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

/**
 * Tenant-user management e2e (R2-01): CRUD under
 * /admin/tenants/:tenantId/users with seat enforcement, last-owner guard,
 * cross-tenant isolation, field allowlist, and permission gating.
 * Requires Postgres + Redis (docker compose).
 */
describe('Admin tenant-user management (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let superToken: string;
	let limitedToken: string;

	const ts = Date.now();
	const superEmail = `e2e-tu-super-${ts}@nomogreen.vn`;
	const limitedEmail = `e2e-tu-limited-${ts}@nomogreen.vn`;
	const password = 'Tu-E2E-Super-Pw1';
	const limitedRoleCode = `E2E_TU_LIMITED_${ts}`;

	let superAdminId: string;
	let limitedAdminId: string;
	let limitedRoleId: string;
	const createdSlugs: string[] = [];

	function auth(req: request.Test, token: string) {
		return req.set('Authorization', `Bearer ${token}`);
	}

	// Provision a tenant + OWNER through the public API; returns tenantId.
	async function provisionTenant(slug: string, seatBonus: number) {
		createdSlugs.push(slug);
		const res = await auth(
			request(app.getHttpServer()).post('/admin/tenants'),
			superToken,
		)
			.send({
				tenant: { name: slug, slug, tenantType: 'RETAIL_DEALER', seatBonus },
				owner: {
					fullName: 'Owner',
					username: `owner-${slug}`,
					generatePassword: true,
				},
			})
			.expect(201);
		return res.body.tenant.id as string;
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
		const passwords = app.get(PasswordService);
		const passwordHash = await passwords.hash(password);

		const superAdmin = await prisma.platformAdmin.create({
			data: {
				email: superEmail,
				passwordHash,
				fullName: 'E2E TU Super',
				role: 'SUPER_ADMIN',
				status: 'ACTIVE',
			},
		});
		superAdminId = superAdmin.id;

		const limitedAdmin = await prisma.platformAdmin.create({
			data: {
				email: limitedEmail,
				passwordHash,
				fullName: 'E2E TU Limited',
				role: 'SUPPORT',
				status: 'ACTIVE',
			},
		});
		limitedAdminId = limitedAdmin.id;

		// Admin role WITHOUT admin.tenant-user:* grants → manage/view must 403.
		const limitedRole = await prisma.role.create({
			data: {
				tenantId: null,
				code: limitedRoleCode,
				name: 'E2E TU Limited Admin',
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
			const tenants = await prisma.tenant.findMany({
				where: { slug: { in: createdSlugs } },
				select: { id: true },
			});
			const ids = tenants.map((t) => t.id);
			if (ids.length > 0) {
				await prisma.auditLog.deleteMany({
					where: { resourceId: { in: ids } },
				});
			}
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

	it('403 without admin.tenant-user:view (route mounts, authz proof)', async () => {
		const tenantId = await provisionTenant(`tu-403-${ts}`, 10);
		await auth(
			request(app.getHttpServer()).get(`/admin/tenants/${tenantId}/users`),
			limitedToken,
		).expect(403);
	});

	it('lists users with SeatUsage and no passwordHash', async () => {
		const tenantId = await provisionTenant(`tu-list-${ts}`, 10);
		const res = await auth(
			request(app.getHttpServer()).get(`/admin/tenants/${tenantId}/users`),
			superToken,
		).expect(200);

		expect(res.body.items).toHaveLength(1);
		expect(res.body.items[0].roleCode).toBe('OWNER');
		expect(res.body.items[0].passwordHash).toBeUndefined();
		expect(res.body.seatUsage).toEqual(
			expect.objectContaining({
				activeCount: 1,
				effectiveMaxUsers: 10,
				planCode: null,
				seatBonus: 10,
			}),
		);
	});

	it('creates a STAFF user (201, public shape, generated password once)', async () => {
		const tenantId = await provisionTenant(`tu-create-${ts}`, 10);
		const res = await auth(
			request(app.getHttpServer()).post(`/admin/tenants/${tenantId}/users`),
			superToken,
		)
			.send({
				fullName: 'Nhân Viên A',
				username: `staff-a-${ts}`,
				roleCode: 'STAFF',
				generatePassword: true,
			})
			.expect(201);

		expect(res.body.user).toEqual(
			expect.objectContaining({
				username: `staff-a-${ts}`,
				roleCode: 'STAFF',
				status: 'ACTIVE',
			}),
		);
		expect(res.body.user.passwordHash).toBeUndefined();
		expect(typeof res.body.generatedPassword).toBe('string');
	});

	it('supports duplicate email and phone values within one tenant', async () => {
		const tenantId = await provisionTenant(`tu-contacts-${ts}`, 10);
		const first = await auth(
			request(app.getHttpServer()).post(`/admin/tenants/${tenantId}/users`),
			superToken,
		)
			.send({
				fullName: 'Contact One',
				username: `contact-one-${ts}`,
				roleCode: 'STAFF',
				email: 'shared-contact@example.com',
				phone: '0900000000',
				generatePassword: true,
			})
			.expect(201);
		await auth(
			request(app.getHttpServer()).post(`/admin/tenants/${tenantId}/users`),
			superToken,
		)
			.send({
				fullName: 'Contact Two',
				username: `contact-two-${ts}`,
				roleCode: 'STAFF',
				email: 'shared-contact@example.com',
				phone: '0900000000',
				generatePassword: true,
			})
			.expect(201);
		expect(first.body.user.email).toBe('shared-contact@example.com');
	});

	it('caps an excessively large page at the HTTP boundary', async () => {
		const tenantId = await provisionTenant(`tu-page-cap-${ts}`, 10);
		const res = await auth(
			request(app.getHttpServer()).get(
				`/admin/tenants/${tenantId}/users?page=99999999999999999999&pageSize=50`,
			),
			superToken,
		).expect(200);
		expect(res.body.page).toBe(1_000_000);
		expect(res.body.pageSize).toBe(50);
	});

	it('409 SEAT_LIMIT_REACHED when the tenant is full', async () => {
		// seatBonus=1, no subscription → effectiveMaxUsers=1, owner fills it.
		const tenantId = await provisionTenant(`tu-seat-${ts}`, 1);
		await auth(
			request(app.getHttpServer()).post(`/admin/tenants/${tenantId}/users`),
			superToken,
		)
			.send({
				fullName: 'Overflow',
				username: `overflow-${ts}`,
				roleCode: 'STAFF',
				generatePassword: true,
			})
			.expect(409)
			.expect((r) => expect(r.body.reason).toBe('SEAT_LIMIT_REACHED'));
	});

	it('409 LAST_OWNER when deactivating the only owner', async () => {
		const tenantId = await provisionTenant(`tu-owner-${ts}`, 10);
		const owner = await prisma.user.findFirstOrThrow({
			where: { tenantId },
			select: { id: true },
		});
		await auth(
			request(app.getHttpServer()).post(
				`/admin/tenants/${tenantId}/users/${owner.id}/deactivate`,
			),
			superToken,
		)
			.expect(409)
			.expect((r) => expect(r.body.reason).toBe('LAST_OWNER'));
	});

	it('404 for a user in another tenant (cross-tenant isolation)', async () => {
		const tenantA = await provisionTenant(`tu-xa-${ts}`, 10);
		const tenantB = await provisionTenant(`tu-xb-${ts}`, 10);
		const ownerB = await prisma.user.findFirstOrThrow({
			where: { tenantId: tenantB },
			select: { id: true },
		});
		await auth(
			request(app.getHttpServer()).patch(
				`/admin/tenants/${tenantA}/users/${ownerB.id}`,
			),
			superToken,
		)
			.send({ fullName: 'Hijack' })
			.expect(404);
	});

	it('400 when PATCH carries a non-whitelisted field', async () => {
		const tenantId = await provisionTenant(`tu-wl-${ts}`, 10);
		const owner = await prisma.user.findFirstOrThrow({
			where: { tenantId },
			select: { id: true },
		});
		await auth(
			request(app.getHttpServer()).patch(
				`/admin/tenants/${tenantId}/users/${owner.id}`,
			),
			superToken,
		)
			.send({ status: 'DISABLED' })
			.expect(400);
	});

	it('reset-password forces mustChangePassword and reveals a generated password', async () => {
		const tenantId = await provisionTenant(`tu-reset-${ts}`, 10);
		const owner = await prisma.user.findFirstOrThrow({
			where: { tenantId },
			select: { id: true },
		});
		const res = await auth(
			request(app.getHttpServer()).post(
				`/admin/tenants/${tenantId}/users/${owner.id}/reset-password`,
			),
			superToken,
		)
			.send({ generatePassword: true })
			.expect(200);
		expect(typeof res.body.generatedPassword).toBe('string');

		const after = await prisma.user.findUniqueOrThrow({
			where: { id: owner.id },
			select: { mustChangePassword: true },
		});
		expect(after.mustChangePassword).toBe(true);
	});
});
