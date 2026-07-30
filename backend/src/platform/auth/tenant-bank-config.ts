export type TenantBankSettingsRow = {
	bankId: string | null;
	bankName: string | null;
	bankShortName: string | null;
	bankAccountNumber: string | null;
	bankAccountName: string | null;
};

export type TenantBankConfig = {
	bankId: string;
	bankName: string;
	bankShortName: string;
	accountNumber: string;
	accountName: string;
};

export type TenantBankConfigInput = {
	bankId?: string | null;
	bankName?: string | null;
	bankShortName?: string | null;
	bankAccountNumber?: string | null;
	bankAccountName?: string | null;
};

const ACCOUNT_NUMBER_PATTERN = /^[A-Za-z0-9]{1,19}$/;
const BANK_ID_PATTERN = /^[A-Za-z0-9]{2,20}$/;

export function normalizeBankText(
	value: string | null | undefined,
): string | null {
	if (value == null) return null;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

export function isConfiguredBank(
	row: Partial<TenantBankSettingsRow> | null | undefined,
): row is TenantBankSettingsRow & {
	bankId: string;
	bankAccountNumber: string;
	bankAccountName: string;
} {
	return Boolean(
		row?.bankId?.trim() &&
			row.bankAccountNumber?.trim() &&
			row.bankAccountName?.trim(),
	);
}

export function mapTenantBankConfig(
	row: Partial<TenantBankSettingsRow> | null | undefined,
): TenantBankConfig | null {
	if (!isConfiguredBank(row)) return null;
	return {
		bankId: row.bankId.trim(),
		bankName: (row.bankName ?? row.bankShortName ?? row.bankId).trim(),
		bankShortName: (row.bankShortName ?? row.bankName ?? row.bankId).trim(),
		accountNumber: row.bankAccountNumber.trim(),
		accountName: row.bankAccountName.trim(),
	};
}

export function validateBankConfigInput(input: TenantBankConfigInput):
	| {
			ok: true;
			value: TenantBankSettingsRow;
	  }
	| {
			ok: false;
			message: string;
	  } {
	const bankId = normalizeBankText(input.bankId);
	const bankName = normalizeBankText(input.bankName);
	const bankShortName = normalizeBankText(input.bankShortName);
	const bankAccountNumber = normalizeBankText(input.bankAccountNumber);
	const bankAccountName = normalizeBankText(input.bankAccountName);

	const anyProvided = Boolean(
		bankId || bankName || bankShortName || bankAccountNumber || bankAccountName,
	);

	if (!anyProvided) {
		return {
			ok: true,
			value: {
				bankId: null,
				bankName: null,
				bankShortName: null,
				bankAccountNumber: null,
				bankAccountName: null,
			},
		};
	}

	if (!bankId) {
		return { ok: false, message: 'bankId is required when bank config is set' };
	}
	if (!BANK_ID_PATTERN.test(bankId)) {
		return {
			ok: false,
			message: 'bankId must be 2-20 alphanumeric characters (bin or code)',
		};
	}
	if (!bankAccountNumber) {
		return {
			ok: false,
			message: 'bankAccountNumber is required when bank config is set',
		};
	}
	if (!ACCOUNT_NUMBER_PATTERN.test(bankAccountNumber)) {
		return {
			ok: false,
			message: 'bankAccountNumber must be 1-19 alphanumeric characters',
		};
	}
	if (!bankAccountName) {
		return {
			ok: false,
			message: 'bankAccountName is required when bank config is set',
		};
	}
	if (bankAccountName.length > 100) {
		return {
			ok: false,
			message: 'bankAccountName must be at most 100 characters',
		};
	}
	if (bankName && bankName.length > 120) {
		return { ok: false, message: 'bankName must be at most 120 characters' };
	}
	if (bankShortName && bankShortName.length > 60) {
		return {
			ok: false,
			message: 'bankShortName must be at most 60 characters',
		};
	}

	return {
		ok: true,
		value: {
			bankId,
			bankName: bankName ?? bankShortName,
			bankShortName: bankShortName ?? bankName,
			bankAccountNumber,
			bankAccountName,
		},
	};
}
