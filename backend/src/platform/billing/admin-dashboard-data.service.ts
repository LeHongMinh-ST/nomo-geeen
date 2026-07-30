import { Injectable } from '@nestjs/common';
import {
	PaymentStatus,
	SubscriptionStatus,
	TenantStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AdminDashboardSummary = {
	updatedAt: string;
	kpis: {
		activeStores: number;
		users: number;
		revenueThisMonth: string;
		transactionsToday: number;
	};
	alerts: {
		expiringSubscriptions: number;
		overdueInvoices: number;
		systemWarnings: number;
	};
	revenueByMonth: Array<{ label: string; value: string }>;
	recentStores: Array<{
		id: string;
		name: string;
		owner: string;
		plan: string;
		joined: string;
		status: 'active' | 'trial' | 'overdue';
	}>;
};

@Injectable()
export class AdminDashboardDataService {
	constructor(private readonly prisma: PrismaService) {}

	async getSummary(): Promise<AdminDashboardSummary> {
		const now = new Date();
		const today = new Date(now);
		today.setHours(0, 0, 0, 0);
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
		const expiryLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
		const [
			activeStores,
			users,
			payments,
			expiringSubscriptions,
			overdueInvoices,
			recentStores,
		] = await Promise.all([
			this.prisma.tenant.count({
				where: { status: TenantStatus.ACTIVE, deletedAt: null },
			}),
			this.prisma.user.count({ where: { status: 'ACTIVE', deletedAt: null } }),
			this.prisma.payment.findMany({
				where: {
					status: PaymentStatus.SUCCEEDED,
					paidAt: { gte: chartStart, lte: now },
				},
				select: { amount: true, paidAt: true },
			}),
			this.prisma.subscription.count({
				where: {
					status: {
						in: [
							SubscriptionStatus.ACTIVE,
							SubscriptionStatus.TRIALING,
							SubscriptionStatus.PAST_DUE,
						],
					},
					OR: [
						{ endDate: { gte: now, lte: expiryLimit } },
						{ trialEndsAt: { gte: now, lte: expiryLimit } },
					],
				},
			}),
			this.prisma.invoice.count({ where: { status: 'OVERDUE' } }),
			this.prisma.tenant.findMany({
				where: { deletedAt: null },
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				take: 5,
				select: {
					id: true,
					name: true,
					createdAt: true,
					users: {
						where: { deletedAt: null, role: { code: 'OWNER' } },
						select: { fullName: true },
						take: 1,
					},
					subscriptions: {
						orderBy: { updatedAt: 'desc' },
						take: 1,
						select: { status: true, plan: { select: { name: true } } },
					},
				},
			}),
		]);
		const revenue = payments
			.filter((p) => p.paidAt && p.paidAt >= monthStart)
			.reduce((sum, p) => sum + p.amount, 0n);
		const transactionsToday = payments.filter(
			(p) => p.paidAt && p.paidAt >= today,
		).length;
		const revenueByMonth = Array.from({ length: 6 }, (_, index) => {
			const from = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
			const to = new Date(now.getFullYear(), now.getMonth() - 4 + index, 1);
			const value = payments
				.filter((p) => p.paidAt && p.paidAt >= from && p.paidAt < to)
				.reduce((sum, p) => sum + p.amount, 0n);
			return { label: `T${from.getMonth() + 1}`, value: value.toString() };
		});
		return {
			updatedAt: now.toISOString(),
			kpis: {
				activeStores,
				users,
				revenueThisMonth: revenue.toString(),
				transactionsToday,
			},
			alerts: { expiringSubscriptions, overdueInvoices, systemWarnings: 0 },
			revenueByMonth,
			recentStores: recentStores.map((tenant) => {
				const subscription = tenant.subscriptions[0];
				return {
					id: tenant.id,
					name: tenant.name,
					owner: tenant.users[0]?.fullName ?? 'Chưa có chủ cửa hàng',
					plan: subscription?.plan.name ?? 'Chưa có gói',
					joined: tenant.createdAt.toISOString(),
					status:
						subscription?.status === SubscriptionStatus.PAST_DUE ||
						subscription?.status === SubscriptionStatus.EXPIRED
							? 'overdue'
							: subscription?.status === SubscriptionStatus.TRIALING
								? 'trial'
								: 'active',
				};
			}),
		};
	}
}
