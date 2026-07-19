import { ForbiddenException } from '@nestjs/common';
import type { EntitlementDenial } from './entitlement.constants';

export class EntitlementDenialException extends ForbiddenException {
	readonly denial: EntitlementDenial;

	constructor(denial: EntitlementDenial) {
		super(denial);
		this.denial = denial;
	}
}
