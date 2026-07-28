import { NotificationType } from '@prisma/client';
import { NotificationProducerService } from './notification-producer.service';

describe('NotificationProducerService', () => {
	const tenantId = 'tenant-1';
	const dayKey = '2026-07-28';
	const now = new Date('2026-07-28T10:00:00+07:00');
	const events = {
		publish: jest.fn().mockResolvedValue(undefined),
	};

	beforeEach(() => {
		events.publish.mockClear();
	});

	function service(prisma: Record<string, unknown>) {
		return new NotificationProducerService(prisma as never, events as never);
	}

	it('creates a debt-due digest once per day and skips duplicate spam', async () => {
		const prisma = {
			customer: {
				aggregate: jest.fn().mockResolvedValue({
					_count: { _all: 2 },
					_sum: { balance: 1_500_000n },
				}),
			},
			notification: {
				findUnique: jest
					.fn()
					.mockResolvedValueOnce(null)
					.mockResolvedValueOnce({
						id: 'n1',
						title: 'Có 2 khách còn công nợ',
						body: 'Tổng phải thu 1.500.000đ. Mở Công nợ để thu hồi.',
					}),
				create: jest.fn().mockResolvedValue({ id: 'n1' }),
				update: jest.fn(),
			},
		};
		const svc = service(prisma);
		const first = await svc.syncDebtDue(tenantId, dayKey);
		expect(first).toEqual({
			created: 1,
			updated: 0,
			skipped: 0,
			count: 2,
		});
		expect(prisma.notification.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					type: NotificationType.DEBT_DUE,
					dedupeKey: `DEBT_DUE:digest:${dayKey}`,
					userId: null,
				}),
				select: { id: true },
			}),
		);
		expect(events.publish).toHaveBeenCalledWith({
			tenantId,
			userId: null,
			notificationId: 'n1',
			action: 'created',
		});
		const second = await svc.syncDebtDue(tenantId, dayKey);
		expect(second.skipped).toBe(1);
		expect(second.created).toBe(0);
		expect(prisma.notification.create).toHaveBeenCalledTimes(1);
		expect(prisma.notification.update).not.toHaveBeenCalled();
		expect(events.publish).toHaveBeenCalledTimes(1);
	});

	it('updates digest body when low-stock counts change same day', async () => {
		const prisma = {
			tenantSettings: {
				findUnique: jest.fn().mockResolvedValue({
					lowStockThresholdDefault: 10,
				}),
			},
			stock: {
				findMany: jest.fn().mockResolvedValue([
					{
						productId: 'p1',
						qty: 3,
						product: { name: 'NPK' },
					},
					{
						productId: 'p2',
						qty: 5,
						product: { name: 'Thuốc trừ sâu' },
					},
				]),
			},
			notification: {
				findUnique: jest.fn().mockResolvedValue({
					id: 'n-low',
					title: '1 mặt hàng sắp hết',
					body: 'old',
				}),
				update: jest.fn().mockResolvedValue({}),
				create: jest.fn(),
			},
		};
		const result = await service(prisma).syncLowStock(tenantId, dayKey, now);
		expect(result).toEqual({
			created: 0,
			updated: 1,
			skipped: 0,
			count: 2,
		});
		expect(prisma.notification.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'n-low' },
				data: expect.objectContaining({
					title: '2 mặt hàng sắp hết',
				}),
			}),
		);
		expect(events.publish).toHaveBeenCalledWith({
			tenantId,
			userId: null,
			notificationId: 'n-low',
			action: 'updated',
		});
		expect(prisma.notification.create).not.toHaveBeenCalled();
	});

	it('produces near-expiry digest only for WARNING/CRITICAL/EXPIRED batches', async () => {
		const prisma = {
			productBatch: {
				findMany: jest.fn().mockResolvedValue([
					{
						productId: 'p1',
						expiresAt: new Date('2026-07-20T00:00:00.000Z'), // expired
						product: { name: 'Lô A' },
					},
					{
						productId: 'p2',
						expiresAt: new Date('2026-12-31T00:00:00.000Z'), // fresh
						product: { name: 'Lô B' },
					},
					{
						productId: 'p3',
						expiresAt: new Date('2026-08-10T00:00:00.000Z'), // within 30d critical-ish
						product: { name: 'Lô C' },
					},
				]),
			},
			notification: {
				findUnique: jest.fn().mockResolvedValue(null),
				create: jest.fn().mockResolvedValue({ id: 'n-near' }),
				update: jest.fn(),
			},
		};
		const result = await service(prisma).syncNearExpiry(tenantId, dayKey, now);
		expect(result.count).toBe(2);
		expect(result.created).toBe(1);
		expect(prisma.notification.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					type: NotificationType.NEAR_EXPIRED,
					dedupeKey: `NEAR_EXPIRED:digest:${dayKey}`,
				}),
			}),
		);
		expect(events.publish).toHaveBeenCalledWith({
			tenantId,
			userId: null,
			notificationId: 'n-near',
			action: 'created',
		});
	});

	it('syncTenant aggregates three producers without inventing rows when empty', async () => {
		const prisma = {
			customer: {
				aggregate: jest.fn().mockResolvedValue({
					_count: { _all: 0 },
					_sum: { balance: null },
				}),
			},
			tenantSettings: { findUnique: jest.fn().mockResolvedValue(null) },
			stock: { findMany: jest.fn().mockResolvedValue([]) },
			productBatch: { findMany: jest.fn().mockResolvedValue([]) },
			notification: {
				findUnique: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
			},
		};
		const result = await service(prisma).syncTenant(tenantId, now);
		expect(result.created).toBe(0);
		expect(result.debtOwingCustomers).toBe(0);
		expect(result.lowStockProducts).toBe(0);
		expect(result.nearExpiryProducts).toBe(0);
		expect(prisma.notification.create).not.toHaveBeenCalled();
		expect(events.publish).not.toHaveBeenCalled();
		expect(result.dayKey).toBe(dayKey);
	});
});
