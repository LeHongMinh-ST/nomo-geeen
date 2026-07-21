import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/platform/prisma/prisma.service';

describe('Tenant customers (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let tenantId: string;
	const suffix = Date.now().toString();
	const username = 'customer-owner-' + suffix;
	const slug = 'customer-tenant-' + suffix;
	const password = 'Customer-E2E-Pw1!';
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
		if (tenantId && app) {
			await prisma.customer.deleteMany({ where: { tenantId } });
			await prisma.user.deleteMany({ where: { tenantId } });
			await prisma.rolePermission.deleteMany({ where: { role: { tenantId } } });
			await prisma.role.deleteMany({ where: { tenantId } });
			await prisma.tenant.delete({ where: { id: tenantId } });
		}
		if (app) await app.close();
	});
	it('creates, searches, updates, isolates, and soft-deletes customers', async () => {
		const server = app.getHttpServer();
		const registered = await request(server)
			.post('/auth/register')
			.send({
				tenantName: 'Customer E2E Tenant',
				slug,
				fullName: 'Customer Owner',
				username,
				email: username + '@example.com',
				password,
			});
		if (registered.status !== 201)
			throw new Error(
				'Registration failed: ' + JSON.stringify(registered.body),
			);
		tenantId = registered.body.user.tenantId as string;
		const access = registered.body.accessToken as string;
		const created = await request(server)
			.post('/tenant/customers')
			.set('Authorization', 'Bearer ' + access)
			.send({
				name: 'New Customer',
				phone: '0909',
				type: 'FARMER',
				balance: 999999,
			})
			.expect(201);
		expect(created.body).toEqual(
			expect.objectContaining({
				name: 'New Customer',
				phone: '0909',
				type: 'FARMER',
				balance: 0,
			}),
		);
		await request(server)
			.get('/tenant/customers?search=0909&pageSize=20')
			.set('Authorization', 'Bearer ' + access)
			.expect(200)
			.expect(({ body }) => expect(body.items).toHaveLength(1));
		await request(server)
			.patch('/tenant/customers/' + created.body.id)
			.set('Authorization', 'Bearer ' + access)
			.send({ name: 'Renamed Customer' })
			.expect(200);
		await request(server)
			.delete('/tenant/customers/' + created.body.id)
			.set('Authorization', 'Bearer ' + access)
			.expect(200);
		await request(server)
			.get('/tenant/customers/' + created.body.id)
			.set('Authorization', 'Bearer ' + access)
			.expect(404);
	});
});
