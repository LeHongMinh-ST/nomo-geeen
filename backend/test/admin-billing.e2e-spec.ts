import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

describe('Admin billing plan and subscription lifecycle (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let adminId: string;
	let accessToken: string;
	let tenantId: string;
	let planId: string;
	const suffix = Date.now();
	const email = `e2e-billing-${suffix}@nomogreen.vn`;
	const password = 'Billing-E2E-Pw1';
	const tenantSlug = `e2e-billing-${suffix}`;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		app = moduleRef.createNestApplication();
		app.use(cookieParser());
		app.useGlobalPipes(
			new ValidationPipe({ whitelist: true, transform: true }),
		);
		await app.init();

		prisma = app.get(PrismaService);
		const passwords = app.get(PasswordService);
		const admin = await prisma.platformAdmin.create({
			data: {
				email,
				passwordHash: await passwords.hash(password),
				fullName: 'E2E Billing',
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

		const tenant = await prisma.tenant.create({
			data: {
				slug: tenantSlug,
				name: 'E2E Billing Shop',
				status: 'ACTIVE',
				tenantType: 'RETAIL_DEALER',
				mode: 'SIMPLE',
			},
		});
		tenantId = tenant.id;
	});

	afterAll(async () => {
		if (!app || !prisma) return;
		if (tenantId) {
			await prisma.tenant.deleteMany({ where: { id: tenantId } });
		}
		if (planId) {
			await prisma.plan.deleteMany({ where: { id: planId } });
		}
		if (adminId) {
			await prisma.auditLog.deleteMany({ where: { actorId: adminId } });
		}
		await prisma.platformAdmin.deleteMany({ where: { email } });
		await app.close();
	});

	function auth(req: request.Test) {
		return req.set('Authorization', `Bearer ${accessToken}`);
	}

	it('creates a plan and assigns it through the HTTP lifecycle', async () => {
		const plan = await auth(request(app.getHttpServer()).post('/admin/plans'))
			.send({
				code: `e2e-billing-${suffix}`,
				name: 'E2E Billing Plan',
				price: 99000,
				billingCycle: 'MONTHLY',
				maxUsers: 5,
				maxWarehouses: 1,
				maxStorageBytes: 1000000,
				featureCodes: [],
			})
			.expect(201);
		planId = plan.body.id;

		const startDate = new Date(Date.now() - 60_000).toISOString();
		const endDate = new Date(Date.now() + 86_400_000).toISOString();
		const assigned = await auth(
			request(app.getHttpServer()).post(
				`/admin/tenants/${tenantId}/subscription`,
			),
		)
			.send({
				planId,
				status: 'ACTIVE',
				billingCycle: 'MONTHLY',
				startDate,
				endDate,
				manualReference: '  manual-e2e  ',
				reason: 'initial assignment',
			})
			.expect(201);

		expect(assigned.body.planId).toBe(planId);
		expect(assigned.body.manualReference).toBe('manual-e2e');
		expect(assigned.body.status).toBe('ACTIVE');

		const current = await auth(
			request(app.getHttpServer()).get(
				`/admin/tenants/${tenantId}/subscription`,
			),
		).expect(200);
		expect(current.body.current.id).toBe(assigned.body.id);
		expect(current.body.history).toHaveLength(1);

		const stale = await auth(
			request(app.getHttpServer()).post(
				`/admin/tenants/${tenantId}/subscription`,
			),
		)
			.send({
				planId,
				status: 'ACTIVE',
				billingCycle: 'MONTHLY',
				startDate,
				endDate,
				expectedUpdatedAt: '2000-01-01T00:00:00.000Z',
			})
			.expect(409);
		expect(stale.body.message).toBeDefined();
	});

	it('renews and cancels with optimistic concurrency and records history', async () => {
		const before = await prisma.subscription.findFirstOrThrow({
			where: { tenantId, status: 'ACTIVE' },
			orderBy: { updatedAt: 'desc' },
		});
		const renewed = await auth(
			request(app.getHttpServer()).post(
				`/admin/tenants/${tenantId}/subscription/renew`,
			),
		)
			.send({
				expectedUpdatedAt: before.updatedAt.toISOString(),
				reason: 'renewed by operator',
			})
			.expect(201);
		expect(renewed.body.status).toBe('ACTIVE');
		expect(new Date(renewed.body.endDate).getTime()).toBeGreaterThan(
			before.endDate?.getTime() ?? Date.now(),
		);

		const cancelled = await auth(
			request(app.getHttpServer()).post(
				`/admin/tenants/${tenantId}/subscription/cancel`,
			),
		)
			.send({
				expectedUpdatedAt: renewed.body.updatedAt,
				reason: 'operator cancellation',
			})
			.expect(201);
		expect(cancelled.body.status).toBe('CANCELLED');

		const history = await auth(
			request(app.getHttpServer()).get(
				`/admin/tenants/${tenantId}/subscription`,
			),
		).expect(200);
		expect(history.body.current).toBeNull();
		expect(
			history.body.history.map((row: { status: string }) => row.status),
		).toContain('CANCELLED');
	});

	it('keeps paged subscription history under the current 1k-row p95 budget', async () => {
		const rows = Array.from({ length: 1_000 }, (_, index) => ({
			id: randomUUID(),
			tenantId,
			planId,
			status: 'CANCELLED' as const,
			billingCycle: 'MONTHLY' as const,
			startDate: new Date(Date.now() - (index + 1) * 86_400_000),
			endDate: new Date(Date.now() - (index + 1) * 86_400_000 + 3_600_000),
			cancelledAt: new Date(),
			reason: 'performance fixture',
		}));
		await prisma.subscription.createMany({ data: rows });

		const endpoint = () =>
			auth(
				request(app.getHttpServer()).get(
					`/admin/tenants/${tenantId}/subscription?page=1&pageSize=20`,
				),
			).expect(200);
		const capped = await auth(
			request(app.getHttpServer()).get(
				`/admin/tenants/${tenantId}/subscription?page=1&pageSize=100`,
			),
		).expect(200);
		expect(capped.body.pageSize).toBe(100);
		expect(capped.body.history).toHaveLength(100);
		await auth(
			request(app.getHttpServer()).get(
				`/admin/tenants/${tenantId}/subscription?page=1&pageSize=101`,
			),
		).expect(400);
		for (let index = 0; index < 30; index += 1) await endpoint();
		const samples: number[] = [];
		for (let index = 0; index < 100; index += 1) {
			const start = performance.now();
			const response = await endpoint();
			samples.push(performance.now() - start);
			expect(response.body.history).toHaveLength(20);
			expect(response.body.total).toBeGreaterThanOrEqual(1_000);
		}
		samples.sort((a, b) => a - b);
		const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
		console.log(
			JSON.stringify({
				fixtureRows: 1_000,
				warmups: 30,
				requests: 100,
				pageSize: 20,
				p95Ms: Number(p95.toFixed(2)),
				node: process.version,
			}),
		);
		expect(p95).toBeLessThan(500);
	});

	it('rejects unauthenticated billing access', async () => {
		await request(app.getHttpServer()).get('/admin/plans').expect(401);
		await request(app.getHttpServer())
			.get(`/admin/tenants/${tenantId}/subscription`)
			.expect(401);
	});
});
