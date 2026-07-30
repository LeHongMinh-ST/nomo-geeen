import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AdminNotificationView = {
	id: string;
	type: string;
	title: string;
	body: string | null;
	readAt: string | null;
	createdAt: string;
};

export type AdminNotificationListResult = {
	items: AdminNotificationView[];
	unreadCount: number;
};

type AdminNotificationWithReads = {
	id: string;
	type: string;
	title: string;
	body: string | null;
	createdAt: Date;
	reads: Array<{ readAt: Date }>;
};

@Injectable()
export class AdminNotificationsService {
	constructor(private readonly prisma: PrismaService) {}

	async list(
		adminId: string,
		query: { limit?: number; unreadOnly?: boolean } = {},
	): Promise<AdminNotificationListResult> {
		const limit = Math.min(Math.max(query.limit ?? 30, 1), 100);
		const where = this.visibleWhere(adminId, query.unreadOnly === true);
		const [rows, unreadCount] = await Promise.all([
			this.prisma.adminNotification.findMany({
				where,
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				take: limit,
				include: {
					reads: {
						where: { adminId },
						select: { readAt: true },
						take: 1,
					},
				},
			}),
			this.countUnread(adminId),
		]);
		return {
			items: rows.map((row) => this.toView(row as AdminNotificationWithReads)),
			unreadCount,
		};
	}

	async unreadCount(adminId: string): Promise<{ count: number }> {
		return { count: await this.countUnread(adminId) };
	}

	async markRead(
		adminId: string,
		notificationId: string,
	): Promise<AdminNotificationView> {
		const existing = await this.prisma.adminNotification.findFirst({
			where: { id: notificationId },
			include: {
				reads: {
					where: { adminId },
					select: { readAt: true },
					take: 1,
				},
			},
		});
		if (!existing) {
			throw new Error('Notification not found');
		}
		const current = existing as AdminNotificationWithReads;
		if (current.reads[0]?.readAt) {
			return this.toView(current);
		}
		const readAt = new Date();
		await this.prisma.adminNotificationRead.upsert({
			where: {
				notificationId_adminId: {
					notificationId: existing.id,
					adminId,
				},
			},
			create: {
				notificationId: existing.id,
				adminId,
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
		adminId: string,
	): Promise<{ updated: number; unreadCount: number }> {
		const unread = await this.prisma.adminNotification.findMany({
			where: this.visibleWhere(adminId, true),
			select: { id: true },
		});
		if (unread.length === 0) {
			return { updated: 0, unreadCount: 0 };
		}
		const readAt = new Date();
		const result = await this.prisma.adminNotificationRead.createMany({
			data: unread.map((row) => ({
				notificationId: row.id,
				adminId,
				readAt,
			})),
			skipDuplicates: true,
		});
		return {
			updated: result.count,
			unreadCount: 0,
		};
	}

	private async countUnread(adminId: string): Promise<number> {
		return this.prisma.adminNotification.count({
			where: this.visibleWhere(adminId, true),
		});
	}

	private visibleWhere(adminId: string, unreadOnly = false) {
		return {
			...(unreadOnly
				? {
						reads: {
							none: { adminId },
						},
					}
				: {}),
		};
	}

	private toView(row: AdminNotificationWithReads): AdminNotificationView {
		const readAt = row.reads[0]?.readAt ?? null;
		return {
			id: row.id,
			type: row.type,
			title: row.title,
			body: row.body,
			readAt: readAt ? readAt.toISOString() : null,
			createdAt: row.createdAt.toISOString(),
		};
	}
}
