import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TenantMode, TenantStatus, TenantType } from '@prisma/client';
import { TenantQueryDto } from './tenant-query.dto';
import { TenantStatusTransitionDto } from './tenant-status-transition.dto';
import { UpdateTenantDto } from './update-tenant.dto';

describe('TenantQueryDto', () => {
	const run = async (plain: Record<string, unknown>) => {
		const dto = plainToInstance(TenantQueryDto, plain);
		return { dto, errors: await validate(dto) };
	};

	it('accepts defaults and valid filters', async () => {
		const { dto, errors } = await run({});
		expect(errors).toHaveLength(0);
		expect(dto.page).toBe(1);
		expect(dto.pageSize).toBe(20);
	});

	it('rejects pageSize outside 1..100', async () => {
		const zero = await run({ pageSize: 0 });
		expect(zero.errors.length).toBeGreaterThan(0);
		const over = await run({ pageSize: 101 });
		expect(over.errors.length).toBeGreaterThan(0);
	});

	it('rejects q longer than 100 chars', async () => {
		const { errors } = await run({ q: 'x'.repeat(101) });
		expect(errors.length).toBeGreaterThan(0);
	});

	it('rejects invalid status enum', async () => {
		const { errors } = await run({ status: 'DELETED' });
		expect(errors.length).toBeGreaterThan(0);
	});

	it('trims q', async () => {
		const { dto, errors } = await run({ q: '  acme  ' });
		expect(errors).toHaveLength(0);
		expect(dto.q).toBe('acme');
	});
});

describe('TenantStatusTransitionDto', () => {
	const run = async (plain: Record<string, unknown>) => {
		const dto = plainToInstance(TenantStatusTransitionDto, plain);
		return { dto, errors: await validate(dto) };
	};

	it('accepts valid status + reason', async () => {
		const { errors } = await run({
			status: TenantStatus.SUSPENDED,
			reason: 'policy',
		});
		expect(errors).toHaveLength(0);
	});

	it('rejects reason longer than 500', async () => {
		const { errors } = await run({
			status: TenantStatus.LOCKED,
			reason: 'r'.repeat(501),
		});
		expect(errors.length).toBeGreaterThan(0);
	});

	it('strips CRLF from reason', async () => {
		const { dto, errors } = await run({
			status: TenantStatus.ACTIVE,
			reason: 'line1\r\nline2',
		});
		expect(errors).toHaveLength(0);
		expect(dto.reason).toBe('line1 line2');
	});
});

describe('UpdateTenantDto', () => {
	const run = async (plain: Record<string, unknown>) => {
		const dto = plainToInstance(UpdateTenantDto, plain);
		return { dto, errors: await validate(dto) };
	};

	const base = {
		expectedUpdatedAt: '2026-07-18T00:00:00.000Z',
	};

	it('requires expectedUpdatedAt', async () => {
		const { errors } = await run({ name: 'Acme' });
		expect(errors.some((e) => e.property === 'expectedUpdatedAt')).toBe(true);
	});

	it('rejects blank name', async () => {
		const { errors } = await run({ ...base, name: '' });
		expect(errors.some((e) => e.property === 'name')).toBe(true);
	});

	it('rejects non-HTTPS logoUrl', async () => {
		const { errors } = await run({
			...base,
			logoUrl: 'http://cdn.example.com/a.png',
		});
		expect(errors.some((e) => e.property === 'logoUrl')).toBe(true);
	});

	it('rejects javascript: logoUrl', async () => {
		const { errors } = await run({
			...base,
			logoUrl: 'javascript:alert(1)',
		});
		expect(errors.some((e) => e.property === 'logoUrl')).toBe(true);
	});

	it('accepts HTTPS logoUrl and enums', async () => {
		const { errors } = await run({
			...base,
			name: 'Store',
			tenantType: TenantType.RETAIL_DEALER,
			mode: TenantMode.SIMPLE,
			logoUrl: 'https://cdn.example.com/logo.png',
		});
		expect(errors).toHaveLength(0);
	});

	it('rejects private-host logoUrl after transform', async () => {
		const { errors } = await run({
			...base,
			logoUrl: 'https://127.0.0.1/secret.png',
		});
		// Transform rewrites private hosts to sentinel → IsUrl fails
		expect(errors.some((e) => e.property === 'logoUrl')).toBe(true);
	});
});
