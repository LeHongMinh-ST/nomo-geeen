import { BusinessGroup } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export class ReportDateQueryDto {
	@IsOptional()
	@IsISO8601()
	from?: string;

	@IsOptional()
	@IsISO8601()
	to?: string;

	@IsOptional()
	@IsEnum(BusinessGroup)
	businessGroup?: BusinessGroup;
}
