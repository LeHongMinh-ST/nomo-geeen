import {
	mapTenantBankConfig,
	validateBankConfigInput,
} from './tenant-bank-config';

describe('tenant bank config', () => {
	it('maps only a complete config for payment use', () => {
		expect(
			mapTenantBankConfig({
				bankId: '970436',
				bankAccountNumber: '123',
				bankAccountName: 'NGUYEN VAN A',
				bankName: 'Vietcombank',
				bankShortName: 'VCB',
			}),
		).toEqual({
			bankId: '970436',
			bankName: 'Vietcombank',
			bankShortName: 'VCB',
			accountNumber: '123',
			accountName: 'NGUYEN VAN A',
		});
		expect(
			mapTenantBankConfig({
				bankId: '970436',
				bankAccountNumber: null,
				bankAccountName: 'A',
			}),
		).toBeNull();
	});

	it('rejects partial config and accepts clear', () => {
		expect(validateBankConfigInput({ bankId: '970436' })).toEqual({
			ok: false,
			message: 'bankAccountNumber is required when bank config is set',
		});
		expect(validateBankConfigInput({})).toEqual({
			ok: true,
			value: {
				bankId: null,
				bankName: null,
				bankShortName: null,
				bankAccountNumber: null,
				bankAccountName: null,
			},
		});
	});
});
