import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditAction } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PasswordService } from '../src/platform/auth/password.service';
import { PrismaService } from '../src/platform/prisma/prisma.service';

/**
 * RBAC roles CRUD full lifecycle (e2e). Chay tren Postgres + Redis that,
 * yeu cau `pnpm db:seed:rbac` da chay truoc do (system roles + admin.* permissions).
 */
describe('Admin roles CRUD (e2e)', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let adminId: string;
	let accessToken: string;
	let permAId: string;
	let permBId: string;
	let createdRoleId: string;
	const email = `e2e-roles-${Date.now()}@nomogreen.vn`;
	const password = 'Roles-Full-Pw1';
	const roleCode = `E2E_ROLE_${Date.now()}`;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		app = moduleRef.createNestApplication();
		app.use(cookieParser());
		app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
		await app.init();

		prisma = app.get(PrismaService);
		const passwords = app.get(PasswordService);
		const admin = await prisma.platformAdmin.create({
			data: {
				email,
				passwordHash: await passwords.hash(password),
				fullName: 'E2E Roles',
				role: 'SUPER_ADMIN',
				status: 'ACTIVE',
			},
		});
		adminId = admin.id;

		const login = await request(app.getHttpServer())
			.post('/auth/admin/login')
			.send({ email, password })
			.expect(200);
		accessToken = login.body.accessToken;

		const permA = await prisma.permission.findFirstOrThrow({ where: { code: 'admin.report:view' } });
		const permB = await prisma.permission.findFirstOrThrow({ where: { code: 'admin.report:export' } });
		permAId = permA.id;
		permBId = permB.id;
	});

	afterAll(async () => {
		if (createdRoleId) {
			await prisma.rolePermission.deleteMany({ where: { roleId: createdRoleId } });
			await prisma.role.deleteMany({ where: { id: createdRoleId } });
		}
		await prisma.auditLog.deleteMany({ where: { actorId: adminId } });
		await prisma.platformAdmin.deleteMany({ where: { email } });
		await app.close();
	});

	function auth(req: request.Test) {
		return req.set('Authorization', `Bearer ${accessToken}`);
	}

	it('GET /admin/permissions returns the admin.* catalog', async () => {
		const res = await auth(request(app.getHttpServer()).get('/admin/permissions')).expect(200);
		expect(res.body.some((p: { code: string }) => p.code === 'admin.report:view')).toBe(true);
	});

	it('GET /admin/roles returns seeded system roles', async () => {
		const res = await auth(request(app.getHttpServer()).get('/admin/roles')).expect(200);
		const codes = res.body.map((r: { code: string }) => r.code);
		expect(codes).toEqual(expect.arrayContaining(['SUPER_ADMIN', 'SUPPORT', 'BILLING']));
	});

	it('POST /admin/roles rejects unknown permissionIds with 400', async () => {
		await auth(request(app.getHttpServer()).post('/admin/roles')).send({
			code: `${roleCode}_BAD`,
			name: 'Bad Role',
			permissionIds: ['00000000-0000-4000-8000-000000000000'],
		}).expect(400);
	});

	it('POST /admin/roles creates a role with permissions (201)', async () => {
		const res = await auth(request(app.getHttpServer()).post('/admin/roles')).send({
			code: roleCode,
			name: 'E2E Role',
			permissionIds: [permAId],
		}).expect(201);
		createdRoleId = res.body.id;
		expect(res.body.code).toBe(roleCode);
		expect(res.body.permissions).toEqual(['admin.report:view']);

		const audit = await prisma.auditLog.findFirst({
			where: { action: AuditAction.ROLE_CREATE, actorId: adminId },
			orderBy: { createdAt: 'desc' },
		});
		expect(audit?.after).toEqual(
			expect.objectContaining({ code: roleCode }),
		);
	});

	it('POST /admin/roles rejects duplicate code with 409', async () => {
		await auth(request(app.getHttpServer()).post('/admin/roles')).send({
			code: roleCode,
			name: 'Dup',
		}).expect(409);
	});

	it('PATCH /admin/roles/:id adds+removes permissions and audits grant/revoke', async () => {
		const res = await auth(
			request(app.getHttpServer()).patch(`/admin/roles/${createdRoleId}`),
		).send({
			name: 'E2E Role Renamed',
			addPermissionIds: [permBId],
			removePermissionIds: [permAId],
		}).expect(200);
		expect(res.body.name).toBe('E2E Role Renamed');
		expect(res.body.permissions).toEqual(['admin.report:export']);

		const grant = await prisma.auditLog.findFirst({
			where: { action: AuditAction.ROLE_PERMISSION_GRANT, resourceId: createdRoleId },
		});
		const revoke = await prisma.auditLog.findFirst({
			where: { action: AuditAction.ROLE_PERMISSION_REVOKE, resourceId: createdRoleId },
		});
		expect(grant).not.toBeNull();
		expect(revoke).not.toBeNull();
	});

	it('DELETE /admin/roles/:id on a system role returns 400 SYSTEM_ROLE_PROTECTED', async () => {
		const support = await prisma.role.findFirst({
			where: { tenantId: null, code: 'SUPPORT' },
		});
		const res = await auth(
			request(app.getHttpServer()).delete(`/admin/roles/${support?.id}`),
		).expect(400);
		expect(res.body.reason ?? res.body.message?.reason).toBeDefined();
	});

	it('DELETE /admin/roles/:id deletes an unassigned role (204)', async () => {
		await auth(request(app.getHttpServer()).delete(`/admin/roles/${createdRoleId}`)).expect(204);
		const gone = await prisma.role.findUnique({ where: { id: createdRoleId } });
		expect(gone).toBeNull();
		createdRoleId = '';
	});

	it('rejects unauthenticated access with 401', async () => {
		await request(app.getHttpServer()).get('/admin/roles').expect(401);
	});
});
