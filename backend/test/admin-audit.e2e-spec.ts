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

// Requires the local Postgres + Redis stack. Keep the expensive 100k fixture
// opt-in so the default unit/CI test command does not mutate a developer DB.
const auditE2eSuite =
	process.env.RUN_ADMIN_AUDIT_E2E === '1' ? describe : describe.skip;

auditE2eSuite('Admin audit log (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let adminId: string;
	let supportId: string;
	let accessToken: string;
	let supportToken: string;
	let detailId: string;
	const suffix = Date.now();
	const email = `e2e-audit-${suffix}@nomogreen.vn`;
	const supportEmail = `e2e-audit-support-${suffix}@nomogreen.vn`;
	const password = 'Audit-E2E-Pw1';

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
		const passwordHash = await passwords.hash(password);
		const admin = await prisma.platformAdmin.create({
			data: {
				email,
				passwordHash,
				fullName: 'E2E Audit',
				role: 'SUPER_ADMIN',
				status: 'ACTIVE',
			},
		});
		adminId = admin.id;
		const support = await prisma.platformAdmin.create({
			data: {
				email: supportEmail,
				passwordHash,
				fullName: 'E2E Audit Support',
				role: 'SUPPORT',
				status: 'ACTIVE',
			},
		});
		supportId = support.id;

		const server = app.getHttpServer();
		accessToken = (
			await request(server)
				.post('/auth/admin/login')
				.send({ email, password })
				.expect(200)
		).body.accessToken;
		supportToken = (
			await request(server)
				.post('/auth/admin/login')
				.send({ email: supportEmail, password })
				.expect(200)
		).body.accessToken;
		const detail = await prisma.auditLog.create({
			data: {
				actorType: 'PLATFORM_ADMIN',
				actorId: adminId,
				action: 'ADMIN_CREATE',
				resource: 'admin',
				resourceId: adminId,
				before: { passwordHash: 'old', profile: { displayName: 'Old' } },
				after: { accessToken: 'raw', profile: { displayName: 'New' } },
			},
		});
		detailId = detail.id;
	});

	afterAll(async () => {
		if (!app || !prisma) return;
		const adminIds = [adminId, supportId].filter(Boolean);
		if (adminIds.length > 0) {
			await prisma.auditLog.deleteMany({
				where: { actorId: { in: adminIds } },
			});
			await prisma.platformAdmin.deleteMany({
				where: { id: { in: adminIds } },
			});
		}
		await app.close();
	});

	function auth(token: string, req: request.Test) {
		return req.set('Authorization', `Bearer ${token}`);
	}

	it('serves authenticated list/detail responses with masking and bounded pagination', async () => {
		const server = app.getHttpServer();
		const list = await auth(
			accessToken,
			request(server).get('/admin/audit-logs?page=1&pageSize=20'),
		).expect(200);
		expect(list.body.items.length).toBeLessThanOrEqual(20);
		expect(list.body.pageSize).toBe(20);
		const detail = await auth(
			accessToken,
			request(server).get(`/admin/audit-logs/${detailId}`),
		).expect(200);
		expect(detail.body.before.passwordHash).toBe('[REDACTED]');
		expect(detail.body.after.accessToken).toBe('[REDACTED]');
	});

	it('enforces authentication, permission denial, invalid filters, and not-found', async () => {
		const server = app.getHttpServer();
		await request(server).get('/admin/audit-logs').expect(401);
		await auth(supportToken, request(server).get('/admin/audit-logs')).expect(
			403,
		);
		await auth(
			accessToken,
			request(server).get('/admin/audit-logs?action=NOT_A_REAL_ACTION'),
		).expect(400);
		await auth(
			accessToken,
			request(server).get(`/admin/audit-logs/${randomUUID()}`),
		).expect(404);
	});

	it('measures the 20-row first page against a 100,000-row fixture', async () => {
		const rows = Array.from({ length: 100_000 }, (_, index) => ({
			id: randomUUID(),
			actorType: 'SYSTEM' as const,
			actorId: adminId,
			action: 'LOGIN' as const,
			resource: 'performance-fixture',
			resourceId: `fixture-${index}`,
			createdAt: new Date(Date.now() - index),
		}));
		for (let offset = 0; offset < rows.length; offset += 5_000) {
			await prisma.auditLog.createMany({
				data: rows.slice(offset, offset + 5_000),
			});
		}
		const server = app.getHttpServer();
		for (let index = 0; index < 3; index += 1)
			await auth(
				accessToken,
				request(server).get('/admin/audit-logs?page=1&pageSize=20'),
			).expect(200);
		const samples: number[] = [];
		for (let index = 0; index < 10; index += 1) {
			const start = performance.now();
			const response = await auth(
				accessToken,
				request(server).get('/admin/audit-logs?page=1&pageSize=20'),
			).expect(200);
			samples.push(performance.now() - start);
			expect(response.body.items).toHaveLength(20);
		}
		samples.sort((a, b) => a - b);
		const p95 = samples[Math.ceil(samples.length * 0.95) - 1];
		console.log(
			JSON.stringify({
				fixtureRows: 100_000,
				pageSize: 20,
				p95Ms: Number(p95.toFixed(2)),
				node: process.version,
			}),
		);
		expect(p95).toBeLessThan(500);
	}, 120_000);
});
