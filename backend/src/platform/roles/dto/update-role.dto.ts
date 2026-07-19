import { Exclude, Expose, Type } from 'class-transformer';
import {
	ArrayUnique,
	IsArray,
	IsOptional,
	IsString,
	IsUUID,
	Length,
} from 'class-validator';

/**
 * R1-01 / R2.3 DTO. Same F-16 discipline as CreateRoleDto: code, tenantId,
 * isAdmin, isSystem are excluded so caller cannot mutate them via PATCH.
 */
@Exclude()
export class UpdateRoleDto {
	@Expose()
	@IsString()
	@Length(2, 128)
	@IsOptional()
	name?: string;

	@Expose()
	@IsArray()
	@ArrayUnique()
	@IsUUID('4', { each: true })
	@Type(() => String)
	@IsOptional()
	addPermissionIds?: string[];

	@Expose()
	@IsArray()
	@ArrayUnique()
	@IsUUID('4', { each: true })
	@Type(() => String)
	@IsOptional()
	removePermissionIds?: string[];
}