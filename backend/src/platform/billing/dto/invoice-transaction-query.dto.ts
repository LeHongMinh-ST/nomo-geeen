import { InvoiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class InvoiceTransactionQueryDto {
	@IsOptional()
	@IsString()
	q?: string;

	@IsOptional()
	@IsEnum(InvoiceStatus)
	status?: InvoiceStatus;

	@IsOptional()
	@IsString()
	paymentStatus?: string;

	@IsOptional()
	@IsUUID('4')
	tenantId?: string;

	@IsOptional()
	@IsString()
	from?: string;

	@IsOptional()
	@IsString()
	to?: string;

	@IsOptional()
	@Type(() => Number)
	@Min(1)
	page?: number = 1;

	@IsOptional()
	@Type(() => Number)
	@Min(1)
	pageSize?: number = 20;
}
