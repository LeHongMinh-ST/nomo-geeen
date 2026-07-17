import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

/**
 * E2E login + /auth/me chay tren Postgres + Redis that.
 * Yeu cau: docker compose up -d postgres redis; DATABASE_URL/REDIS_URL/JWT secrets set.
 */
describe('Admin auth login (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	const activeEmail = `e2e-active-${Date.now()}@nomogreen.vn`;
	const disabledEmail = `e2e-disabled-${Date.now()}@nomogreen.vn`;
	const password = 'Sup3r-Secret-Pw';

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
		const hash = await passwords.hash(password);
		await prisma.platformAdmin.create({
			data: {
				email: activeEmail,
				passwordHash: hash,
				fullName: 'E2E Active',
				role: 'SUPER_ADMIN',
				status: 'ACTIVE',
			},
		});
		await prisma.platformAdmin.create({
			data: {
				email: disabledEmail,
				passwordHash: hash,
				fullName: 'E2E Disabled',
				role: 'SUPPORT',
				status: 'DISABLED',
			},
		});
	});

	afterAll(async () => {
		await prisma.auditLog.deleteMany({
			where: { actorType: 'PLATFORM_ADMIN' },
		});
		await prisma.platformAdmin.deleteMany({
			where: { email: { in: [activeEmail, disabledEmail] } },
		});
		await app.close();
	});

	it('POST /auth/admin/login -> 200 with accessToken + HttpOnly refresh cookie', async () => {
		const res = await request(app.getHttpServer())
			.post('/auth/admin/login')
			.send({ email: activeEmail, password })
			.expect(200);

		expect(res.body.accessToken).toEqual(expect.any(String));
		expect(res.body.admin).toEqual(
			expect.objectContaining({ email: activeEmail, role: 'SUPER_ADMIN' }),
		);
		const cookie = res.headers['set-cookie'][0];
		expect(cookie).toContain('nomo_admin_rt=');
		expect(cookie).toContain('HttpOnly');
		expect(cookie).toContain('Secure');
		expect(cookie).toContain('Path=/auth');
		expect(cookie).toContain('SameSite=Strict');
		expect(cookie).toContain('Max-Age=');
	});

	it('POST /auth/admin/login -> 401 generic for wrong password', async () => {
		await request(app.getHttpServer())
			.post('/auth/admin/login')
			.send({ email: activeEmail, password: 'wrong' })
			.expect(401);
	});

	it('POST /auth/admin/login -> 403 for a DISABLED admin', async () => {
		await request(app.getHttpServer())
			.post('/auth/admin/login')
			.send({ email: disabledEmail, password })
			.expect(403);
	});

	it('POST /auth/admin/login -> 400 on invalid DTO (bad email, empty password)', async () => {
		await request(app.getHttpServer())
			.post('/auth/admin/login')
			.send({ email: 'not-an-email', password: '' })
			.expect(400);
	});

	it('GET /auth/me -> 200 with a valid token, 401 without', async () => {
		const login = await request(app.getHttpServer())
			.post('/auth/admin/login')
			.send({ email: activeEmail, password })
			.expect(200);
		const token = login.body.accessToken as string;

		const me = await request(app.getHttpServer())
			.get('/auth/me')
			.set('Authorization', `Bearer ${token}`)
			.expect(200);
		expect(me.body).toEqual(
			expect.objectContaining({
				email: activeEmail,
				fullName: 'E2E Active',
				role: 'SUPER_ADMIN',
			}),
		);

		await request(app.getHttpServer()).get('/auth/me').expect(401);
	});
});
