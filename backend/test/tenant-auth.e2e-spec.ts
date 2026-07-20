import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { RefreshTokenStore } from '../src/platform/auth/refresh-token.store';
import { PrismaService } from '../src/platform/prisma/prisma.service';

describe('Tenant auth session lifecycle (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let tenantId: string;
	let ownerId: string;
	const suffix = Date.now().toString();
	const slug = `e2e-tenant-${suffix}`;
	const username = `owner-${suffix}`;
	const password = 'Tenant-Full-Fl0w!';

	function cookieValue(setCookie: string | string[]): string {
		const values = Array.isArray(setCookie) ? setCookie : [setCookie];
		const cookie = values.find((value) => value.startsWith('nomo_user_rt='));
		if (!cookie) throw new Error('missing user refresh cookie');
		return cookie.split(';')[0];
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
	});

	afterAll(async () => {
		if (tenantId) {
			await app.get(RefreshTokenStore).revokeAllForUser(ownerId);
			await prisma.auditLog.deleteMany({ where: { tenantId } });
			await prisma.user.deleteMany({ where: { tenantId } });
			await prisma.rolePermission.deleteMany({ where: { role: { tenantId } } });
			await prisma.role.deleteMany({ where: { tenantId } });
			await prisma.tenant.delete({ where: { id: tenantId } });
		}
		await app.close();
	});

	it('registers, refreshes, exposes current identity, and revokes the session on logout', async () => {
		const server = app.getHttpServer();
		const registered = await request(server)
			.post('/auth/register')
			.send({
				tenantName: 'E2E Tenant',
				slug,
				fullName: 'E2E Owner',
				username,
				email: `${username}@example.com`,
				password,
			})
			.expect(201);

		tenantId = registered.body.user.tenantId as string;
		ownerId = registered.body.user.id as string;
		const access0 = registered.body.accessToken as string;
		const cookie0 = cookieValue(registered.headers['set-cookie']);
		expect(registered.body.user).not.toHaveProperty('passwordHash');

		await request(server)
			.get('/auth/me')
			.set('Authorization', `Bearer ${access0}`)
			.expect(200)
			.expect(({ body }) => expect(body.id).toBe(ownerId));

		await prisma.user.update({
			where: { id: ownerId },
			data: { mustChangePassword: true },
		});
		await request(server)
			.get('/tenant/products')
			.set('Authorization', `Bearer ${access0}`)
			.expect(403)
			.expect(({ body }) =>
				expect(body.message).toBe('Password change required'),
			);
		await request(server)
			.post('/auth/change-password')
			.set('Authorization', `Bearer ${access0}`)
			.set('Origin', 'http://localhost:3000')
			.send({ currentPassword: password, newPassword: 'Tenant-New-Pass2!' })
			.expect(200);
		expect(
			(await prisma.user.findUniqueOrThrow({ where: { id: ownerId } }))
				.mustChangePassword,
		).toBe(false);

		const refreshed1 = await request(server)
			.post('/auth/refresh')
			.set('Cookie', cookie0)
			.set('Origin', 'http://localhost:3000')
			.expect(200);
		const cookie1 = cookieValue(refreshed1.headers['set-cookie']);
		expect(cookie1).not.toBe(cookie0);

		const refreshed2 = await request(server)
			.post('/auth/refresh')
			.set('Cookie', cookie1)
			.set('Origin', 'http://localhost:3000')
			.expect(200);
		const access2 = refreshed2.body.accessToken as string;

		const staffUsername = `staff-${suffix}`;
		const createdStaff = await request(server)
			.post('/tenant/users')
			.set('Authorization', `Bearer ${access2}`)
			.send({
				fullName: 'E2E Staff',
				username: staffUsername,
				roleCode: 'STAFF',
				generatePassword: true,
			})
			.expect(201);
		const staffId = createdStaff.body.user.id as string;
		const generatedStaffPassword = createdStaff.body
			.generatedPassword as string;
		expect(generatedStaffPassword).toEqual(expect.any(String));
		await request(server)
			.get('/tenant/users')
			.set('Authorization', `Bearer ${access2}`)
			.expect(200)
			.expect(({ body }) => {
				expect(body.items.map((item: { id: string }) => item.id)).toContain(
					staffId,
				);
				expect(body.seatUsage.activeCount).toBe(2);
			});
		await request(server)
			.patch(`/tenant/users/${staffId}`)
			.set('Authorization', `Bearer ${access2}`)
			.send({ fullName: 'E2E Staff Updated' })
			.expect(200);
		await request(server)
			.patch(`/tenant/users/${staffId}/role`)
			.set('Authorization', `Bearer ${access2}`)
			.send({ roleCode: 'MANAGER' })
			.expect(200);
		const managerLogin = await request(server)
			.post('/auth/login')
			.send({ identifier: staffUsername, password: generatedStaffPassword })
			.expect(200);
		await request(server)
			.post(`/tenant/users/${ownerId}/deactivate`)
			.set('Authorization', `Bearer ${managerLogin.body.accessToken as string}`)
			.expect(403);
		await request(server)
			.post(`/tenant/users/${staffId}/reset-password`)
			.set('Authorization', `Bearer ${access2}`)
			.send({ generatePassword: true })
			.expect(200)
			.expect(({ body }) =>
				expect(body.generatedPassword).toEqual(expect.any(String)),
			);
		await request(server)
			.post(`/tenant/users/${staffId}/deactivate`)
			.set('Authorization', `Bearer ${access2}`)
			.expect(200);
		await request(server)
			.post(`/tenant/users/${staffId}/reactivate`)
			.set('Authorization', `Bearer ${access2}`)
			.expect(200);
		for (const action of [
			'USER_CREATE',
			'USER_UPDATE',
			'USER_ROLE_CHANGE',
			'USER_RESET_PASSWORD',
			'USER_DEACTIVATE',
			'USER_REACTIVATE',
		] as const) {
			expect(
				await prisma.auditLog.count({
					where: { tenantId, actorId: ownerId, action },
				}),
			).toBeGreaterThan(0);
		}

		await request(server)
			.post('/auth/refresh')
			.set('Cookie', cookie0)
			.set('Origin', 'http://localhost:3000')
			.expect(401);
		await request(server)
			.post('/auth/logout')
			.set('Authorization', `Bearer ${access2}`)
			.set('Origin', 'http://localhost:3000')
			.expect(204);
		await request(server)
			.get('/auth/me')
			.set('Authorization', `Bearer ${access2}`)
			.expect(401);
		await request(server)
			.post('/auth/refresh')
			.set('Cookie', cookie1)
			.set('Origin', 'http://localhost:3000')
			.expect(401);

		expect(
			await prisma.auditLog.count({
				where: { tenantId, actorId: ownerId, action: 'USER_CREATE' },
			}),
		).toBeGreaterThan(0);
		expect(
			await prisma.auditLog.count({
				where: { tenantId, actorId: ownerId, action: 'LOGOUT' },
			}),
		).toBeGreaterThan(0);
	});

	it('reports separate login, me, and refresh p95 timings', async () => {
		const server = app.getHttpServer();
		const loginMs: number[] = [];
		const meMs: number[] = [];
		const refreshMs: number[] = [];
		for (let index = 0; index < 5; index += 1) {
			let started = Date.now();
			const login = await request(server)
				.post('/auth/login')
				.send({
					identifier: username,
					password: 'Tenant-New-Pass2!',
				})
				.expect(200);
			loginMs.push(Date.now() - started);
			const access = login.body.accessToken as string;
			const cookie = cookieValue(login.headers['set-cookie']);
			started = Date.now();
			await request(server)
				.get('/auth/me')
				.set('Authorization', `Bearer ${access}`)
				.expect(200);
			meMs.push(Date.now() - started);
			started = Date.now();
			const refreshed = await request(server)
				.post('/auth/refresh')
				.set('Cookie', cookie)
				.set('Origin', 'http://localhost:3000')
				.expect(200);
			refreshMs.push(Date.now() - started);
			await request(server)
				.post('/auth/logout')
				.set('Authorization', `Bearer ${refreshed.body.accessToken as string}`)
				.set('Origin', 'http://localhost:3000')
				.expect(204);
		}
		const p95 = (values: number[]) =>
			values.sort((a, b) => a - b)[
				Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1)
			];
		console.log(
			`[tenant-auth:p95] login=${p95(loginMs)}ms me=${p95(meMs)}ms refresh=${p95(refreshMs)}ms; login includes Argon2`,
		);
		expect(loginMs).toHaveLength(5);
		expect(meMs).toHaveLength(5);
		expect(refreshMs).toHaveLength(5);
	});
});
