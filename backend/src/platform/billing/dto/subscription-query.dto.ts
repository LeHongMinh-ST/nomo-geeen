import { Exclude, Expose, Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

@Exclude()
export class SubscriptionQueryDto {
	@Expose()
	@Type(() => Number)
	@IsOptional()
	@IsInt()
	@Min(1)
	page = 1;

	@Expose()
	@Type(() => Number)
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(100)
	pageSize = 20;
}
