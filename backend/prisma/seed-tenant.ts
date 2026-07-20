// Seed cua hang + owner de TEST dang nhap tenant-side.
// Chay: pnpm db:seed:tenant   (yeu cau da chay `pnpm db:seed` truoc de co system roles + permissions)
//
// Idempotent: neu slug da ton tai thi bo qua, khong ghi de. Tao trong 1 transaction
// theo dung invariant cua TenantsService.provision: tenant -> 3 role per-tenant
// (OWNER/MANAGER/STAFF, grants clone tu system role template tenantId=null) -> OWNER user.
// Argon2id khop PasswordService (src/platform/auth/password.service.ts).

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

process.loadEnvFile?.('.env');

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ARGON2_OPTS: argon2.Options = {
	type: argon2.argon2id,
	memoryCost: 65536,
	timeCost: 3,
	parallelism: 2,
};

// Cua hang test. Doi qua env neu muon: SEED_TENANT_SLUG, SEED_OWNER_USERNAME, SEED_OWNER_PASSWORD...
const TENANT = {
	slug: process.env.SEED_TENANT_SLUG ?? 'nong-xanh',
	name: process.env.SEED_TENANT_NAME ?? 'Cửa hàng Nông Xanh',
	tenantType: 'HOUSEHOLD' as const,
	mode: 'SIMPLE' as const,
};

const OWNER = {
	username: process.env.SEED_OWNER_USERNAME ?? 'chutam',
	fullName: process.env.SEED_OWNER_FULLNAME ?? 'Anh Tâm',
	email: process.env.SEED_OWNER_EMAIL ?? 'chutam@nongxanh.vn',
	phone: process.env.SEED_OWNER_PHONE ?? '0909123456',
	// >=12 ky tu, co chu + so + ky tu dac biet (PASSWORD_PATTERN trong tenant-register.dto.ts)
	password: process.env.SEED_OWNER_PASSWORD ?? 'NongXanh@2026',
};

const PER_TENANT_ROLES = [
	{ code: 'OWNER', name: 'Chủ cửa hàng', rank: 1 },
	{ code: 'MANAGER', name: 'Quản lý', rank: 2 },
	{ code: 'STAFF', name: 'Nhân viên', rank: 3 },
] as const;

async function main() {
	const existing = await prisma.tenant.findUnique({
		where: { slug: TENANT.slug },
		select: { id: true },
	});
	if (existing) {
		console.log(
			`Tenant "${TENANT.slug}" da ton tai, bo qua (idempotent). Owner: ${OWNER.username}`,
		);
		return;
	}

	// System role templates (tenantId=null) + grants — nap ngoai transaction (seed data tinh).
	const templates = await prisma.role.findMany({
		where: {
			tenantId: null,
			code: { in: PER_TENANT_ROLES.map((r) => r.code) },
		},
		select: { code: true, permissions: { select: { permissionId: true } } },
	});
	const grantsByCode = new Map(
		templates.map((t) => [t.code, t.permissions.map((p) => p.permissionId)]),
	);
	if (grantsByCode.size < PER_TENANT_ROLES.length) {
		throw new Error(
			'Thieu system role template (OWNER/MANAGER/STAFF). Chay `pnpm db:seed` truoc.',
		);
	}

	const passwordHash = await argon2.hash(OWNER.password, ARGON2_OPTS);

	await prisma.$transaction(async (tx) => {
		const tenant = await tx.tenant.create({
			data: {
				slug: TENANT.slug,
				name: TENANT.name,
				tenantType: TENANT.tenantType,
				mode: TENANT.mode,
				status: 'ACTIVE',
				seatBonus: 10,
			},
			select: { id: true },
		});

		const roleIdByCode = new Map<string, string>();
		for (const spec of PER_TENANT_ROLES) {
			const role = await tx.role.create({
				data: {
					tenantId: tenant.id,
					code: spec.code,
					name: spec.name,
					isSystem: false,
					isAdmin: false,
					rank: spec.rank,
				},
				select: { id: true },
			});
			roleIdByCode.set(spec.code, role.id);
			const grants = grantsByCode.get(spec.code) ?? [];
			if (grants.length > 0) {
				await tx.rolePermission.createMany({
					data: grants.map((permissionId) => ({
						roleId: role.id,
						permissionId,
					})),
					skipDuplicates: true,
				});
			}
		}

		const ownerRoleId = roleIdByCode.get('OWNER');
		if (!ownerRoleId) throw new Error('OWNER role not seeded');

		await tx.user.create({
			data: {
				tenantId: tenant.id,
				username: OWNER.username,
				email: OWNER.email,
				phone: OWNER.phone,
				passwordHash,
				mustChangePassword: false,
				fullName: OWNER.fullName,
				roleId: ownerRoleId,
				status: 'ACTIVE',
				createdByType: 'USER',
			},
		});
	});

	console.log('Seed tenant test xong:');
	console.log(`  Cua hang : ${TENANT.name} (slug: ${TENANT.slug})`);
	console.log(`  Owner    : ${OWNER.username} / ${OWNER.password}`);
	console.log(`  Dang nhap: identifier=${OWNER.username} (hoac email/phone)`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
