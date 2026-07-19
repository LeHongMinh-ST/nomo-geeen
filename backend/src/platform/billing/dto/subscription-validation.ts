import { BadRequestException } from '@nestjs/common';

export const trimManualValue = (
	value: string | null | undefined,
): string | null => {
	if (value === undefined || value === null) return null;
	if (/[\r\n]/u.test(value)) {
		throw new BadRequestException({
			reason: 'INVALID_MANUAL_TEXT',
			message: 'manualReference and reason must not contain CR/LF',
		});
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
};
