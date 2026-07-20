import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

describe('Tenant quick sale (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let tenantId: string;
	let planId: string;
	let productId: string;
	let unitId: string;
	let warehouseId: string;
	let accessToken: string;
	let roleId: string;
	let permissionId: string;
	let customerId: string;
	const suffix = Date.now();
	const username = `e2e-sale-${suffix}`;
	const password = 'Sale-E2E-Pw1';

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
		const feature = await prisma.feature.upsert({
			where: { code: 'inventory' },
			update: {},
			create: { code: 'inventory', name: 'Inventory', group: 'core' },
		});
		const permission = await prisma.permission.upsert({
			where: { code: 'sales:create' },
			update: {},
			create: { code: 'sales:create', resource: 'sales', action: 'create' },
		});
		permissionId = permission.id;
		const tenant = await prisma.tenant.create({
			data: {
				slug: `e2e-sale-${suffix}`,
				name: 'E2E Sale Tenant',
				status: 'ACTIVE',
				tenantType: 'RETAIL_DEALER',
				mode: 'SIMPLE',
			},
		});
		tenantId = tenant.id;
		const role = await prisma.role.create({
			data: {
				tenantId,
				code: 'OWNER',
				name: 'Owner',
				isSystem: false,
				rank: 1,
				permissions: { create: { permissionId: permission.id } },
			},
		});
		roleId = role.id;
		await prisma.user.create({
			data: {
				tenantId,
				username,
				passwordHash: await passwords.hash(password),
				fullName: 'Sale E2E',
				roleId: role.id,
				status: 'ACTIVE',
			},
		});
		const plan = await prisma.plan.create({
			data: {
				code: `e2e-sale-${suffix}`,
				name: 'Sale E2E Plan',
				price: 0n,
				billingCycle: 'MONTHLY',
				maxUsers: 2,
				maxWarehouses: 1,
				maxProducts: 10,
				maxCustomers: 10,
				maxOrdersPerMonth: 100,
				maxStorageBytes: 1000000n,
				features: { create: { featureId: feature.id } },
			},
		});
		planId = plan.id;
		await prisma.subscription.create({
			data: {
				tenantId,
				planId,
				status: 'ACTIVE',
				billingCycle: 'MONTHLY',
				startDate: new Date(Date.now() - 60_000),
				endDate: new Date(Date.now() + 86_400_000),
			},
		});
		const unit = await prisma.unit.create({
			data: { tenantId, code: `EA-${suffix}`, name: 'Each' },
		});
		unitId = unit.id;
		const warehouse = await prisma.warehouse.create({
			data: { tenantId, code: 'DEFAULT', name: 'Main', isDefault: true },
		});
		warehouseId = warehouse.id;
		const product = await prisma.product.create({
			data: {
				tenantId,
				sku: `SALE-${suffix}`,
				name: 'Sale product',
				baseUnitId: unitId,
				costPrice: 300n,
				salePrice: 500n,
			},
		});
		productId = product.id;
		await prisma.stock.create({
			data: { tenantId, warehouseId, productId, qty: 3, avgCost: 300n },
		});
		const customer = await prisma.customer.create({
			data: { tenantId, name: 'E2E Customer' },
		});
		customerId = customer.id;
		const login = await request(app.getHttpServer())
			.post('/auth/login')
			.send({ identifier: username, password })
			.expect(200);
		accessToken = login.body.accessToken;
	});

	afterAll(async () => {
		if (!app || !prisma) return;
		await prisma.saleLine.deleteMany({ where: { tenantId } });
		await prisma.sale.deleteMany({ where: { tenantId } });
		await prisma.stockMovement.deleteMany({ where: { tenantId } });
		await prisma.stock.deleteMany({ where: { tenantId } });
		await prisma.product.deleteMany({ where: { tenantId } });
		await prisma.warehouse.deleteMany({ where: { tenantId } });
		await prisma.unit.deleteMany({ where: { tenantId } });
		await prisma.tenant.deleteMany({ where: { id: tenantId } });
		await prisma.plan.deleteMany({ where: { id: planId } });
		await app.close();
	});

	function saleRequest(key: string, qty = 1) {
		return {
			idempotencyKey: key,
			paymentMethod: 'CASH',
			amountPaid: 500 * qty,
			discountAmount: 0,
			lines: [{ productId, unitId, qty, unitPrice: 500 }],
		};
	}

	it('creates one sale, decrements stock, and safely replays the same key', async () => {
		const key = randomUUID();
		const first = await request(app.getHttpServer())
			.post('/tenant/sales/quick')
			.set('Authorization', `Bearer ${accessToken}`)
			.send(saleRequest(key))
			.expect(201);
		expect(first.body).toEqual(
			expect.objectContaining({ status: 'COMPLETED', total: 500 }),
		);

		const replay = await request(app.getHttpServer())
			.post('/tenant/sales/quick')
			.set('Authorization', `Bearer ${accessToken}`)
			.send(saleRequest(key))
			.expect(201);
		expect(replay.body.id).toBe(first.body.id);
		await request(app.getHttpServer())
			.post('/tenant/sales/quick')
			.set('Authorization', `Bearer ${accessToken}`)
			.send(saleRequest(key, 2))
			.expect(409)
			.expect((response) =>
				expect(response.body.reason).toBe('IDEMPOTENCY_CONFLICT'),
			);
		expect(await prisma.sale.count({ where: { tenantId } })).toBe(1);
		expect(
			(
				await prisma.stock.findUniqueOrThrow({
					where: { warehouseId_productId: { warehouseId, productId } },
				})
			).qty.toString(),
		).toBe('2');
		expect(
			await prisma.stockMovement.count({
				where: { tenantId, refId: first.body.id },
			}),
		).toBe(1);
	});

	it('records customer debt atomically with the sale', async () => {
		const response = await request(app.getHttpServer())
			.post('/tenant/sales/quick')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				...saleRequest(randomUUID()),
				paymentMethod: 'DEBT',
				amountPaid: 0,
				customerId,
			})
			.expect(201);
		expect(response.body).toEqual(
			expect.objectContaining({ debtAmount: 500, paymentMethod: 'DEBT' }),
		);
		expect(
			(
				await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })
			).balance.toString(),
		).toBe('500');
		expect(
			await prisma.debtLedger.count({
				where: { tenantId, refId: response.body.id },
			}),
		).toBe(1);
	});

	it('rolls back an insufficient-stock sale', async () => {
		await request(app.getHttpServer())
			.post('/tenant/sales/quick')
			.set('Authorization', `Bearer ${accessToken}`)
			.send(saleRequest(randomUUID(), 5))
			.expect(422)
			.expect((response) =>
				expect(response.body.reason).toBe('INSUFFICIENT_STOCK'),
			);
		expect(await prisma.sale.count({ where: { tenantId } })).toBe(2);
	});

	it('denies the route when the tenant permission is removed', async () => {
		await prisma.rolePermission.delete({
			where: { roleId_permissionId: { roleId, permissionId } },
		});
		try {
			await request(app.getHttpServer())
				.post('/tenant/sales/quick')
				.set('Authorization', `Bearer ${accessToken}`)
				.send(saleRequest(randomUUID()))
				.expect(403);
		} finally {
			await prisma.rolePermission.create({ data: { roleId, permissionId } });
		}
	});
});
