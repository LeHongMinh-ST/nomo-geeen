import {
	Controller,
	Get,
	MessageEvent,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
	Req,
	Sse,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { TenantAccessTokenGuard } from '../auth/guards/tenant-access-token.guard';
import { TenantPermissionGuard } from '../auth/guards/tenant-permission.guard';
import type { TenantIdentity } from '../auth/token.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationEventsService } from './notification-events.service';
import { NotificationProducerService } from './notification-producer.service';
import { NotificationsService } from './notifications.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

const HEARTBEAT_MS = 25_000;

/**
 * In-app notifications for the signed-in tenant user.
 * No feature entitlement — every authenticated tenant user can read own inbox.
 * Permission metadata intentionally empty so TenantPermissionGuard only checks identity.
 *
 * Auth tradeoff for SSE:
 * - Access tokens live in Authorization Bearer (memory), not cookies.
 * - Browser EventSource cannot set Authorization → would force token-in-query (leaks in logs).
 * - Chosen: GET /stream as text/event-stream over fetch() with Bearer (same as other tenant APIs).
 * - Cookie-only SSE would need a second auth path; deferred unless browsers force it.
 */
@Controller('tenant/notifications')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard)
export class NotificationsController {
	constructor(
		private readonly notifications: NotificationsService,
		private readonly producer: NotificationProducerService,
		private readonly events: NotificationEventsService,
	) {}

	@Get()
	list(@Req() req: TenantRequest, @Query() query: NotificationQueryDto) {
		return this.notifications.list(req.user.tenantId, req.user.id, query);
	}

	@Get('unread-count')
	unreadCount(@Req() req: TenantRequest) {
		return this.notifications.unreadCount(req.user.tenantId, req.user.id);
	}

	/**
	 * Server-Sent Events stream for live inbox hints.
	 * Reconnect-safe: clients re-fetch list/unread-count after connect; this stream is not a backlog.
	 */
	@Sse('stream')
	stream(@Req() req: TenantRequest): Observable<MessageEvent> {
		const tenantId = req.user.tenantId;
		const userId = req.user.id;

		return new Observable<MessageEvent>((observer) => {
			const at = () => new Date().toISOString();
			observer.next({
				data: { type: 'connected', at: at() },
			});

			const unsubscribe = this.events.subscribe(tenantId, userId, (event) => {
				observer.next({
					data: {
						type: event.type,
						action: event.action,
						notificationId: event.notificationId,
						audience: event.userId ? 'USER' : 'TENANT',
						at: event.at,
					},
				});
			});

			const heartbeat = setInterval(() => {
				observer.next({
					type: 'heartbeat',
					data: { type: 'heartbeat', at: at() },
				});
			}, HEARTBEAT_MS);

			const cleanup = () => {
				clearInterval(heartbeat);
				unsubscribe();
			};

			// Client disconnect (browser tab close / abort fetch).
			req.on('close', () => {
				cleanup();
				observer.complete();
			});

			return () => {
				cleanup();
			};
		});
	}

	/** Run debt/low-stock/near-expiry producers (idempotent digests). */
	@Post('sync')
	sync(@Req() req: TenantRequest) {
		return this.producer.syncTenant(req.user.tenantId);
	}

	@Post('read-all')
	markAllRead(@Req() req: TenantRequest) {
		return this.notifications.markAllRead(req.user.tenantId, req.user.id);
	}

	@Post(':id/read')
	markRead(
		@Req() req: TenantRequest,
		@Param('id', new ParseUUIDPipe()) id: string,
	) {
		return this.notifications.markRead(req.user.tenantId, req.user.id, id);
	}
}
