import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

describe('Tenant product entitlement enforcement (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let tenantId: string;
	let planId: string;
	let subscriptionId: string;
	let featureId: string;
	let roleId: string;
	let userId: string;
	let unitId: string;
	let accessToken: string;
	const suffix = Date.now();
	const username = `e2e-product-${suffix}`;
	const password = 'Product-E2E-Pw1';

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
		featureId = feature.id;
		const tenant = await prisma.tenant.create({
			data: {
				slug: `e2e-product-${suffix}`,
				name: 'E2E Product Tenant',
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
			},
		});
		roleId = role.id;
		const productPermissions = await prisma.permission.findMany({
			where: {
				code: {
					in: [
						'product:view',
						'product:create',
						'product:edit',
						'product:delete',
					],
				},
			},
			select: { id: true },
		});
		await prisma.rolePermission.createMany({
			data: productPermissions.map(({ id }) => ({ roleId, permissionId: id })),
		});
		const user = await prisma.user.create({
			data: {
				tenantId,
				username,
				passwordHash: await passwords.hash(password),
				fullName: 'Product E2E',
				roleId,
				status: 'ACTIVE',
			},
		});
		userId = user.id;
		const plan = await prisma.plan.create({
			data: {
				code: `e2e-product-${suffix}`,
				name: 'Product E2E Plan',
				price: 0n,
				billingCycle: 'MONTHLY',
				maxUsers: 1,
				maxWarehouses: 1,
				maxProducts: 2,
				maxCustomers: null,
				maxOrdersPerMonth: null,
				maxStorageBytes: 1000000n,
				features: { create: { featureId: feature.id } },
			},
		});
		planId = plan.id;
		const subscription = await prisma.subscription.create({
			data: {
				tenantId,
				planId,
				status: 'ACTIVE',
				billingCycle: 'MONTHLY',
				startDate: new Date(Date.now() - 60_000),
				endDate: new Date(Date.now() + 86_400_000),
			},
		});
		subscriptionId = subscription.id;
		const unit = await prisma.unit.create({
			data: { tenantId, code: `EA-${suffix}`, name: 'Each' },
		});
		unitId = unit.id;
		const login = await request(app.getHttpServer())
			.post('/auth/login')
			.send({ identifier: username, password })
			.expect(200);
		accessToken = login.body.accessToken;
	});

	afterAll(async () => {
		if (!app || !prisma) return;
		await prisma.tenant.deleteMany({ where: { id: tenantId } });
		await prisma.plan.deleteMany({ where: { id: planId } });
		await prisma.role.deleteMany({ where: { id: roleId } });
		await prisma.user.deleteMany({ where: { id: userId } });
		await app.close();
	});

	function auth(req: request.Test) {
		return req.set('Authorization', `Bearer ${accessToken}`);
	}

	it('returns stable 403 denials for missing, disabled, and expired entitlements', async () => {
		await prisma.planFeature.deleteMany({ where: { planId } });
		await auth(request(app.getHttpServer()).post('/tenant/products'))
			.send({ sku: 'E2E-MISSING', name: 'Missing feature', baseUnitId: unitId })
			.expect(403)
			.expect((response) =>
				expect(response.body.reason).toBe('FEATURE_NOT_INCLUDED'),
			);
		await prisma.planFeature.create({ data: { planId, featureId } });

		await prisma.tenantFeatureFlag.create({
			data: { tenantId, featureId, enabled: false },
		});
		await auth(request(app.getHttpServer()).post('/tenant/products'))
			.send({
				sku: 'E2E-DISABLED',
				name: 'Disabled feature',
				baseUnitId: unitId,
			})
			.expect(403)
			.expect((response) =>
				expect(response.body.reason).toBe('FEATURE_DISABLED'),
			);
		await prisma.tenantFeatureFlag.deleteMany({
			where: { tenantId, featureId },
		});

		await prisma.subscription.update({
			where: { id: subscriptionId },
			data: { endDate: new Date(Date.now() - 1_000) },
		});
		await auth(request(app.getHttpServer()).post('/tenant/products'))
			.send({
				sku: 'E2E-EXPIRED',
				name: 'Expired subscription',
				baseUnitId: unitId,
			})
			.expect(403)
			.expect((response) =>
				expect(response.body.reason).toBe('SUBSCRIPTION_EXPIRED'),
			);
		await prisma.subscription.update({
			where: { id: subscriptionId },
			data: { endDate: new Date(Date.now() + 86_400_000) },
		});
	});

	it('allows a product at the HTTP boundary', async () => {
		await auth(request(app.getHttpServer()).post('/tenant/products'))
			.send({ sku: 'E2E-1', name: 'First', baseUnitId: unitId })
			.expect(201);
		await auth(request(app.getHttpServer()).get('/tenant/products'))
			.expect(200)
			.expect((response) => expect(response.body).toHaveLength(1));
	});

	it('supports tenant-scoped lookups, detail, update, and soft delete', async () => {
		const list = await auth(
			request(app.getHttpServer()).get('/tenant/products'),
		).expect(200);
		const productId = list.body[0].id as string;

		const lookups = await auth(
			request(app.getHttpServer()).get('/tenant/products/lookups'),
		).expect(200);
		expect(lookups.body.units).toEqual(
			expect.arrayContaining([
				{ id: unitId, code: `EA-${suffix}`, name: 'Each' },
			]),
		);

		await auth(
			request(app.getHttpServer()).get(`/tenant/products/${productId}`),
		)
			.expect(200)
			.expect((response) => expect(response.body.id).toBe(productId));

		await auth(
			request(app.getHttpServer()).patch(`/tenant/products/${productId}`),
		)
			.send({ name: 'Updated product', salePrice: 12500 })
			.expect(200)
			.expect((response) => {
				expect(response.body.name).toBe('Updated product');
				expect(response.body.salePrice).toBe('12500');
			});

		await auth(
			request(app.getHttpServer()).delete(`/tenant/products/${productId}`),
		).expect(200);
		await auth(
			request(app.getHttpServer()).get(`/tenant/products/${productId}`),
		).expect(404);
	});

	it('rolls back a reserved slot when Product creation fails', async () => {
		await auth(request(app.getHttpServer()).post('/tenant/products'))
			.send({ sku: 'E2E-BAD', name: 'Invalid unit', baseUnitId: tenantId })
			.expect(404);
		const counter = await prisma.tenantQuotaCounter.findUniqueOrThrow({
			where: {
				tenantId_dimension_periodKey: {
					tenantId,
					dimension: 'maxProducts',
					periodKey: 'lifetime',
				},
			},
		});
		expect(counter.used).toBe(1n);
	});

	it('allows only one of two concurrent writes into the final quota slot', async () => {
		const results = await Promise.all([
			auth(request(app.getHttpServer()).post('/tenant/products')).send({
				sku: 'E2E-2A',
				name: 'Concurrent A',
				baseUnitId: unitId,
			}),
			auth(request(app.getHttpServer()).post('/tenant/products')).send({
				sku: 'E2E-2B',
				name: 'Concurrent B',
				baseUnitId: unitId,
			}),
		]);
		expect(results.map((result) => result.status).sort()).toEqual([201, 403]);
		const counter = await prisma.tenantQuotaCounter.findUniqueOrThrow({
			where: {
				tenantId_dimension_periodKey: {
					tenantId,
					dimension: 'maxProducts',
					periodKey: 'lifetime',
				},
			},
		});
		expect(counter.used).toBe(2n);
	});

	it('preserves reads after downgrade and blocks only further growth', async () => {
		await prisma.plan.update({
			where: { id: planId },
			data: { maxProducts: 1 },
		});
		await auth(request(app.getHttpServer()).get('/tenant/products'))
			.expect(200)
			.expect((response) => expect(response.body).toHaveLength(1));
		const denied = await auth(
			request(app.getHttpServer()).post('/tenant/products'),
		)
			.send({ sku: 'E2E-3', name: 'Over quota', baseUnitId: unitId })
			.expect(403);
		expect(denied.body.reason).toBe('QUOTA_EXCEEDED');
	});
});
