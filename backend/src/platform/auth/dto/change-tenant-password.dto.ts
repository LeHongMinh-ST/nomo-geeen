import { IsString, Length, Matches } from 'class-validator';

const PASSWORD_PATTERN =
	/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

export class ChangeTenantPasswordDto {
	@IsString()
	@Length(1, 128)
	currentPassword!: string;

	@IsString()
	@Length(12, 128)
	@Matches(PASSWORD_PATTERN)
	newPassword!: string;
}
