import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

/**
 * Admin tenants controller e2e (Postgres + Redis that).
 * Pham vi: list, getById, update, status transition, export. Tenant create
 * khong nam trong controller (qua onboarding flow rieng) nen khong co POST /admin/tenants.
 */
describe('Admin tenants CRUD (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let adminId: string;
	let accessToken: string;
	let tenantId: string;
	const email = `e2e-tenants-${Date.now()}@nomogreen.vn`;
	const password = 'Tenants-E2E-Pw1';
	const tenantSlug = `e2e-tenants-${Date.now()}`;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		app = moduleRef.createNestApplication();
		app.use(cookieParser());
		app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
		await app.init();

		prisma = app.get(PrismaService);
		const passwords = app.get(PasswordService);
		const admin = await prisma.platformAdmin.create({
			data: {
				email,
				passwordHash: await passwords.hash(password),
				fullName: 'E2E Tenants',
				role: 'SUPER_ADMIN',
				status: 'ACTIVE',
			},
		});
		adminId = admin.id;

		const login = await request(app.getHttpServer())
			.post('/auth/admin/login')
			.send({ email, password })
			.expect(200);
		accessToken = login.body.accessToken;

		// Seed a tenant directly via Prisma (controller khong co POST /admin/tenants).
		const tenant = await prisma.tenant.create({
			data: {
				slug: tenantSlug,
				name: 'E2E Tenants Shop',
				status: 'ACTIVE',
				tenantType: 'RETAIL_DEALER',
				mode: 'SIMPLE',
			},
		});
		tenantId = tenant.id;
	});

	afterAll(async () => {
		if (tenantId) {
			await prisma.tenant.deleteMany({ where: { id: tenantId } });
		}
		await prisma.auditLog.deleteMany({ where: { actorId: adminId } });
		await prisma.platformAdmin.deleteMany({ where: { email } });
		await app.close();
	});

	function auth(req: request.Test) {
		return req.set('Authorization', `Bearer ${accessToken}`);
	}

	it('GET /admin/tenants returns paged list including the seed tenant', async () => {
		const res = await auth(request(app.getHttpServer()).get('/admin/tenants')).expect(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				page: 1,
				pageSize: 20,
				total: expect.any(Number),
				items: expect.any(Array),
			}),
		);
		const slugs = (res.body.items as Array<{ slug: string }>).map((t) => t.slug);
		expect(slugs).toEqual(expect.arrayContaining([tenantSlug]));
	});

	it('GET /admin/tenants?q filters by name', async () => {
		const res = await auth(
			request(app.getHttpServer()).get(`/admin/tenants?q=${encodeURIComponent(tenantSlug)}`),
		).expect(200);
		const slugs = (res.body.items as Array<{ slug: string }>).map((t) => t.slug);
		expect(slugs).toContain(tenantSlug);
	});

	it('GET /admin/tenants/:id returns the seeded tenant with counts', async () => {
		const res = await auth(
			request(app.getHttpServer()).get(`/admin/tenants/${tenantId}`),
		).expect(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				id: tenantId,
				slug: tenantSlug,
				status: 'ACTIVE',
				counts: expect.objectContaining({
					users: expect.any(Number),
					subscriptions: expect.any(Number),
				}),
			}),
		);
	});

	it('GET /admin/tenants/:id 404 for missing id', async () => {
		await auth(
			request(app.getHttpServer()).get('/admin/tenants/00000000-0000-4000-8000-000000000000'),
		).expect(404);
	});

	it('GET /admin/tenants/:id 400 for non-uuid id (ParseUUIDPipe)', async () => {
		await auth(
			request(app.getHttpServer()).get('/admin/tenants/not-a-uuid'),
		).expect(400);
	});

	it('PATCH /admin/tenants/:id updates name with expectedUpdatedAt', async () => {
		const before = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
		const res = await auth(
			request(app.getHttpServer()).patch(`/admin/tenants/${tenantId}`),
		)
			.send({
				name: 'E2E Tenants Shop (renamed)',
				expectedUpdatedAt: before.updatedAt.toISOString(),
			})
			.expect(200);
		expect(res.body.name).toBe('E2E Tenants Shop (renamed)');
	});

	it('PATCH /admin/tenants/:id 409 on stale expectedUpdatedAt', async () => {
		await auth(
			request(app.getHttpServer()).patch(`/admin/tenants/${tenantId}`),
		)
			.send({
				name: 'Stale Write Attempt',
				expectedUpdatedAt: '2000-01-01T00:00:00.000Z',
			})
			.expect(409);
	});

	it('PATCH /admin/tenants/:id 400 when logoUrl is HTTP (not HTTPS)', async () => {
		const before = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
		await auth(
			request(app.getHttpServer()).patch(`/admin/tenants/${tenantId}`),
		)
			.send({
				logoUrl: 'http://example.com/logo.png',
				expectedUpdatedAt: before.updatedAt.toISOString(),
			})
			.expect(400);
	});

	it('POST /admin/tenants/:id/status ACTIVE->SUSPENDED->ACTIVE happy path', async () => {
		const suspend = await auth(
			request(app.getHttpServer()).post(`/admin/tenants/${tenantId}/status`),
		)
			.send({ status: 'SUSPENDED', reason: 'e2e test pause' })
			.expect(201);
		expect(suspend.body.status).toBe('SUSPENDED');

		const resume = await auth(
			request(app.getHttpServer()).post(`/admin/tenants/${tenantId}/status`),
		)
			.send({ status: 'ACTIVE' })
			.expect(201);
		expect(resume.body.status).toBe('ACTIVE');
	});

	it('POST /admin/tenants/:id/status 400 on invalid transition (ACTIVE->PENDING)', async () => {
		await auth(
			request(app.getHttpServer()).post(`/admin/tenants/${tenantId}/status`),
		)
			.send({ status: 'PENDING' })
			.expect(400);
	});

	it('GET /admin/tenants/export returns CSV with text/csv content-type', async () => {
		const res = await auth(
			request(app.getHttpServer()).get('/admin/tenants/export'),
		).expect(200);
		expect(res.headers['content-type']).toMatch(/text\/csv/);
		expect(res.text.split('\n')[0]).toContain('id');
	});

	it('rejects unauthenticated access with 401', async () => {
		await request(app.getHttpServer()).get('/admin/tenants').expect(401);
	});
});
