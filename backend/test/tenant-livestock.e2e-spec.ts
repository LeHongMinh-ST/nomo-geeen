import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

describe('Tenant livestock state machine (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let tenantId: string;
	let planId: string;
	let roleId: string;
	let inventoryEditPermissionId: string;
	let productId: string;
	let unitId: string;
	let warehouseId: string;
	let batchId: string;
	let accessToken: string;
	const suffix = Date.now();
	const username = `e2e-livestock-${suffix}`;
	const password = 'Livestock-E2E-Pw1';

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

		const features = await Promise.all(
			['inventory', 'advanced_mode'].map((code) =>
				prisma.feature.upsert({
					where: { code },
					update: {},
					create: { code, name: code, group: 'core' },
				}),
			),
		);
		const permissions = await Promise.all(
			['inventory:view', 'inventory:edit', 'sales:create'].map((code) =>
				prisma.permission.upsert({
					where: { code },
					update: {},
					create: {
						code,
						resource: code.split(':')[0],
						action: code.split(':')[1],
					},
				}),
			),
		);
		inventoryEditPermissionId = permissions[1].id;

		const tenant = await prisma.tenant.create({
			data: {
				slug: `e2e-livestock-${suffix}`,
				name: 'E2E Livestock Tenant',
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
				fullName: 'Livestock E2E',
				roleId,
				status: 'ACTIVE',
			},
		});
		const plan = await prisma.plan.create({
			data: {
				code: `e2e-livestock-${suffix}`,
				name: 'Livestock E2E Plan',
				price: 0n,
				billingCycle: 'MONTHLY',
				maxUsers: 2,
				maxWarehouses: 1,
				maxProducts: 10,
				maxCustomers: 10,
				maxOrdersPerMonth: 100,
				maxStorageBytes: 1000000n,
				features: {
					create: features.map((feature) => ({ featureId: feature.id })),
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
				startDate: new Date(Date.now() - 60000),
				endDate: new Date(Date.now() + 86400000),
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
				sku: `LIV-${suffix}`,
				name: 'Livestock seed E2E',
				productKind: 'LIVESTOCK_SEED',
				attrs: { livestockStatus: 'HEALTHY' },
				baseUnitId: unitId,
				costPrice: 300n,
				salePrice: 500n,
			},
		});
		productId = product.id;
		const batch = await prisma.productBatch.create({
			data: {
				tenantId,
				productId,
				warehouseId,
				batchCode: `LIV-BATCH-${suffix}`,
				qtyOnHand: 2,
			},
		});
		batchId = batch.id;
		await prisma.stock.create({
			data: { tenantId, warehouseId, productId, qty: 2, avgCost: 300n },
		});
		const login = await request(app.getHttpServer())
			.post('/auth/login')
			.send({ identifier: username, password })
			.expect(200);
		accessToken = login.body.accessToken;
	});

	afterAll(async () => {
		if (!app || !prisma) return;
		await prisma.auditLog.deleteMany({ where: { tenantId } });
		await prisma.saleLineBatch.deleteMany({
			where: { saleLine: { tenantId } },
		});
		await prisma.saleLine.deleteMany({ where: { tenantId } });
		await prisma.sale.deleteMany({ where: { tenantId } });
		await prisma.stockMovement.deleteMany({ where: { tenantId } });
		await prisma.stock.deleteMany({ where: { tenantId } });
		await prisma.productBatch.deleteMany({ where: { tenantId } });
		await prisma.product.deleteMany({ where: { tenantId } });
		await prisma.warehouse.deleteMany({ where: { tenantId } });
		await prisma.unit.deleteMany({ where: { tenantId } });
		await prisma.user.deleteMany({ where: { tenantId } });
		await prisma.rolePermission.deleteMany({ where: { roleId } });
		await prisma.role.delete({ where: { id: roleId } });
		await prisma.subscription.deleteMany({ where: { tenantId } });
		await prisma.tenant.delete({ where: { id: tenantId } });
		await prisma.plan.delete({ where: { id: planId } });
		await app.close();
	});

	it('changes state through the guarded route, audits it, and exposes state/version in inventory', async () => {
		const before = await request(app.getHttpServer())
			.get('/tenant/inventory')
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(200);
		const listedBatch = before.body.items[0].batches.find(
			(batch: { id: string }) => batch.id === batchId,
		);
		expect(listedBatch).toEqual(
			expect.objectContaining({ healthState: 'HEALTHY', version: 0 }),
		);

		const changed = await request(app.getHttpServer())
			.patch(`/tenant/inventory/batches/${batchId}/health-state`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ toState: 'SICK', expectedVersion: 0, reason: 'clinical' })
			.expect(200);
		expect(changed.body).toEqual(
			expect.objectContaining({ id: batchId, healthState: 'SICK', version: 1 }),
		);
		const audit = await prisma.auditLog.findFirstOrThrow({
			where: {
				tenantId,
				action: 'LIVESTOCK_STATE_CHANGE',
				resourceId: batchId,
			},
		});
		expect(audit.before).toEqual(
			expect.objectContaining({ healthState: 'HEALTHY', version: 0 }),
		);
		expect(audit.after).toEqual(
			expect.objectContaining({
				healthState: 'SICK',
				version: 1,
				reason: 'clinical',
			}),
		);
	});

	it('rejects invalid recovery and never sells a blocked batch', async () => {
		await request(app.getHttpServer())
			.patch(`/tenant/inventory/batches/${batchId}/health-state`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ toState: 'DEAD', expectedVersion: 0 })
			.expect(422)
			.expect((response) =>
				expect(response.body.reason).toBe('INVALID_TRANSITION'),
			);
		const sale = await request(app.getHttpServer())
			.post('/tenant/sales/quick')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({
				idempotencyKey: randomUUID(),
				paymentMethod: 'CASH',
				amountPaid: 500,
				lines: [{ productId, unitId, qty: 1, unitPrice: 500 }],
			})
			.expect(422);
		expect(sale.body.reason).toBe('INSUFFICIENT_ELIGIBLE_BATCH');
		expect(
			(
				await prisma.productBatch.findUniqueOrThrow({ where: { id: batchId } })
			).qtyOnHand.toString(),
		).toBe('2');
		expect(await prisma.sale.count({ where: { tenantId } })).toBe(0);
	});

	it('enforces tenant permission at the HTTP boundary', async () => {
		await prisma.rolePermission.delete({
			where: {
				roleId_permissionId: {
					roleId,
					permissionId: inventoryEditPermissionId,
				},
			},
		});
		try {
			await request(app.getHttpServer())
				.patch(`/tenant/inventory/batches/${batchId}/health-state`)
				.set('Authorization', `Bearer ${accessToken}`)
				.send({ toState: 'REJECTED', expectedVersion: 1 })
				.expect(403);
		} finally {
			await prisma.rolePermission.create({
				data: { roleId, permissionId: inventoryEditPermissionId },
			});
		}
	});
});
