import { Transform } from 'class-transformer';
import {
	IsEmail,
	IsOptional,
	IsString,
	Length,
	Matches,
	MaxLength,
	ValidateIf,
} from 'class-validator';

function text(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	return Array.from(value)
		.filter((character) => {
			const code = character.charCodeAt(0);
			return code > 31 && code !== 127;
		})
		.join('')
		.trim();
}

function optionalText(value: unknown): unknown {
	const normalized = text(value);
	return normalized === '' ? undefined : normalized;
}

function nullableText(value: unknown): unknown {
	if (value === null) return null;
	const normalized = text(value);
	if (normalized === '' || normalized === undefined) return null;
	return normalized;
}

export class UpdateTenantProfileDto {
	@Transform(({ value }) => text(value))
	@IsString()
	@Length(1, 200)
	fullName!: string;

	@IsOptional()
	@Transform(({ value }) => optionalText(value))
	@IsString()
	@MaxLength(32)
	phone?: string;

	@IsOptional()
	@Transform(({ value }) => optionalText(value))
	@IsEmail()
	@MaxLength(320)
	email?: string;

	@IsOptional()
	@Transform(({ value }) => text(value))
	@IsString()
	@MaxLength(500)
	address?: string;

	/** VietQR bank id/bin/code. Empty/null clears bank config with other bank fields. */
	@IsOptional()
	@Transform(({ value }) => nullableText(value))
	@ValidateIf((_, v) => v !== null && v !== undefined)
	@IsString()
	@Matches(/^[A-Za-z0-9]{2,20}$/, {
		message: 'bankId must be 2-20 alphanumeric characters',
	})
	bankId?: string | null;

	@IsOptional()
	@Transform(({ value }) => nullableText(value))
	@ValidateIf((_, v) => v !== null && v !== undefined)
	@IsString()
	@MaxLength(120)
	bankName?: string | null;

	@IsOptional()
	@Transform(({ value }) => nullableText(value))
	@ValidateIf((_, v) => v !== null && v !== undefined)
	@IsString()
	@MaxLength(60)
	bankShortName?: string | null;

	@IsOptional()
	@Transform(({ value }) => nullableText(value))
	@ValidateIf((_, v) => v !== null && v !== undefined)
	@IsString()
	@Matches(/^[A-Za-z0-9]{1,19}$/, {
		message: 'bankAccountNumber must be 1-19 alphanumeric characters',
	})
	bankAccountNumber?: string | null;

	@IsOptional()
	@Transform(({ value }) => nullableText(value))
	@ValidateIf((_, v) => v !== null && v !== undefined)
	@IsString()
	@MaxLength(100)
	bankAccountName?: string | null;
}
