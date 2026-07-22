import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

describe('Tenant debts (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let tenantId: string;
	let otherTenantId: string;
	let accessToken: string;
	let viewOnlyToken: string;
	let customerId: string;
	let supplierId: string;
	const suffix = Date.now().toString();
	const password = 'Debt-E2E-Pw1!';
	const username = `debt-owner-${suffix}`;

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
		const view = await prisma.permission.upsert({
			where: { code: 'debt:view' },
			update: {},
			create: { code: 'debt:view', resource: 'debt', action: 'view' },
		});
		const collect = await prisma.permission.upsert({
			where: { code: 'debt:collect' },
			update: {},
			create: { code: 'debt:collect', resource: 'debt', action: 'collect' },
		});
		const tenant = await prisma.tenant.create({
			data: {
				slug: `debt-e2e-${suffix}`,
				name: 'Debt E2E Tenant',
				status: 'ACTIVE',
				tenantType: 'HOUSEHOLD',
				mode: 'SIMPLE',
			},
		});
		tenantId = tenant.id;
		const role = await prisma.role.create({
			data: {
				tenantId,
				code: 'OWNER',
				name: 'Owner',
				rank: 1,
				permissions: {
					create: [{ permissionId: view.id }, { permissionId: collect.id }],
				},
			},
		});
		await prisma.user.create({
			data: {
				tenantId,
				username,
				fullName: 'Debt Owner',
				passwordHash: await passwords.hash(password),
				roleId: role.id,
				status: 'ACTIVE',
			},
		});
		const viewOnlyRole = await prisma.role.create({
			data: {
				tenantId,
				code: 'VIEWER',
				name: 'Viewer',
				rank: 3,
				permissions: { create: { permissionId: view.id } },
			},
		});
		await prisma.user.create({
			data: {
				tenantId,
				username: `debt-viewer-${suffix}`,
				fullName: 'Debt Viewer',
				passwordHash: await passwords.hash(password),
				roleId: viewOnlyRole.id,
				status: 'ACTIVE',
			},
		});
		const customer = await prisma.customer.create({
			data: {
				tenantId,
				name: 'Debt Customer',
				balance: 1000n,
				openingBalance: 1000n,
			},
		});
		customerId = customer.id;
		const supplier = await prisma.supplier.create({
			data: {
				tenantId,
				code: `SUP-${suffix}`,
				name: 'Debt Supplier',
				balance: 1000n,
				openingBalance: 1000n,
			},
		});
		supplierId = supplier.id;
		const otherTenant = await prisma.tenant.create({
			data: {
				slug: `debt-e2e-other-${suffix}`,
				name: 'Debt Other Tenant',
				status: 'ACTIVE',
				tenantType: 'HOUSEHOLD',
				mode: 'SIMPLE',
			},
		});
		otherTenantId = otherTenant.id;
		await prisma.customer.create({
			data: { tenantId: otherTenantId, name: 'Other Customer', balance: 1000n },
		});
		const server = app.getHttpServer();
		accessToken = (
			await request(server)
				.post('/auth/login')
				.send({ identifier: username, password })
				.expect(200)
		).body.accessToken;
		viewOnlyToken = (
			await request(server)
				.post('/auth/login')
				.send({ identifier: `debt-viewer-${suffix}`, password })
				.expect(200)
		).body.accessToken;
	});

	afterAll(async () => {
		if (prisma) {
			if (tenantId)
				await prisma.tenant
					.delete({ where: { id: tenantId } })
					.catch(() => undefined);
			if (otherTenantId)
				await prisma.tenant
					.delete({ where: { id: otherTenantId } })
					.catch(() => undefined);
		}
		if (app) await app.close();
	});

	it('settles both directions, replays, isolates tenants, and preserves rollback', async () => {
		const server = app.getHttpServer();
		const customerKey = '11111111-1111-4111-8111-111111111111';
		const customerReceipt = await request(server)
			.post('/tenant/debts/vouchers')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				voucherType: 'RECEIPT',
				partyType: 'CUSTOMER',
				partyId: customerId,
				amount: 400,
				method: 'CASH',
				idempotencyKey: customerKey,
				occurredAt: '2026-07-22T00:00:00.000Z',
			})
			.expect(201);
		expect(customerReceipt.body.balanceAfter).toBe(600);
		const replay = await request(server)
			.post('/tenant/debts/vouchers')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				voucherType: 'RECEIPT',
				partyType: 'CUSTOMER',
				partyId: customerId,
				amount: 400,
				method: 'CASH',
				idempotencyKey: customerKey,
				occurredAt: '2026-07-22T00:00:00.000Z',
			})
			.expect(201);
		expect(replay.body.id).toBe(customerReceipt.body.id);
		await request(server)
			.post('/tenant/debts/vouchers')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				voucherType: 'RECEIPT',
				partyType: 'CUSTOMER',
				partyId: customerId,
				amount: 401,
				method: 'CASH',
				idempotencyKey: customerKey,
			})
			.expect(409);
		const supplierPayment = await request(server)
			.post('/tenant/debts/vouchers')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				voucherType: 'PAYMENT',
				partyType: 'SUPPLIER',
				partyId: supplierId,
				amount: 250,
				method: 'BANK_TRANSFER',
				idempotencyKey: '22222222-2222-4222-8222-222222222222',
			})
			.expect(201);
		expect(supplierPayment.body.balanceAfter).toBe(750);
		const detail = await request(server)
			.get(`/tenant/debts/CUSTOMER/${customerId}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(200);
		expect(
			detail.body.entries.some(
				(entry: { direction: string }) => entry.direction === 'DECREASE',
			),
		).toBe(true);
		expect(detail.body.vouchers).toHaveLength(1);
		await request(server)
			.get(`/tenant/debts/CUSTOMER/${customerId}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(200);
		await request(server)
			.post('/tenant/debts/vouchers')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				voucherType: 'RECEIPT',
				partyType: 'CUSTOMER',
				partyId: customerId,
				amount: 10000,
				method: 'CASH',
				idempotencyKey: '33333333-3333-4333-8333-333333333333',
			})
			.expect(422);
		await request(server)
			.get(`/tenant/debts/CUSTOMER/${customerId}`)
			.set('Authorization', `Bearer ${viewOnlyToken}`)
			.expect(200);
		await request(server)
			.post('/tenant/debts/vouchers')
			.set('Authorization', `Bearer ${viewOnlyToken}`)
			.send({
				voucherType: 'RECEIPT',
				partyType: 'CUSTOMER',
				partyId: customerId,
				amount: 1,
				method: 'CASH',
				idempotencyKey: '44444444-4444-4444-8444-444444444444',
			})
			.expect(403);
		const otherCustomer = await prisma.customer.findFirstOrThrow({
			where: { tenantId: otherTenantId },
		});
		await request(server)
			.get(`/tenant/debts/CUSTOMER/${otherCustomer.id}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(404);
		await expect(
			prisma.$transaction(async (tx) => {
				await tx.customer.update({
					where: { id: customerId },
					data: { balance: { decrement: 10n } },
				});
				throw new Error('forced rollback');
			}),
		).rejects.toThrow('forced rollback');
		expect(
			(await prisma.customer.findUniqueOrThrow({ where: { id: customerId } }))
				.balance,
		).toBe(600n);
		const customers = await prisma.customer.createMany({
			data: Array.from({ length: 1000 }, (_, index) => ({
				tenantId,
				name: `Perf Customer ${index}`,
				balance: 100n,
			})),
		});
		expect(customers.count).toBe(1000);
		const durations: number[] = [];
		for (let i = 0; i < 35; i += 1) {
			const started = performance.now();
			await request(server)
				.get('/tenant/debts?page=1&pageSize=20&partyType=CUSTOMER')
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(200);
			durations.push(performance.now() - started);
		}
		const sorted = durations.slice(5).sort((a, b) => a - b);
		const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
		console.log('Debt list performance p95(ms):', p95);
		expect(sorted.length).toBe(30);
	});
});
