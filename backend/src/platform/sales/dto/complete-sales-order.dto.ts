import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min, Max } from 'class-validator';
import { SalesOrderPaymentMethod } from './create-sales-order.dto';

export class CompleteSalesOrderDto {
	@IsEnum(SalesOrderPaymentMethod) paymentMethod!: SalesOrderPaymentMethod;
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	amountPaid = 0;
}
