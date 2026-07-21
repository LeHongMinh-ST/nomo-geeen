import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

describe('Tenant purchases (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let tenantId: string;
	let planId: string;
	let roleId: string;
	let editPermissionId: string;
	let createPermissionId: string;
	let productId: string;
	let baseUnitId: string;
	let purchaseUnitId: string;
	let warehouseId: string;
	let supplierId: string;
	let accessToken: string;
	const suffix = Date.now();
	const username = `e2e-purchase-${suffix}`;
	const password = 'Purchase-E2E-Pw1';
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
		const permissionCodes = [
			'purchase:view',
			'purchase:create',
			'purchase:edit',
		];
		const permissions = await Promise.all(
			permissionCodes.map((code) =>
				prisma.permission.upsert({
					where: { code },
					update: {},
					create: { code, resource: 'purchase', action: code.split(':')[1] },
				}),
			),
		);
		createPermissionId = permissions[1].id;
		editPermissionId = permissions[2].id;
		const tenant = await prisma.tenant.create({
			data: {
				slug: `e2e-purchase-${suffix}`,
				name: 'E2E Purchase Tenant',
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
					create: permissions.map((permission) => ({
						permissionId: permission.id,
					})),
				},
			},
		});
		roleId = role.id;
		await prisma.user.create({
			data: {
				tenantId,
				username,
				passwordHash: await passwords.hash(password),
				fullName: 'Purchase E2E',
				roleId: role.id,
				status: 'ACTIVE',
			},
		});
		const plan = await prisma.plan.create({
			data: {
				code: `e2e-purchase-${suffix}`,
				name: 'Purchase E2E Plan',
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
				startDate: new Date(Date.now() - 60000),
				endDate: new Date(Date.now() + 86400000),
			},
		});
		const baseUnit = await prisma.unit.create({
			data: { tenantId, code: `EA-${suffix}`, name: 'Each' },
		});
		baseUnitId = baseUnit.id;
		const purchaseUnit = await prisma.unit.create({
			data: { tenantId, code: `BOX-${suffix}`, name: 'Box' },
		});
		purchaseUnitId = purchaseUnit.id;
		const warehouse = await prisma.warehouse.create({
			data: { tenantId, code: 'DEFAULT', name: 'Main', isDefault: true },
		});
		warehouseId = warehouse.id;
		const supplier = await prisma.supplier.create({
			data: {
				tenantId,
				code: `SUP-${suffix}`,
				name: 'E2E Supplier',
				status: 'ACTIVE',
			},
		});
		supplierId = supplier.id;
		const product = await prisma.product.create({
			data: {
				tenantId,
				sku: `PUR-${suffix}`,
				name: 'Purchase product',
				baseUnitId,
				costPrice: 0n,
				salePrice: 500n,
			},
		});
		productId = product.id;
		await prisma.productUnitConversion.create({
			data: {
				tenantId,
				productId,
				unitId: purchaseUnitId,
				factorToBase: 40,
				kind: 'PURCHASE',
			},
		});
		const login = await request(app.getHttpServer())
			.post('/auth/login')
			.send({ identifier: username, password })
			.expect(200);
		accessToken = login.body.accessToken;
	});
	afterAll(async () => {
		if (!app || !prisma) return;
		await prisma.debtLedger.deleteMany({ where: { tenantId } });
		await prisma.stockMovement.deleteMany({ where: { tenantId } });
		await prisma.purchaseLine.deleteMany({ where: { tenantId } });
		await prisma.purchase.deleteMany({ where: { tenantId } });
		await prisma.stock.deleteMany({ where: { tenantId } });
		await prisma.productUnitConversion.deleteMany({ where: { tenantId } });
		await prisma.product.deleteMany({ where: { tenantId } });
		await prisma.supplier.deleteMany({ where: { tenantId } });
		await prisma.warehouse.deleteMany({ where: { tenantId } });
		await prisma.unit.deleteMany({ where: { tenantId } });
		await prisma.tenant.delete({ where: { id: tenantId } });
		await prisma.plan.delete({ where: { id: planId } });
		await app.close();
	});
	function payload(key: string, qty = '2') {
		return {
			idempotencyKey: key,
			supplierId,
			status: 'DRAFT',
			paymentMethod: 'DEBT',
			amountPaid: 0,
			discountAmount: 0,
			shippingFee: 0,
			lines: [{ productId, unitId: purchaseUnitId, qty, unitPrice: 1000 }],
		};
	}
	it('keeps drafts side-effect free, completes with conversion/debt, and replays safely', async () => {
		const key = randomUUID();
		const draft = await request(app.getHttpServer())
			.post('/tenant/purchases')
			.set('Authorization', `Bearer ${accessToken}`)
			.send(payload(key))
			.expect(201);
		expect(draft.body).toEqual(
			expect.objectContaining({
				status: 'DRAFT',
				total: 2000,
				debtAmount: 2000,
			}),
		);
		expect(await prisma.stock.count({ where: { tenantId } })).toBe(0);
		const completed = await request(app.getHttpServer())
			.post(`/tenant/purchases/${draft.body.id}/complete`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ idempotencyKey: key })
			.expect(201);
		expect(completed.body).toEqual(
			expect.objectContaining({ status: 'COMPLETED' }),
		);
		const stock = await prisma.stock.findUniqueOrThrow({
			where: { warehouseId_productId: { warehouseId, productId } },
		});
		expect(stock.qty.toString()).toBe('80');
		expect(stock.avgCost.toString()).toBe('25');
		expect(
			(
				await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } })
			).balance.toString(),
		).toBe('2000');
		expect(
			await prisma.stockMovement.count({
				where: { tenantId, refId: draft.body.id },
			}),
		).toBe(1);
		expect(
			await prisma.debtLedger.count({
				where: { tenantId, refId: draft.body.id },
			}),
		).toBe(1);
		const replay = await request(app.getHttpServer())
			.post(`/tenant/purchases/${draft.body.id}/complete`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ idempotencyKey: key })
			.expect(201);
		expect(replay.body.id).toBe(draft.body.id);
		expect(
			await prisma.stockMovement.count({
				where: { tenantId, refId: draft.body.id },
			}),
		).toBe(1);
		await request(app.getHttpServer())
			.post('/tenant/purchases')
			.set('Authorization', `Bearer ${accessToken}`)
			.send(payload(key, '3'))
			.expect(409);
	});
	it('rejects invalid conversion and enforces permission', async () => {
		await request(app.getHttpServer())
			.post('/tenant/purchases')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				...payload(randomUUID()),
				lines: [{ productId, unitId: randomUUID(), qty: '1', unitPrice: 1000 }],
			})
			.expect(422);
		await prisma.rolePermission.delete({
			where: {
				roleId_permissionId: { roleId, permissionId: createPermissionId },
			},
		});
		try {
			await request(app.getHttpServer())
				.post('/tenant/purchases')
				.set('Authorization', `Bearer ${accessToken}`)
				.send(payload(randomUUID()))
				.expect(403);
		} finally {
			await prisma.rolePermission.create({
				data: { roleId, permissionId: createPermissionId },
			});
		}
	});
});
