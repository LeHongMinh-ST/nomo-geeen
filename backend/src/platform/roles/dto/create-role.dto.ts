import { Exclude, Expose, Type } from 'class-transformer';
import {
	ArrayUnique,
	IsArray,
	IsOptional,
	IsString,
	IsUUID,
	Length,
	Matches,
} from 'class-validator';

/**
 * R1-01 / R2.1 DTO. F-16: `tenantId` is `@Exclude()`d so any value sent in the
 * body is stripped before reaching the service. The service hard-codes
 * `tenantId: null, isAdmin: true` in the Prisma create call — never trust DTO.
 */
@Exclude()
export class CreateRoleDto {
	@Expose()
	@IsString()
	@Length(2, 64)
	@Matches(/^[A-Z][A-Z0-9_]*$/, {
		message: 'code must be UPPER_SNAKE_CASE (e.g. SUPER_ADMIN)',
	})
	code!: string;

	@Expose()
	@IsString()
	@Length(2, 128)
	name!: string;

	@Expose()
	@IsArray()
	@ArrayUnique()
	@IsUUID('4', { each: true })
	@Type(() => String)
	@IsOptional()
	permissionIds?: string[];
}