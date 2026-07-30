import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
	BillingService,
	type InvoiceTransactionResponse,
	type ListInvoiceTransactionsResult,
} from './billing.service';
import { InvoiceTransactionQueryDto } from './dto/invoice-transaction-query.dto';

@Controller('admin/transactions')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class TransactionsController {
	constructor(private readonly service: BillingService) {}

	@Get()
	@RequirePermission('admin.billing:view')
	list(
		@Query() query: InvoiceTransactionQueryDto,
	): Promise<ListInvoiceTransactionsResult> {
		return this.service.listInvoiceTransactions(query);
	}
}
