import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

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

export class UpdateTenantProfileDto {
	@Transform(({ value }) => text(value))
	@IsString()
	@Length(1, 200)
	fullName!: string;

	@IsOptional()
	@Transform(({ value }) => {
		const normalized = text(value);
		return normalized === '' ? undefined : normalized;
	})
	@IsString()
	@MaxLength(32)
	phone?: string;

	@IsOptional()
	@Transform(({ value }) => {
		const normalized = text(value);
		return normalized === '' ? undefined : normalized;
	})
	@IsEmail()
	@MaxLength(320)
	email?: string;

	@IsOptional()
	@Transform(({ value }) => text(value))
	@IsString()
	@MaxLength(500)
	address?: string;
}
