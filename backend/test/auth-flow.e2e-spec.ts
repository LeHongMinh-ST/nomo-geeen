import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

/**
 * Full-lifecycle integration: login -> /auth/me -> refresh -> reuse-rejection
 * -> logout -> post-logout rejection. Chay tren Postgres + Redis that.
 */
describe('Admin auth full lifecycle (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let adminId: string;
	const email = `e2e-flow-${Date.now()}@nomogreen.vn`;
	const password = 'Full-Fl0w-Pw';

	function rt(setCookie: string | string[]): string {
		const values = Array.isArray(setCookie) ? setCookie : [setCookie];
		const c = values.find((x) => x.startsWith('nomo_admin_rt='));
		if (!c) throw new Error('no refresh cookie');
		return c.split(';')[0];
	}

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
				fullName: 'E2E Flow',
				role: 'SUPER_ADMIN',
				status: 'ACTIVE',
			},
		});
		adminId = admin.id;
	});

	afterAll(async () => {
		await prisma.auditLog.deleteMany({ where: { actorId: adminId } });
		await prisma.platformAdmin.deleteMany({ where: { email } });
		await app.close();
	});

	it('runs the complete login -> me -> refresh -> reuse -> logout -> post-logout flow', async () => {
		const server = app.getHttpServer();

		// 1. Login
		const login = await request(server)
			.post('/auth/admin/login')
			.send({ email, password })
			.expect(200);
		const access = login.body.accessToken as string;
		const cookie0 = rt(login.headers['set-cookie']);
		expect(login.body.admin.email).toBe(email);

		// 2. Guarded /auth/me with the access token
		const me = await request(server)
			.get('/auth/me')
			.set('Authorization', `Bearer ${access}`)
			.expect(200);
		expect(me.body.email).toBe(email);

		// 3. Refresh rotates -> new access + new cookie
		const refreshed = await request(server)
			.post('/auth/refresh')
			.set('Cookie', cookie0)
			.expect(200);
		const access2 = refreshed.body.accessToken as string;
		const cookie1 = rt(refreshed.headers['set-cookie']);
		expect(cookie1).not.toEqual(cookie0);

		// 4. Advance the chain then reuse the original cookie -> 401 (theft signal)
		const r2 = await request(server)
			.post('/auth/refresh')
			.set('Cookie', cookie1)
			.expect(200);
		rt(r2.headers['set-cookie']);
		await request(server)
			.post('/auth/refresh')
			.set('Cookie', cookie0)
			.expect(401);
		const reuseRow = await prisma.auditLog.findFirst({
			where: { actorId: adminId, action: 'REFRESH_REUSE_DETECTED' },
		});
		expect(reuseRow).not.toBeNull();

		// 5. Logout with the current access token
		await request(server)
			.post('/auth/logout')
			.set('Authorization', `Bearer ${access2}`)
			.expect(204);

		// 6. Post-logout: the logged-out access token is now rejected on /auth/me
		await request(server)
			.get('/auth/me')
			.set('Authorization', `Bearer ${access2}`)
			.expect(401);

		// audit trail: LOGIN + LOGOUT rows exist for this admin
		const login_rows = await prisma.auditLog.count({
			where: { actorId: adminId, action: 'LOGIN' },
		});
		const logout_rows = await prisma.auditLog.count({
			where: { actorId: adminId, action: 'LOGOUT' },
		});
		expect(login_rows).toBeGreaterThan(0);
		expect(logout_rows).toBeGreaterThan(0);
	});

	it('reachability: AuthModule routes respond (not 404)', async () => {
		const server = app.getHttpServer();
		// unauthenticated hits should be 401/400, never 404
		await request(server).get('/auth/me').expect(401);
		await request(server).post('/auth/refresh').expect(401);
		await request(server).post('/auth/admin/login').send({}).expect(400);
	});
});
