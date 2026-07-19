import { Exclude, Expose } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

@Exclude()
export class ResetPasswordDto {
	@Expose()
	@IsString()
	@Length(12, 128)
	@Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/, {
		message:
			'password must be ≥12 chars and include letter, digit, and special character',
	})
	newPassword!: string;
}