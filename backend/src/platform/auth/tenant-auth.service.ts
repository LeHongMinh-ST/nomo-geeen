import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DECOY_HASH, PasswordService } from './password.service';
import { TenantIdentity, TokenService } from './token.service';

@Injectable()
export class TenantAuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly passwords: PasswordService,
		private readonly tokens: TokenService,
	) {}

	async login(
		tenantSlug: string,
		identifier: string,
		password: string,
	): Promise<{ accessToken: string }> {
		const value = identifier.trim();
		const slug = tenantSlug.trim();
		const user = await this.prisma.user.findFirst({
			where: {
				status: 'ACTIVE',
				deletedAt: null,
				tenant: { slug, status: 'ACTIVE', deletedAt: null },
				OR: [{ username: value }, { email: value }, { phone: value }],
			},
			include: { role: { select: { code: true } } },
		});
		const valid = await this.passwords.verify(
			user?.passwordHash ?? DECOY_HASH,
			password,
		);
		if (!user || !valid) throw new UnauthorizedException('Invalid credentials');

		const identity: TenantIdentity = {
			id: user.id,
			tenantId: user.tenantId,
			username: user.username,
			roleCode: user.role.code,
		};
		return { accessToken: this.tokens.signTenant(identity) };
	}
}
