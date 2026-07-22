import { BusinessGroup } from '@prisma/client';
import { IsArray, IsEnum } from 'class-validator';

export class UpdateBusinessGroupsDto {
	@IsArray()
	@IsEnum(BusinessGroup, { each: true })
	enabledGroups!: BusinessGroup[];
}
