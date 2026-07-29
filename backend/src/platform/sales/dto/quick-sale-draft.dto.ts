import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsArray,
	IsEnum,
	IsInt,
	IsNumber,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	Min,
	ValidateNested,
} from 'class-validator';
import { QuickSalePaymentMethod } from './create-quick-sale.dto';

export class AddQuickSaleDraftLineDto {
	@IsUUID('4')
	productId!: string;

	@IsUUID('4')
	unitId!: string;

	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(Number.MAX_SAFE_INTEGER)
	qty!: number;

	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	unitPrice!: number;

	@IsUUID('4')
	idempotencyKey!: string;
}

export class PatchQuickSaleDraftDto {
	/** Set or clear (null) the customer; only one field used at a time. */
	@IsOptional()
	@IsUUID('4')
	customerId?: string;

	@IsOptional()
	clearCustomer?: boolean;

	@IsUUID('4')
	idempotencyKey!: string;
}

export class SetQuickSaleDraftLineQtyDto {
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	qty!: number;

	@Type(() => Number)
	@IsOptional()
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	unitPrice?: number;

	@IsUUID('4')
	idempotencyKey!: string;
}

export class CheckoutQuickSaleDraftDto {
	@IsUUID('4')
	idempotencyKey!: string;

	@IsEnum(QuickSalePaymentMethod, {
		message: 'paymentMethod must be CASH, TRANSFER, QR or DEBT',
	})
	paymentMethod!: 'CASH' | 'TRANSFER' | 'QR' | 'DEBT';

	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	amountPaid!: number;

	@Type(() => Number)
	@IsOptional()
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	discountAmount?: number;
}

export class JoinQuickSaleDraftDto {
	@IsString()
	@Min(4)
	@Max(32)
	joinToken!: string;
}

export class QuickSaleDraftLineResponse {
	id!: string;
	productId!: string;
	productName!: string;
	unitId!: string;
	unitName!: string;
	qty!: number;
	unitPrice!: number;
	lineTotal!: number;
	addedByUserId!: string | null;
}

export class QuickSaleDraftResponse {
	id!: string;
	tenantId!: string;
	ownerUserId!: string;
	joinToken!: string;
	customerId!: string | null;
	warehouseId!: string | null;
	handbookMeta!: Record<string, unknown> | null;
	expiresAt!: string;
	lastTouchedAt!: string;
	closedAt!: string | null;
	createdAt!: string;
	updatedAt!: string;
	subtotal!: number;
	itemCount!: number;
	total!: number;
	lines!: QuickSaleDraftLineResponse[];
}

export type QuickSaleDraftApiErrorReason =
	| 'DRAFT_NOT_FOUND'
	| 'DRAFT_EXPIRED'
	| 'DRAFT_CLOSED'
	| 'INVALID_PRODUCT'
	| 'INVALID_UNIT'
	| 'INVALID_CUSTOMER'
	| 'IDEMPOTENCY_CONFLICT'
	| 'VALIDATION_ERROR'
	| 'CHECKOUT_FAILED';

export class QuickSaleDraftApiErrorBody {
	reason!: QuickSaleDraftApiErrorReason;
	message!: string;
}
