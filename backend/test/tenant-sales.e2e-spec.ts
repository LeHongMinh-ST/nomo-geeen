import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

describe('Tenant sales and order lifecycle (e2e)', () => {
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
	let viewPermissionId: string;
	let advancedFeatureId: string;
	let foreignTenantId: string;
	let foreignWarehouseId: string;
	let foreignUnitId: string;
	let foreignProductId: string;
	let foreignOrderId: string;
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
		const advancedFeature = await prisma.feature.upsert({
			where: { code: 'advanced_mode' },
			update: {},
			create: { code: 'advanced_mode', name: 'Advanced sales', group: 'advanced' },
		});
		advancedFeatureId = advancedFeature.id;
		const debtFeature = await prisma.feature.upsert({
			where: { code: 'debt' },
			update: {},
			create: { code: 'debt', name: 'Debt', group: 'core' },
		});
		const permissions = await Promise.all(
			['sales:view', 'sales:create', 'sales:edit'].map((code) =>
				prisma.permission.upsert({
					where: { code },
					update: {},
					create: { code, resource: 'sales', action: code.split(':')[1] },
				}),
			),
		);
		[viewPermissionId, permissionId] = permissions.map(
			(permission) => permission.id,
		);
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
				permissions: {
					create: permissions.map((permission) => ({ permissionId: permission.id })),
				},
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
				features: {
					create: [
						{ featureId: feature.id },
						{ featureId: advancedFeature.id },
						{ featureId: debtFeature.id },
					],
				},
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
		const foreignTenant = await prisma.tenant.create({
			data: {
				slug: `e2e-sale-foreign-${suffix}`,
				name: 'E2E Foreign Sale Tenant',
				status: 'ACTIVE',
				tenantType: 'RETAIL_DEALER',
				mode: 'SIMPLE',
			},
		});
		foreignTenantId = foreignTenant.id;
		const foreignUnit = await prisma.unit.create({
			data: { tenantId: foreignTenantId, code: `EA-F-${suffix}`, name: 'Each' },
		});
		foreignUnitId = foreignUnit.id;
		const foreignWarehouse = await prisma.warehouse.create({
			data: { tenantId: foreignTenantId, code: 'DEFAULT', name: 'Main', isDefault: true },
		});
		foreignWarehouseId = foreignWarehouse.id;
		const foreignProduct = await prisma.product.create({
			data: {
				tenantId: foreignTenantId,
				sku: `SALE-F-${suffix}`,
				name: 'Foreign sale product',
				baseUnitId: foreignUnitId,
				costPrice: 300n,
				salePrice: 500n,
			},
		});
		foreignProductId = foreignProduct.id;
		const foreignOrder = await prisma.sale.create({
			data: {
				tenantId: foreignTenantId,
				docNo: `BH-FOREIGN-${suffix}`,
				channel: 'ORDER',
				status: 'DRAFT',
				warehouseId: foreignWarehouseId,
				subtotal: 500n,
				total: 500n,
				lines: {
					create: {
						tenantId: foreignTenantId,
						productId: foreignProductId,
						productNameSnapshot: foreignProduct.name,
						unitId: foreignUnitId,
						qty: 1,
						qtyBase: 1,
						unitPrice: 500n,
						lineTotal: 500n,
					},
				},
			},
		});
		foreignOrderId = foreignOrder.id;
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
		if (foreignTenantId) {
			await prisma.saleLine.deleteMany({ where: { tenantId: foreignTenantId } });
			await prisma.sale.deleteMany({ where: { tenantId: foreignTenantId } });
			await prisma.product.deleteMany({ where: { tenantId: foreignTenantId } });
			await prisma.warehouse.deleteMany({ where: { tenantId: foreignTenantId } });
			await prisma.unit.deleteMany({ where: { tenantId: foreignTenantId } });
			await prisma.tenant.deleteMany({ where: { id: foreignTenantId } });
		}
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

	function orderRequest(key: string, status: 'DRAFT' | 'COMPLETED' = 'DRAFT') {
		return orderRequestWithQty(key, status, '1');
	}

	function orderRequestWithQty(
		key: string,
		status: 'DRAFT' | 'COMPLETED',
		qty: string,
	) {
		return {
			idempotencyKey: key,
			status,
			customerId,
			lines: [{ productId, unitId, qty, unitPrice: 500 }],
			...(status === 'COMPLETED'
				? { paymentMethod: 'CASH', amountPaid: 500 }
				: {}),
		};
	}

	it('isolates order list/detail and preserves draft zero effects', async () => {
		const key = randomUUID();
		const draft = await request(app.getHttpServer())
			.post('/tenant/sales/orders')
			.set('Authorization', `Bearer ${accessToken}`)
			.send(orderRequest(key))
			.expect(201);
		expect(draft.body).toEqual(expect.objectContaining({ status: 'DRAFT', total: 500 }));
		expect(
			(await prisma.stock.findUniqueOrThrow({
				where: { warehouseId_productId: { warehouseId, productId } },
			})).qty.toString(),
		).toBe('3');
		const list = await request(app.getHttpServer())
			.get('/tenant/sales/orders?page=1&pageSize=20&search=E2E')
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(200);
		expect(list.body.items.map((item: { id: string }) => item.id)).toContain(draft.body.id);
		await request(app.getHttpServer())
			.get(`/tenant/sales/orders/${draft.body.id}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(200);
		await request(app.getHttpServer())
			.get(`/tenant/sales/orders/${foreignOrderId}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(404);
		const replay = await request(app.getHttpServer())
			.post('/tenant/sales/orders')
			.set('Authorization', `Bearer ${accessToken}`)
			.send(orderRequest(key))
			.expect(201);
		expect(replay.body.id).toBe(draft.body.id);
		await request(app.getHttpServer())
			.post('/tenant/sales/orders')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ ...orderRequest(key), note: 'different payload' })
			.expect(409);
	});

	it('completes and cancels an order with exact stock and debt compensation', async () => {
		const draft = await request(app.getHttpServer())
			.post('/tenant/sales/orders')
			.set('Authorization', `Bearer ${accessToken}`)
			.send(orderRequest(randomUUID()))
			.expect(201);
		const completed = await request(app.getHttpServer())
			.post(`/tenant/sales/orders/${draft.body.id}/complete`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ paymentMethod: 'CASH', amountPaid: 0 })
			.expect(201);
		expect(completed.body).toEqual(expect.objectContaining({ status: 'COMPLETED', debtAmount: 500 }));
		expect((await prisma.stock.findUniqueOrThrow({ where: { warehouseId_productId: { warehouseId, productId } } })).qty.toString()).toBe('2');
		expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).balance.toString()).toBe('500');
		expect(await prisma.stockMovement.count({ where: { tenantId, refId: draft.body.id, reason: 'SALE' } })).toBe(1);
		expect(await prisma.debtLedger.count({ where: { tenantId, refId: draft.body.id, direction: 'INCREASE' } })).toBe(1);
		const cancelled = await request(app.getHttpServer())
			.post(`/tenant/sales/orders/${draft.body.id}/cancel`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(201);
		expect(cancelled.body.status).toBe('CANCELLED');
		expect((await prisma.stock.findUniqueOrThrow({ where: { warehouseId_productId: { warehouseId, productId } } })).qty.toString()).toBe('3');
		expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).balance.toString()).toBe('0');
		expect(await prisma.stockMovement.count({ where: { tenantId, refId: draft.body.id, reason: 'SALE_CANCEL' } })).toBe(1);
		expect(await prisma.debtLedger.count({ where: { tenantId, refId: draft.body.id, direction: 'DECREASE' } })).toBe(1);
		await request(app.getHttpServer())
			.post(`/tenant/sales/orders/${draft.body.id}/cancel`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(201);
		expect(await prisma.stockMovement.count({ where: { tenantId, refId: draft.body.id, reason: 'SALE_CANCEL' } })).toBe(1);
	});

	it('enforces permission and advanced sales entitlement', async () => {
		await prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId: viewPermissionId } } });
		try {
			await request(app.getHttpServer())
				.get('/tenant/sales/orders')
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(403);
		} finally {
			await prisma.rolePermission.create({ data: { roleId, permissionId: viewPermissionId } });
		}
		await prisma.planFeature.delete({ where: { planId_featureId: { planId, featureId: advancedFeatureId } } });
		try {
			await request(app.getHttpServer())
				.get('/tenant/sales/orders')
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(403);
		} finally {
			await prisma.planFeature.create({ data: { planId, featureId: advancedFeatureId } });
		}
	});

	it('keeps completion effects exact under concurrent requests', async () => {
		const draft = await request(app.getHttpServer())
			.post('/tenant/sales/orders')
			.set('Authorization', `Bearer ${accessToken}`)
			.send(orderRequest(randomUUID()))
			.expect(201);
		const responses = await Promise.all([
			request(app.getHttpServer()).post(`/tenant/sales/orders/${draft.body.id}/complete`).set('Authorization', `Bearer ${accessToken}`).send({ paymentMethod: 'CASH', amountPaid: 500 }),
			request(app.getHttpServer()).post(`/tenant/sales/orders/${draft.body.id}/complete`).set('Authorization', `Bearer ${accessToken}`).send({ paymentMethod: 'CASH', amountPaid: 500 }),
		]);
		expect(responses.every((response) => [200, 201, 409].includes(response.status))).toBe(true);
		expect(await prisma.stockMovement.count({ where: { tenantId, refId: draft.body.id, reason: 'SALE' } })).toBe(1);
		expect((await prisma.sale.findUniqueOrThrow({ where: { id: draft.body.id } })).status).toBe('COMPLETED');
		await request(app.getHttpServer())
			.post(`/tenant/sales/orders/${draft.body.id}/cancel`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(201);
	});

	it('rolls back an order completion when stock is insufficient', async () => {
		const draft = await request(app.getHttpServer())
			.post('/tenant/sales/orders')
			.set('Authorization', `Bearer ${accessToken}`)
			.send(orderRequestWithQty(randomUUID(), 'DRAFT', '4'))
			.expect(201);
		await request(app.getHttpServer())
			.post(`/tenant/sales/orders/${draft.body.id}/complete`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ paymentMethod: 'CASH', amountPaid: 2000 })
			.expect(422);
		const stored = await prisma.sale.findUniqueOrThrow({
			where: { id: draft.body.id },
		});
		expect(stored.status).toBe('DRAFT');
		expect(
			(await prisma.stock.findUniqueOrThrow({
				where: { warehouseId_productId: { warehouseId, productId } },
			})).qty.toString(),
		).toBe('3');
		expect(
			await prisma.stockMovement.count({
				where: { tenantId, refId: draft.body.id },
			}),
		).toBe(0);
	});

	it('keeps 1,000-order list p95 under 500ms after warmup', async () => {
		await prisma.sale.createMany({
			data: Array.from({ length: 1000 }, (_, index) => ({
				tenantId,
				docNo: `BH-BENCH-${suffix}-${index}`,
				channel: 'ORDER' as const,
				status: 'DRAFT' as const,
				warehouseId,
				subtotal: 500n,
				total: 500n,
			})),
		});
		for (let index = 0; index < 5; index += 1)
			await request(app.getHttpServer()).get('/tenant/sales/orders?page=1&pageSize=20').set('Authorization', `Bearer ${accessToken}`).expect(200);
		const durations: number[] = [];
		for (let index = 0; index < 30; index += 1) {
			const started = performance.now();
			await request(app.getHttpServer()).get('/tenant/sales/orders?page=1&pageSize=20').set('Authorization', `Bearer ${accessToken}`).expect(200);
			durations.push(performance.now() - started);
		}
		durations.sort((a, b) => a - b);
		const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
		console.log(`sales order list benchmark: p95=${p95.toFixed(2)}ms`);
		expect(p95).toBeLessThan(500);
		await prisma.sale.deleteMany({ where: { tenantId, docNo: { startsWith: `BH-BENCH-${suffix}-` } } });
	});

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
		expect(await prisma.sale.count({ where: { tenantId, channel: 'QUICK_SALE' } })).toBe(1);
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
		expect(await prisma.sale.count({ where: { tenantId, channel: 'QUICK_SALE' } })).toBe(2);
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

	it('returns 404 for a same-tenant quick sale on the order detail route', async () => {
		const quickSale = await prisma.sale.create({
			data: {
				tenantId,
				docNo: `QS-WRONG-CHANNEL-${suffix}`,
				channel: 'QUICK_SALE',
				status: 'DRAFT',
				warehouseId,
				subtotal: 500n,
				total: 500n,
				lines: {
					create: {
						tenantId,
						productId,
						productNameSnapshot: 'Sale product',
						unitId,
						qty: 1,
						qtyBase: 1,
						unitPrice: 500n,
						lineTotal: 500n,
					},
				},
			},
		});
		try {
			await request(app.getHttpServer())
				.get(`/tenant/sales/orders/${quickSale.id}`)
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(404);
		} finally {
			await prisma.sale.delete({ where: { id: quickSale.id } });
		}
	});
});
