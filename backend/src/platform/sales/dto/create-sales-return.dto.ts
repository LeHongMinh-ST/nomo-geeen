import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSalesReturnDto {
	@IsOptional()
	@IsString()
	@MaxLength(500)
	note?: string;
}
