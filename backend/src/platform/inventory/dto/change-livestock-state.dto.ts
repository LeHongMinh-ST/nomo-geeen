import { LivestockHealthState } from '@prisma/client';
import {
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	MaxLength,
	Min,
} from 'class-validator';

/** Allowed targets for first-slice HEALTHY → * transitions. */
const TARGET_STATES = [
	LivestockHealthState.QUARANTINED,
	LivestockHealthState.SICK,
	LivestockHealthState.DEAD,
	LivestockHealthState.REJECTED,
] as const;

export class ChangeLivestockStateDto {
	@IsIn([...TARGET_STATES], {
		message: `toState must be one of: ${TARGET_STATES.join(', ')}`,
	})
	toState!: LivestockHealthState;

	/** Expected ProductBatch.version for optimistic concurrency. */
	@IsInt()
	@Min(0)
	expectedVersion!: number;

	@IsOptional()
	@IsString()
	@MaxLength(128)
	reason?: string;

	@IsOptional()
	@IsString()
	@MaxLength(512)
	note?: string;
}
