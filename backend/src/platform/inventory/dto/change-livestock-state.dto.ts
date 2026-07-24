import { LivestockHealthState } from '@prisma/client';
import {
	IsBoolean,
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	MaxLength,
	Min,
} from 'class-validator';

/** Allowed toState values; policy enforces legal edges (incl. recovery). */
const TARGET_STATES = [
	LivestockHealthState.HEALTHY,
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

	/**
	 * Required true for QUARANTINED|SICK → HEALTHY recovery.
	 * Ignored for HEALTHY outbound transitions.
	 */
	@IsOptional()
	@IsBoolean()
	approveRecovery?: boolean;

	@IsOptional()
	@IsString()
	@MaxLength(128)
	reason?: string;

	@IsOptional()
	@IsString()
	@MaxLength(512)
	note?: string;
}
