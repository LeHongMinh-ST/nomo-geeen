import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationView = {
	id: string;
	type: NotificationType;
	title: string;
	body: string | null;
	/** Per-viewer read timestamp — never a shared tenant-wide flag. */
	readAt: string | null;
	createdAt: string;
	audience: 'USER' | 'TENANT';
};

export type NotificationListResult = {
	items: NotificationView[];
	unreadCount: number;
};

export type CreateNotificationInput = {
	tenantId: string;
	userId?: string | null;
	type?: NotificationType;
	title: string;
	body?: string | null;
};

type NotificationWithReads = {
	id: string;
	tenantId: string;
	userId: string | null;
	type: NotificationType;
	title: string;
	body: string | null;
	createdAt: Date;
	reads: Array<{ readAt: Date }>;
};

/**
 * In-app notifications for tenant users.
 * Visibility: same tenant and (user-targeted OR tenant-wide null userId).
 * Read state is per-user via NotificationRead — tenant-wide rows do not share readAt.
 */
@Injectable()
export class NotificationsService {
	constructor(private readonly prisma: PrismaService) {}

	async list(
		tenantId: string,
		userId: string,
		query: { limit?: number; unreadOnly?: boolean } = {},
	): Promise<NotificationListResult> {
		const limit = Math.min(Math.max(query.limit ?? 30, 1), 100);
		const where = this.visibleWhere(
			tenantId,
			userId,
			query.unreadOnly === true,
		);
		const [rows, unreadCount] = await Promise.all([
			this.prisma.notification.findMany({
				where,
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				take: limit,
				include: {
					reads: {
						where: { userId },
						select: { readAt: true },
						take: 1,
					},
				},
			}),
			this.countUnread(tenantId, userId),
		]);
		return {
			items: rows.map((row) => this.toView(row as NotificationWithReads)),
			unreadCount,
		};
	}

	async unreadCount(
		tenantId: string,
		userId: string,
	): Promise<{ count: number }> {
		return { count: await this.countUnread(tenantId, userId) };
	}

	async markRead(
		tenantId: string,
		userId: string,
		notificationId: string,
	): Promise<NotificationView> {
		const existing = await this.prisma.notification.findFirst({
			where: {
				id: notificationId,
				...this.visibleWhere(tenantId, userId),
			},
			include: {
				reads: {
					where: { userId },
					select: { readAt: true },
					take: 1,
				},
			},
		});
		if (!existing) {
			throw new NotFoundException('Notification not found');
		}
		const current = existing as NotificationWithReads;
		if (current.reads[0]?.readAt) {
			return this.toView(current);
		}
		const readAt = new Date();
		await this.prisma.notificationRead.upsert({
			where: {
				notificationId_userId: {
					notificationId: existing.id,
					userId,
				},
			},
			create: {
				tenantId,
				notificationId: existing.id,
				userId,
				readAt,
			},
			update: {},
		});
		return this.toView({
			...current,
			reads: [{ readAt }],
		});
	}

	async markAllRead(
		tenantId: string,
		userId: string,
	): Promise<{ updated: number; unreadCount: number }> {
		const unread = await this.prisma.notification.findMany({
			where: this.visibleWhere(tenantId, userId, true),
			select: { id: true },
		});
		if (unread.length === 0) {
			return { updated: 0, unreadCount: 0 };
		}
		const readAt = new Date();
		const result = await this.prisma.notificationRead.createMany({
			data: unread.map((row) => ({
				tenantId,
				notificationId: row.id,
				userId,
				readAt,
			})),
			skipDuplicates: true,
		});
		return {
			updated: result.count,
			unreadCount: 0,
		};
	}

	/** Producer helper for seed/jobs — not exposed as public HTTP create. */
	async create(input: CreateNotificationInput): Promise<NotificationView> {
		const row = await this.prisma.notification.create({
			data: {
				tenantId: input.tenantId,
				userId: input.userId ?? null,
				type: input.type ?? NotificationType.SYSTEM,
				title: input.title,
				body: input.body ?? null,
			},
		});
		return this.toView({ ...row, reads: [] });
	}

	private async countUnread(tenantId: string, userId: string): Promise<number> {
		return this.prisma.notification.count({
			where: this.visibleWhere(tenantId, userId, true),
		});
	}

	private visibleWhere(
		tenantId: string,
		userId: string,
		unreadOnly = false,
	): Prisma.NotificationWhereInput {
		return {
			tenantId,
			OR: [{ userId: null }, { userId }],
			...(unreadOnly
				? {
						reads: {
							none: { userId },
						},
					}
				: {}),
		};
	}

	private toView(row: NotificationWithReads): NotificationView {
		const readAt = row.reads[0]?.readAt ?? null;
		return {
			id: row.id,
			type: row.type,
			title: row.title,
			body: row.body,
			readAt: readAt ? readAt.toISOString() : null,
			createdAt: row.createdAt.toISOString(),
			audience: row.userId ? 'USER' : 'TENANT',
		};
	}
}
