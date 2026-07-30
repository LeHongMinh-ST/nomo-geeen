import {
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { AdminIdentity } from '../auth/token.service';
import {
	type AdminNotificationListResult,
	AdminNotificationsService,
	type AdminNotificationView,
} from './admin-notifications.service';

interface AuthedRequest extends Request {
	user: AdminIdentity;
}

@Controller('admin/notifications')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AdminNotificationsController {
	constructor(private readonly service: AdminNotificationsService) {}

	@Get()
	@RequirePermission('admin.notification:view')
	list(
		@Req() req: AuthedRequest,
		@Query('limit') limit?: string,
		@Query('unreadOnly') unreadOnly?: string,
	): Promise<AdminNotificationListResult> {
		return this.service.list(req.user.id, {
			limit: limit ? parseInt(limit, 10) : undefined,
			unreadOnly: unreadOnly === 'true',
		});
	}

	@Get('unread-count')
	@RequirePermission('admin.notification:view')
	unreadCount(@Req() req: AuthedRequest): Promise<{ count: number }> {
		return this.service.unreadCount(req.user.id);
	}

	@Post(':id/read')
	@RequirePermission('admin.notification:view')
	markRead(
		@Req() req: AuthedRequest,
		@Param('id', new ParseUUIDPipe()) id: string,
	): Promise<AdminNotificationView> {
		return this.service.markRead(req.user.id, id);
	}

	@Post('read-all')
	@RequirePermission('admin.notification:view')
	markAllRead(
		@Req() req: AuthedRequest,
	): Promise<{ updated: number; unreadCount: number }> {
		return this.service.markAllRead(req.user.id);
	}
}
