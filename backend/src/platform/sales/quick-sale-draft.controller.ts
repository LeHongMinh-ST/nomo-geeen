import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	MessageEvent,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Req,
	Sse,
	UnprocessableEntityException,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { RequireTenantPermission } from '../auth/decorators/require-tenant-permission.decorator';
import { TenantAccessTokenGuard } from '../auth/guards/tenant-access-token.guard';
import { TenantPermissionGuard } from '../auth/guards/tenant-permission.guard';
import type { TenantIdentity } from '../auth/token.service';
import { RequireFeature } from '../entitlements/entitlement.constants';
import { EntitlementsGuard } from '../entitlements/entitlements.guard';
import {
	AddQuickSaleDraftLineDto,
	CheckoutQuickSaleDraftDto,
	JoinQuickSaleDraftDto,
	PatchQuickSaleDraftDto,
	SetQuickSaleDraftLineQtyDto,
} from './dto/quick-sale-draft.dto';
import { QuickSaleDraftService } from './quick-sale-draft.service';
import { QuickSaleDraftEventsService } from './quick-sale-draft-events.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

const HEARTBEAT_MS = 25_000;

/**
 * Server-side QuickSale cart. Same auth tradeoff as notifications:
 * - Bearer-only access token in memory.
 * - SSE uses fetch() streaming (NOT EventSource).
 * - Stream is per-draft (not tenant-wide) — every joined device listens.
 */
@Controller('tenant/sales/quick-draft')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard)
export class QuickSaleDraftController {
	constructor(
		private readonly drafts: QuickSaleDraftService,
		private readonly events: QuickSaleDraftEventsService,
	) {}

	@Get('current')
	@RequireTenantPermission('sales:view')
	@RequireFeature('inventory')
	async getCurrent(@Req() req: TenantRequest) {
		return this.drafts.getCurrentForOwner(req.user.tenantId, req.user.id);
	}

	@Post()
	@HttpCode(201)
	@RequireTenantPermission('sales:create')
	@RequireFeature('inventory')
	async create(@Req() req: TenantRequest) {
		return this.drafts.createOrReactivate(
			req.user.tenantId,
			req.user.id,
			req.user.roleCode,
		);
	}

	@Post('join')
	@HttpCode(200)
	@RequireTenantPermission('sales:view')
	@RequireFeature('inventory')
	async join(@Req() req: TenantRequest, @Body() dto: JoinQuickSaleDraftDto) {
		try {
			const draft = await this.drafts.findByToken(
				req.user.tenantId,
				dto.joinToken,
			);
			if (!draft) {
				await this.drafts.auditJoin(
					req.user.tenantId,
					req.user.id,
					req.user.roleCode,
					dto.joinToken,
					'not-found',
					null,
				);
				return {
					error: {
						reason: 'DRAFT_NOT_FOUND',
						message: 'Token does not match any active draft in this tenant',
					},
				};
			}
			await this.drafts.auditJoin(
				req.user.tenantId,
				req.user.id,
				req.user.roleCode,
				dto.joinToken,
				'success',
				draft.id,
			);
			return draft;
		} catch (err) {
			if (
				err instanceof UnprocessableEntityException &&
				(err.getResponse() as { reason?: string }).reason === 'DRAFT_EXPIRED'
			) {
				await this.drafts.auditJoin(
					req.user.tenantId,
					req.user.id,
					req.user.roleCode,
					dto.joinToken,
					'expired',
					null,
				);
			}
			throw err;
		}
	}

	@Post(':id/lines')
	@HttpCode(200)
	@RequireTenantPermission('sales:create')
	@RequireFeature('inventory')
	async addLine(
		@Req() req: TenantRequest,
		@Param('id', new ParseUUIDPipe()) id: string,
		@Body() dto: AddQuickSaleDraftLineDto,
	) {
		return this.drafts.addOrMergeLine(
			req.user.tenantId,
			req.user.id,
			req.user.roleCode,
			id,
			dto,
		);
	}

	@Patch(':id')
	@HttpCode(200)
	@RequireTenantPermission('sales:edit')
	@RequireFeature('inventory')
	async patch(
		@Req() req: TenantRequest,
		@Param('id', new ParseUUIDPipe()) id: string,
		@Body() dto: PatchQuickSaleDraftDto,
	) {
		return this.drafts.patchCustomer(
			req.user.tenantId,
			req.user.id,
			req.user.roleCode,
			id,
			dto,
		);
	}

	@Patch(':id/lines/:productId')
	@HttpCode(200)
	@RequireTenantPermission('sales:edit')
	@RequireFeature('inventory')
	async setLineQuantity(
		@Req() req: TenantRequest,
		@Param('id', new ParseUUIDPipe()) id: string,
		@Param('productId', new ParseUUIDPipe()) productId: string,
		@Body() dto: SetQuickSaleDraftLineQtyDto,
	) {
		return this.drafts.setLineQuantity(
			req.user.tenantId,
			req.user.id,
			req.user.roleCode,
			id,
			productId,
			dto,
		);
	}

	@Delete(':id/lines/:productId')
	@HttpCode(200)
	@RequireTenantPermission('sales:edit')
	@RequireFeature('inventory')
	async removeLine(
		@Req() req: TenantRequest,
		@Param('id', new ParseUUIDPipe()) id: string,
		@Param('productId', new ParseUUIDPipe()) productId: string,
		@Body() body: { idempotencyKey: string },
	) {
		return this.drafts.removeLine(
			req.user.tenantId,
			req.user.id,
			req.user.roleCode,
			id,
			productId,
			body.idempotencyKey,
		);
	}

	@Post(':id/checkout')
	@HttpCode(200)
	@RequireTenantPermission('sales:create')
	@RequireFeature('inventory')
	async checkout(
		@Req() req: TenantRequest,
		@Param('id', new ParseUUIDPipe()) id: string,
		@Body() dto: CheckoutQuickSaleDraftDto,
	) {
		return this.drafts.checkout(
			req.user.tenantId,
			req.user.id,
			req.user.roleCode,
			id,
			dto,
		);
	}

	@Delete(':id')
	@HttpCode(200)
	@RequireTenantPermission('sales:edit')
	@RequireFeature('inventory')
	async close(
		@Req() req: TenantRequest,
		@Param('id', new ParseUUIDPipe()) id: string,
	) {
		return this.drafts.closeDraft(
			req.user.tenantId,
			req.user.id,
			req.user.roleCode,
			id,
		);
	}

	/**
	 * SSE stream. Same auth tradeoff as /tenant/notifications/stream:
	 * Bearer over fetch() (not EventSource). One stream per draft; both
	 * owner and joiners receive every change.
	 */
	@Sse(':id/stream')
	stream(
		@Req() req: TenantRequest,
		@Param('id', new ParseUUIDPipe()) id: string,
	): Observable<MessageEvent> {
		const tenantId = req.user.tenantId;
		return new Observable<MessageEvent>((observer) => {
			observer.next({
				data: { type: 'connected', at: new Date().toISOString(), draftId: id },
			});
			const unsubscribe = this.events.subscribe(tenantId, id, (event) => {
				observer.next({ data: event });
			});
			const heartbeat = setInterval(() => {
				observer.next({
					type: 'heartbeat',
					data: { type: 'heartbeat', at: new Date().toISOString() },
				});
			}, HEARTBEAT_MS);
			const cleanup = () => {
				clearInterval(heartbeat);
				unsubscribe();
			};
			req.on('close', () => {
				cleanup();
				observer.complete();
			});
			return () => {
				cleanup();
			};
		});
	}
}
