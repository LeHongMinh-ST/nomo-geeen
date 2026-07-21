import { Type } from 'class-transformer';
import {
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Max,
	Min,
} from 'class-validator';

export enum CustomerTypeInput {
	RETAIL = 'RETAIL',
	FARMER = 'FARMER',
	FARM = 'FARM',
	AGENT = 'AGENT',
}

export class CustomerQueryDto {
	@IsOptional() @IsString() search?: string;
	@IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
	@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) pageSize = 20;
}

export class CreateCustomerDto {
	@IsString() @IsNotEmpty() name!: string;
	@IsOptional() @IsString() phone?: string;
	@IsOptional() @IsString() code?: string;
	@IsOptional() @IsString() address?: string;
	@IsOptional() @IsString() note?: string;
	@IsOptional() @IsEnum(CustomerTypeInput) type?: CustomerTypeInput;
}

export class UpdateCustomerDto {
	@IsOptional() @IsString() @IsNotEmpty() name?: string;
	@IsOptional() @IsString() phone?: string;
	@IsOptional() @IsString() code?: string;
	@IsOptional() @IsString() address?: string;
	@IsOptional() @IsString() note?: string;
	@IsOptional() @IsEnum(CustomerTypeInput) type?: CustomerTypeInput;
}
