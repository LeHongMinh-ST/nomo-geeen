import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

function toBoolean(value: unknown): boolean | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	if (typeof value === 'boolean') return value;
	if (value === 'true' || value === '1') return true;
	if (value === 'false' || value === '0') return false;
	return undefined;
}

export class NotificationQueryDto {
	@IsOptional()
	@Transform(({ value }) =>
		value === undefined || value === null || value === ''
			? undefined
			: Number(value),
	)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;

	@IsOptional()
	@Transform(({ value }) => toBoolean(value))
	@IsBoolean()
	unreadOnly?: boolean;
}
