import { Transform } from 'class-transformer';
import {
	IsEmail,
	IsOptional,
	IsString,
	Length,
	Matches,
	MaxLength,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PASSWORD_PATTERN =
	/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;
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

export class TenantRegisterDto {
	@Transform(({ value }) => text(value))
	@IsString()
	@Length(1, 200)
	tenantName!: string;

	@Transform(({ value }) =>
		typeof value === 'string' ? value.trim().toLowerCase() : value,
	)
	@IsString()
	@Length(3, 63)
	@Matches(SLUG_PATTERN)
	slug!: string;

	@Transform(({ value }) => text(value))
	@IsString()
	@Length(1, 200)
	fullName!: string;

	@Transform(({ value }) => text(value))
	@IsString()
	@Length(1, 64)
	@Matches(/^\S+$/)
	username!: string;

	@IsOptional()
	@Transform(({ value }) => text(value))
	@IsEmail()
	@MaxLength(320)
	email?: string;

	@IsOptional()
	@Transform(({ value }) => text(value))
	@IsString()
	@MaxLength(32)
	phone?: string;

	@IsString()
	@Length(12, 128)
	@Matches(PASSWORD_PATTERN)
	password!: string;
}
