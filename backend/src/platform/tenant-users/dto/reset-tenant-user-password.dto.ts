import { Exclude, Expose } from 'class-transformer';
import {
	IsBoolean,
	IsOptional,
	IsString,
	Length,
	Matches,
} from 'class-validator';

const PASSWORD_PATTERN =
	/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

/**
 * POST /admin/tenants/:tenantId/users/:userId/reset-password body. Same
 * discriminated union as create: exactly ONE of `{newPassword}` |
 * `{generatePassword:true}` (enforced 400 `PASSWORD_MODE_INVALID` in service).
 * Reset always forces `mustChangePassword=true`.
 */
@Exclude()
export class ResetTenantUserPasswordDto {
	@Expose()
	@IsOptional()
	@IsString()
	@Length(12, 128)
	@Matches(PASSWORD_PATTERN, {
		message:
			'password must be ≥12 chars and include letter, digit, and special character',
	})
	newPassword?: string;

	@Expose()
	@IsOptional()
	@IsBoolean()
	generatePassword?: boolean;
}
