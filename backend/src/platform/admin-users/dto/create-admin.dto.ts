import { Exclude, Expose, Type } from 'class-transformer';
import {
	ArrayMinSize,
	ArrayUnique,
	IsArray,
	IsEmail,
	IsOptional,
	IsString,
	IsUUID,
	Length,
	Matches,
} from 'class-validator';

/**
 * R3.1 DTO. F-24: no `tenantId` / `isAdmin` etc. can sneak in. Password policy
 * (NFR-2): min 12 chars, ≥1 letter, ≥1 digit, ≥1 special.
 */
@Exclude()
export class CreateAdminDto {
	@Expose()
	@IsEmail()
	email!: string;

	@Expose()
	@IsString()
	@Length(12, 128)
	@Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/, {
		message:
			'password must be ≥12 chars and include letter, digit, and special character',
	})
	password!: string;

	@Expose()
	@IsString()
	@Length(1, 128)
	fullName!: string;

	@Expose()
	@IsArray()
	@ArrayUnique()
	@IsUUID('4', { each: true })
	@Type(() => String)
	@ArrayMinSize(1)
	roleIds!: string[];
}