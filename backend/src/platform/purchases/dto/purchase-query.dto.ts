import { PurchaseStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	Min,
} from 'class-validator';
export class PurchaseQueryDto {
	@IsOptional() @IsString() search?: string;
	@IsOptional() @IsEnum(PurchaseStatus) status?: PurchaseStatus;
	@IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
	@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) pageSize = 20;
}
export class CompletePurchaseDto {
	@IsUUID('4') idempotencyKey!: string;
}
