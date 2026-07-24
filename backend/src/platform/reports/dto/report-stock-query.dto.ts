import { BusinessGroup } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ReportStockQueryDto {
	@IsOptional()
	@IsEnum(BusinessGroup)
	businessGroup?: BusinessGroup;
}
