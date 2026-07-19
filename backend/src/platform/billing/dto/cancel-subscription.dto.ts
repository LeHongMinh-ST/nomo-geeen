import { Exclude, Expose, Transform } from 'class-transformer';
import {
	IsDateString,
	IsNotEmpty,
	IsString,
	Matches,
	MaxLength,
} from 'class-validator';

@Exclude()
export class CancelSubscriptionDto {
	@Expose()
	@IsString()
	@IsNotEmpty()
	@MaxLength(500)
	@Matches(/^[^\r\n]*$/u)
	@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
	reason!: string;

	@Expose()
	@IsDateString()
	expectedUpdatedAt!: string;
}
