import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

/**
 * E2E refresh rotation + reuse detection + logout, tren Postgres + Redis that.
 */
describe('Admin auth refresh/logout (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	const email = `e2e-rl-${Date.now()}@nomogreen.vn`;
	const password = 'R0tate-Me-Pw';

	function extractRt(setCookie: string[]): string {
		const c = setCookie.find((x) => x.startsWith('nomo_admin_rt='));
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
		await prisma.platformAdmin.create({
			data: {
				email,
				passwordHash: await passwords.hash(password),
				fullName: 'E2E RL',
				role: 'SUPER_ADMIN',
				status: 'ACTIVE',
			},
		});
	});

	afterAll(async () => {
		await prisma.auditLog.deleteMany({
			where: { actorType: 'PLATFORM_ADMIN' },
		});
		await prisma.platformAdmin.deleteMany({ where: { email } });
		await app.close();
	});

	async function login() {
		const res = await request(app.getHttpServer())
			.post('/auth/admin/login')
			.send({ email, password })
			.expect(200);
		return {
			access: res.body.accessToken as string,
			rt: extractRt(res.headers['set-cookie']),
		};
	}

	it('POST /auth/refresh rotates: new access + new refresh cookie', async () => {
		const { rt } = await login();
		const res = await request(app.getHttpServer())
			.post('/auth/refresh')
			.set('Cookie', rt)
			.expect(200);
		expect(res.body.accessToken).toEqual(expect.any(String));
		const newRt = extractRt(res.headers['set-cookie']);
		expect(newRt).not.toEqual(rt);
	});

	it('reusing an already-rotated refresh cookie -> 401 and writes a reuse audit row', async () => {
		const { rt } = await login();
		// Advance the chain twice with each returned (winning) cookie so the
		// original rt falls out of both current and :prev.
		const r1 = await request(app.getHttpServer())
			.post('/auth/refresh')
			.set('Cookie', rt)
			.expect(200);
		const rt1 = extractRt(r1.headers['set-cookie']);
		await request(app.getHttpServer())
			.post('/auth/refresh')
			.set('Cookie', rt1)
			.expect(200);
		// original rt is now neither current nor :prev -> reuse
		await request(app.getHttpServer())
			.post('/auth/refresh')
			.set('Cookie', rt)
			.expect(401);

		const reuse = await prisma.auditLog.findFirst({
			where: { action: 'REFRESH_REUSE_DETECTED' },
		});
		expect(reuse).not.toBeNull();
	});

	it('refresh for a DISABLED admin -> 401 and revokes the family', async () => {
		const { rt } = await login();
		await prisma.platformAdmin.update({
			where: { email },
			data: { status: 'DISABLED' },
		});
		await request(app.getHttpServer())
			.post('/auth/refresh')
			.set('Cookie', rt)
			.expect(401);
		// family revoked: a second attempt with the same cookie also 401 (missing)
		await request(app.getHttpServer())
			.post('/auth/refresh')
			.set('Cookie', rt)
			.expect(401);
		// re-enable for later tests
		await prisma.platformAdmin.update({
			where: { email },
			data: { status: 'ACTIVE' },
		});
	});

	it('logout blacklists access + revokes family; old access -> 401 on /auth/me', async () => {
		const { access, rt } = await login();
		// sanity: token works before logout
		await request(app.getHttpServer())
			.get('/auth/me')
			.set('Authorization', `Bearer ${access}`)
			.expect(200);

		const logout = await request(app.getHttpServer())
			.post('/auth/logout')
			.set('Authorization', `Bearer ${access}`)
			.set('Cookie', rt)
			.expect(204);
		// cookie cleared
		const cleared = logout.headers['set-cookie'][0];
		expect(cleared).toContain('nomo_admin_rt=');
		expect(cleared).toMatch(/Expires=|Max-Age=0/);

		// old access token now rejected
		await request(app.getHttpServer())
			.get('/auth/me')
			.set('Authorization', `Bearer ${access}`)
			.expect(401);

		// old refresh family gone
		await request(app.getHttpServer())
			.post('/auth/refresh')
			.set('Cookie', rt)
			.expect(401);
	});

	it('logout accepts an EXPIRED-but-valid access token (idle session) -> 204', async () => {
		const { rt } = await login();
		// Craft an already-expired access token with a valid signature for this family.
		const admin = await prisma.platformAdmin.findUnique({
			where: { email },
		});
		const familyId = `idle-fam-${Date.now()}`;
		const expired = new JwtService().sign(
			{
				sub: admin?.id,
				email,
				role: 'SUPER_ADMIN',
				type: 'access',
				familyId,
			},
			{ secret: process.env.JWT_ACCESS_SECRET, expiresIn: '-1s' },
		);
		await request(app.getHttpServer())
			.post('/auth/logout')
			.set('Authorization', `Bearer ${expired}`)
			.set('Cookie', rt)
			.expect(204);
	});

	it('POST /auth/refresh without a cookie -> 401', async () => {
		await request(app.getHttpServer()).post('/auth/refresh').expect(401);
	});
});
