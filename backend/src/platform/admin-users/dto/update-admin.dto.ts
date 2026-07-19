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
 * R3.4 DTO. F-24: `email` and `status` are `@Exclude()`d so they cannot be
 * updated via this endpoint (status via deactivate/reactivate; email is
 * immutable from admin API). Other admin-mutable fields pass through.
 */
@Exclude()
export class UpdateAdminDto {
	@Expose()
	@IsString()
	@Length(1, 128)
	@IsOptional()
	fullName?: string;

	@Expose()
	@IsArray()
	@ArrayUnique()
	@IsUUID('4', { each: true })
	@Type(() => String)
	@IsOptional()
	roleIds?: string[];
}