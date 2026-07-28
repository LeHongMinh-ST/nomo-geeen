// Prisma 7 config (thay cho `url` trong schema.prisma).
// CLI (migrate/introspect/studio) doc datasource.url tu day.
// Runtime PrismaClient dung driver adapter @prisma/adapter-pg (xem src khi tao PrismaService).
import { defineConfig, env } from 'prisma/config';
import { existsSync } from 'node:fs';

// Config loader cua Prisma 7 KHONG tu nap .env => nap thu cong (Node >=20.6).
if (existsSync('.env')) {
	process.loadEnvFile?.('.env');
}

export default defineConfig({
	schema: 'prisma/schema.prisma',
	migrations: {
		path: 'prisma/migrations',
		seed: 'ts-node prisma/seed.ts',
	},
	datasource: {
		url: env('DATABASE_URL'),
	},
});
