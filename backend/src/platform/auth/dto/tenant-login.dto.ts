import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class TenantLoginDto {
	@IsString()
	@IsNotEmpty()
	tenantSlug!: string;

	@IsString()
	@IsNotEmpty()
	identifier!: string;

	@IsString()
	@MinLength(8)
	password!: string;
}
