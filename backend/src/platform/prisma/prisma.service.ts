import {
	Injectable,
	type OnModuleDestroy,
	type OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * Runtime Prisma client su dung driver adapter @prisma/adapter-pg (Prisma 7).
 * Connection URL lay tu DATABASE_URL, khop voi prisma.config.ts (CLI).
 */
@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	constructor() {
		super({
			adapter: new PrismaPg({
				connectionString: process.env.DATABASE_URL,
			}),
		});
	}

	async onModuleInit(): Promise<void> {
		await this.$connect();
	}

	async onModuleDestroy(): Promise<void> {
		await this.$disconnect();
	}
}
