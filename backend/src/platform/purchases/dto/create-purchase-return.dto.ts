import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePurchaseReturnDto {
	@IsOptional()
	@IsString()
	@MaxLength(500)
	note?: string;
}
