import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
	const tenantId = 'tenant-1';
	const userA = 'user-a';
	const userB = 'user-b';

	function makeService(prisma: Record<string, unknown>) {
		return new NotificationsService(prisma as never);
	}

	it('lists visible notifications with per-user read state', async () => {
		const rows = [
			{
				id: 'n1',
				tenantId,
				userId: null,
				type: NotificationType.SYSTEM,
				title: 'Hệ thống',
				body: 'Chào mừng',
				createdAt: new Date('2026-07-28T01:00:00.000Z'),
				reads: [],
			},
			{
				id: 'n2',
				tenantId,
				userId: userA,
				type: NotificationType.LOW_STOCK,
				title: 'Sắp hết hàng',
				body: 'NPK còn 3',
				createdAt: new Date('2026-07-27T09:00:00.000Z'),
				reads: [{ readAt: new Date('2026-07-27T10:00:00.000Z') }],
			},
		];
		const prisma = {
			notification: {
				findMany: jest.fn().mockResolvedValue(rows),
				count: jest.fn().mockResolvedValue(1),
			},
		};
		const result = await makeService(prisma).list(tenantId, userA, {
			limit: 20,
		});
		expect(result.unreadCount).toBe(1);
		expect(result.items).toHaveLength(2);
		expect(result.items[0]).toMatchObject({
			id: 'n1',
			readAt: null,
			audience: 'TENANT',
		});
		expect(result.items[1]).toMatchObject({
			id: 'n2',
			audience: 'USER',
			readAt: '2026-07-27T10:00:00.000Z',
		});
		expect(prisma.notification.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					tenantId,
					OR: [{ userId: null }, { userId: userA }],
				},
				include: {
					reads: {
						where: { userId: userA },
						select: { readAt: true },
						take: 1,
					},
				},
				take: 20,
			}),
		);
		expect(prisma.notification.count).toHaveBeenCalledWith({
			where: {
				tenantId,
				OR: [{ userId: null }, { userId: userA }],
				reads: { none: { userId: userA } },
			},
		});
	});

	it('filters unreadOnly via missing NotificationRead for the viewer', async () => {
		const prisma = {
			notification: {
				findMany: jest.fn().mockResolvedValue([]),
				count: jest.fn().mockResolvedValue(0),
			},
		};
		await makeService(prisma).list(tenantId, userA, {
			limit: 999,
			unreadOnly: true,
		});
		expect(prisma.notification.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					tenantId,
					OR: [{ userId: null }, { userId: userA }],
					reads: { none: { userId: userA } },
				},
				take: 100,
			}),
		);
	});

	it('marks one unread notification as read for the current user only', async () => {
		const existing = {
			id: 'n1',
			tenantId,
			userId: null,
			type: NotificationType.DEBT_DUE,
			title: 'Công nợ đến hạn',
			body: null,
			createdAt: new Date('2026-07-28T02:00:00.000Z'),
			reads: [],
		};
		const prisma = {
			notification: {
				findFirst: jest.fn().mockResolvedValue(existing),
			},
			notificationRead: {
				upsert: jest.fn().mockResolvedValue({
					notificationId: 'n1',
					userId: userA,
					readAt: new Date('2026-07-28T03:00:00.000Z'),
				}),
			},
		};
		const result = await makeService(prisma).markRead(tenantId, userA, 'n1');
		expect(result.readAt).toMatch(/2026-07-28T/);
		expect(prisma.notificationRead.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					notificationId_userId: { notificationId: 'n1', userId: userA },
				},
				create: expect.objectContaining({
					tenantId,
					notificationId: 'n1',
					userId: userA,
				}),
			}),
		);
	});

	it('is idempotent when already read and 404 when invisible', async () => {
		const already = {
			id: 'n1',
			tenantId,
			userId: userA,
			type: NotificationType.SYSTEM,
			title: 'Đã đọc',
			body: null,
			createdAt: new Date('2026-07-19T00:00:00.000Z'),
			reads: [{ readAt: new Date('2026-07-20T00:00:00.000Z') }],
		};
		const prisma = {
			notification: {
				findFirst: jest
					.fn()
					.mockResolvedValueOnce(already)
					.mockResolvedValueOnce(null),
			},
			notificationRead: {
				upsert: jest.fn(),
			},
		};
		const service = makeService(prisma);
		const first = await service.markRead(tenantId, userA, 'n1');
		expect(first.readAt).toBe('2026-07-20T00:00:00.000Z');
		expect(prisma.notificationRead.upsert).not.toHaveBeenCalled();
		await expect(
			service.markRead(tenantId, userA, 'missing'),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	it('marks all unread for one user without touching other users', async () => {
		const prisma = {
			notification: {
				findMany: jest.fn().mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]),
			},
			notificationRead: {
				createMany: jest.fn().mockResolvedValue({ count: 2 }),
			},
		};
		const result = await makeService(prisma).markAllRead(tenantId, userA);
		expect(result).toEqual({ updated: 2, unreadCount: 0 });
		expect(prisma.notification.findMany).toHaveBeenCalledWith({
			where: {
				tenantId,
				OR: [{ userId: null }, { userId: userA }],
				reads: { none: { userId: userA } },
			},
			select: { id: true },
		});
		expect(prisma.notificationRead.createMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([
					expect.objectContaining({ notificationId: 'n1', userId: userA }),
					expect.objectContaining({ notificationId: 'n2', userId: userA }),
				]),
				skipDuplicates: true,
			}),
		);
	});

	it('keeps tenant-wide unread independent across two users', async () => {
		const shared = {
			id: 'n-shared',
			tenantId,
			userId: null,
			type: NotificationType.LOW_STOCK,
			title: 'Hàng sắp hết',
			body: 'NPK',
			createdAt: new Date('2026-07-28T04:00:00.000Z'),
			reads: [] as Array<{ readAt: Date }>,
		};
		const reads: Array<{
			notificationId: string;
			userId: string;
			readAt: Date;
		}> = [];
		const prisma = {
			notification: {
				findFirst: jest.fn(async ({ where }: { where: { id: string } }) => {
					if (where.id !== shared.id) return null;
					const viewer =
						// service always queries reads where userId = viewer
						(prisma.notification.findFirst as jest.Mock).mock.calls.at(-1)?.[0]
							?.include?.reads?.where?.userId ?? userA;
					return {
						...shared,
						reads: reads
							.filter(
								(row) =>
									row.notificationId === shared.id && row.userId === viewer,
							)
							.map((row) => ({ readAt: row.readAt })),
					};
				}),
				findMany: jest.fn(),
				count: jest.fn(
					async ({
						where,
					}: {
						where: { reads?: { none: { userId: string } } };
					}) => {
						const viewer = where.reads?.none?.userId;
						if (!viewer) return 0;
						const read = reads.some(
							(row) =>
								row.notificationId === shared.id && row.userId === viewer,
						);
						return read ? 0 : 1;
					},
				),
			},
			notificationRead: {
				upsert: jest.fn(
					async ({
						create,
					}: {
						create: {
							notificationId: string;
							userId: string;
							readAt: Date;
						};
					}) => {
						reads.push({
							notificationId: create.notificationId,
							userId: create.userId,
							readAt: create.readAt,
						});
						return create;
					},
				),
			},
		};

		const service = makeService(prisma);
		// Patch findFirst to honor include.reads.where.userId from the call.
		(prisma.notification.findFirst as jest.Mock).mockImplementation(
			async (args: {
				where: { id: string };
				include?: { reads?: { where?: { userId?: string } } };
			}) => {
				if (args.where.id !== shared.id) return null;
				const viewer = args.include?.reads?.where?.userId;
				return {
					...shared,
					reads: reads
						.filter(
							(row) =>
								row.notificationId === shared.id && row.userId === viewer,
						)
						.map((row) => ({ readAt: row.readAt })),
				};
			},
		);

		const markedA = await service.markRead(tenantId, userA, shared.id);
		expect(markedA.readAt).not.toBeNull();
		expect(await service.unreadCount(tenantId, userA)).toEqual({ count: 0 });
		expect(await service.unreadCount(tenantId, userB)).toEqual({ count: 1 });

		const stillUnreadForB = await service.markRead(tenantId, userB, shared.id);
		expect(stillUnreadForB.readAt).not.toBeNull();
		expect(await service.unreadCount(tenantId, userB)).toEqual({ count: 0 });
		expect(prisma.notificationRead.upsert).toHaveBeenCalledTimes(2);
		expect(reads).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ userId: userA, notificationId: shared.id }),
				expect.objectContaining({ userId: userB, notificationId: shared.id }),
			]),
		);
	});

	it('creates a producer row without inventing a shared read flag', async () => {
		const prisma = {
			notification: {
				create: jest.fn().mockResolvedValue({
					id: 'n-new',
					tenantId,
					userId: null,
					type: NotificationType.NEAR_EXPIRED,
					title: 'Sắp hết hạn',
					body: 'Lô A còn 5 ngày',
					createdAt: new Date('2026-07-28T04:00:00.000Z'),
				}),
			},
		};
		const result = await makeService(prisma).create({
			tenantId,
			title: 'Sắp hết hạn',
			body: 'Lô A còn 5 ngày',
			type: NotificationType.NEAR_EXPIRED,
		});
		expect(result).toMatchObject({
			id: 'n-new',
			type: NotificationType.NEAR_EXPIRED,
			audience: 'TENANT',
			readAt: null,
		});
	});
});
