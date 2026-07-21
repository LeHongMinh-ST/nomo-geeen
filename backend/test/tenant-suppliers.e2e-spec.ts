import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

describe('Tenant suppliers (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let tenantId: string;
	let planId: string;
	let featureId: string;
	let roleId: string;
	let createPermissionId: string;
	let viewPermissionId: string;
	let purchaseId: string;
	let supplierId: string;
	let warehouseId: string;
	let accessToken: string;
	let otherTenantId: string;
	let otherSupplierId: string;
	const suffix = Date.now();
	const username = `e2e-supplier-${suffix}`;
	const password = 'Supplier-E2E-Pw1';
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
		const codes = [
			'supplier:view',
			'supplier:create',
			'supplier:edit',
			'supplier:delete',
			'purchase:view',
		];
		const permissions = await Promise.all(
			codes.map((code) =>
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
		createPermissionId = permissions[1].id;
		viewPermissionId = permissions[0].id;
		purchaseId = permissions[4].id;
		const tenant = await prisma.tenant.create({
			data: {
				slug: `e2e-supplier-${suffix}`,
				name: 'E2E Supplier Tenant',
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
				fullName: 'Supplier E2E',
				roleId: role.id,
				status: 'ACTIVE',
			},
		});
		const plan = await prisma.plan.create({
			data: {
				code: `e2e-supplier-${suffix}`,
				name: 'Supplier E2E Plan',
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
		const warehouse = await prisma.warehouse.create({
			data: { tenantId, code: 'DEFAULT', name: 'Main', isDefault: true },
		});
		warehouseId = warehouse.id;
		const supplier = await prisma.supplier.create({
			data: {
				tenantId,
				code: `SUP-${suffix}`,
				name: 'Original Supplier',
				status: 'ACTIVE',
			},
		});
		supplierId = supplier.id;
		const otherTenant = await prisma.tenant.create({
			data: {
				slug: `e2e-supplier-other-${suffix}`,
				name: 'Other Supplier Tenant',
				status: 'ACTIVE', tenantType: 'RETAIL_DEALER', mode: 'SIMPLE',
			},
		});
		otherTenantId = otherTenant.id;
		const otherRole = await prisma.role.create({
			data: {
				tenantId: otherTenantId, code: 'OWNER', name: 'Owner', isSystem: false, rank: 1,
				permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
			},
		});
		await prisma.user.create({
			data: {
				tenantId: otherTenantId, username: `e2e-supplier-other-${suffix}`,
				passwordHash: await passwords.hash(password), fullName: 'Other Supplier',
				roleId: otherRole.id, status: 'ACTIVE',
			},
		});
		const otherSupplier = await prisma.supplier.create({
			data: { tenantId: otherTenantId, code: 'OTHER-01', name: 'Other Tenant Supplier', status: 'ACTIVE' },
		});
		otherSupplierId = otherSupplier.id;
		const purchase = await prisma.purchase.create({
			data: {
				tenantId,
				docNo: `PN-${suffix}`,
				supplierId,
				warehouseId,
				status: 'DRAFT',
				createdBy: null,
			},
		});
		purchaseId = purchase.id;
		const login = await request(app.getHttpServer())
			.post('/auth/login')
			.send({ identifier: username, password })
			.expect(200);
		accessToken = login.body.accessToken;
	});
		afterAll(async () => {
		if (!app || !prisma) return;
		if (otherTenantId) {
			await prisma.supplier.deleteMany({ where: { tenantId: otherTenantId } });
			await prisma.user.deleteMany({ where: { tenantId: otherTenantId } });
			await prisma.rolePermission.deleteMany({ where: { role: { tenantId: otherTenantId } } });
			await prisma.role.deleteMany({ where: { tenantId: otherTenantId } });
			await prisma.tenant.delete({ where: { id: otherTenantId } });
		}
		await prisma.purchase.deleteMany({ where: { tenantId } });
		await prisma.supplier.deleteMany({ where: { tenantId } });
		await prisma.stockMovement.deleteMany({ where: { tenantId } });
		await prisma.stock.deleteMany({ where: { tenantId } });
		await prisma.warehouse.deleteMany({ where: { tenantId } });
		await prisma.tenant.delete({ where: { id: tenantId } });
		await prisma.plan.delete({ where: { id: planId } });
		await app.close();
	});
	it('creates, searches, updates and soft-deletes while keeping purchase history readable', async () => {
		const created = await request(app.getHttpServer())
			.post('/tenant/suppliers')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ code: 'NEW-01', name: 'New Supplier', phone: '0909', balance: 999999 })
			.expect(201);
		expect(created.body).toEqual(
			expect.objectContaining({
				code: 'NEW-01',
				name: 'New Supplier',
				status: 'ACTIVE',
				balance: 0,
			}),
		);
		await request(app.getHttpServer())
			.get('/tenant/suppliers?search=0909&pageSize=20')
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(200)
			.expect((response) => {
				expect(response.body.pageSize).toBe(20);
				expect(response.body.items).toHaveLength(1);
			});
		await request(app.getHttpServer())
			.post('/tenant/suppliers')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ code: '   ', name: 'Missing code' })
			.expect(422)
			.expect(({ body }) => expect(body.reason).toBe('VALIDATION_ERROR'));
		await request(app.getHttpServer())
			.post('/tenant/suppliers')
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ code: 'NEW-01', name: 'Duplicate' })
			.expect(409);
		await request(app.getHttpServer())
			.get(`/tenant/suppliers/${otherSupplierId}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(404);
		await request(app.getHttpServer())
			.patch(`/tenant/suppliers/${created.body.id}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({ name: 'Renamed' })
			.expect(200);
		await request(app.getHttpServer())
			.delete(`/tenant/suppliers/${created.body.id}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(200);
		await request(app.getHttpServer())
			.get(`/tenant/suppliers/${created.body.id}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(404);
		await prisma.rolePermission.delete({
			where: {
				roleId_permissionId: { roleId, permissionId: createPermissionId },
			},
		});
		try {
			await request(app.getHttpServer())
				.post('/tenant/suppliers')
				.set('Authorization', `Bearer ${accessToken}`)
				.send({ code: 'DENY', name: 'Denied' })
				.expect(403);
		} finally {
			await prisma.rolePermission.create({
				data: { roleId, permissionId: createPermissionId },
			});
		}
		await prisma.planFeature.delete({ where: { planId_featureId: { planId, featureId } } });
		try {
			await request(app.getHttpServer())
				.post('/tenant/suppliers')
				.set('Authorization', `Bearer ${accessToken}`)
				.send({ code: 'NO-FEATURE', name: 'No Inventory' })
				.expect(403);
		} finally {
			await prisma.planFeature.create({ data: { planId, featureId } });
		}
		await prisma.rolePermission.delete({
			where: { roleId_permissionId: { roleId, permissionId: viewPermissionId } },
		});
		try {
			await request(app.getHttpServer())
				.get('/tenant/suppliers')
				.set('Authorization', `Bearer ${accessToken}`)
				.expect(403);
		} finally {
			await prisma.rolePermission.create({ data: { roleId, permissionId: viewPermissionId } });
		}
		await request(app.getHttpServer())
			.delete(`/tenant/suppliers/${supplierId}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(200);
		const history = await request(app.getHttpServer())
			.get(`/tenant/purchases/${purchaseId}`)
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(200);
		expect(history.body.supplierName).toBe('Original Supplier');
	});
});
