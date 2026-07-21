import { Type } from 'class-transformer';
import {
	IsEmail,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Max,
	Min,
} from 'class-validator';

export enum SupplierStatusInput {
	ACTIVE = 'ACTIVE',
	INACTIVE = 'INACTIVE',
}

export class SupplierQueryDto {
	@IsOptional() @IsString() search?: string;
	@IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
	@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) pageSize = 20;
}

export class CreateSupplierDto {
	@IsString() @IsNotEmpty() code!: string;
	@IsString() @IsNotEmpty() name!: string;
	@IsOptional() @IsString() supplierType?: string;
	@IsOptional() @IsString() contactName?: string;
	@IsOptional() @IsString() phone?: string;
	@IsOptional() @IsEmail() email?: string;
	@IsOptional() @IsString() address?: string;
	@IsOptional() @IsString() taxCode?: string;
}

export class UpdateSupplierDto {
	@IsOptional() @IsString() @IsNotEmpty() code?: string;
	@IsOptional() @IsString() @IsNotEmpty() name?: string;
	@IsOptional() @IsString() supplierType?: string;
	@IsOptional() @IsString() contactName?: string;
	@IsOptional() @IsString() phone?: string;
	@IsOptional() @IsEmail() email?: string;
	@IsOptional() @IsString() address?: string;
	@IsOptional() @IsString() taxCode?: string;
	@IsOptional() @IsEnum(SupplierStatusInput) status?: SupplierStatusInput;
}
