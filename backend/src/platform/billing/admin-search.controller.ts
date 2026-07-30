import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { PrismaService } from '../prisma/prisma.service';

interface SearchResult {
	type: 'tenant' | 'admin-user' | 'invoice';
	id: string;
	label: string;
	subLabel?: string;
	href: string;
}

@Controller('admin/search')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AdminSearchController {
	constructor(private readonly prisma: PrismaService) {}

	@Get()
	@RequirePermission('admin.system:view')
	async search(@Query('q') q: string): Promise<SearchResult[]> {
		const term = q?.trim();
		if (!term || term.length < 2) return [];

		const results: SearchResult[] = [];

		// Search tenants
		const tenants = await this.prisma.tenant.findMany({
			where: {
				deletedAt: null,
				OR: [
					{ name: { contains: term, mode: 'insensitive' } },
					{ slug: { contains: term, mode: 'insensitive' } },
				],
			},
			select: { id: true, name: true, slug: true },
			take: 5,
		});
		results.push(
			...tenants.map((t) => ({
				type: 'tenant' as const,
				id: t.id,
				label: t.name,
				subLabel: t.slug,
				href: `/admin/tenants/${t.id}`,
			})),
		);

		// Search admin users
		const admins = await this.prisma.platformAdmin.findMany({
			where: {
				OR: [
					{ email: { contains: term, mode: 'insensitive' } },
					{ fullName: { contains: term, mode: 'insensitive' } },
				],
			},
			select: { id: true, email: true, fullName: true },
			take: 5,
		});
		results.push(
			...admins.map((a) => ({
				type: 'admin-user' as const,
				id: a.id,
				label: a.fullName,
				subLabel: a.email,
				href: `/admin/admin-users/${a.id}`,
			})),
		);

		// Search invoices
		const invoices = await this.prisma.invoice.findMany({
			where: {
				OR: [
					{ invoiceNumber: { contains: term, mode: 'insensitive' } },
					{ tenant: { name: { contains: term, mode: 'insensitive' } } },
				],
			},
			include: { tenant: { select: { id: true, name: true } } },
			take: 5,
		});
		results.push(
			...invoices.map((inv) => ({
				type: 'invoice' as const,
				id: inv.id,
				label: inv.invoiceNumber,
				subLabel: inv.tenant?.name ?? '—',
				href: `/admin/tenants/${inv.tenantId}`,
			})),
		);

		return results.slice(0, 15);
	}
}
