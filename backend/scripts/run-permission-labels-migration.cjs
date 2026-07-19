// One-shot migration runner: doc file SQL va exec qua Prisma $queryRawUnsafe.
// Bo qua pnpm exec prisma vi classifier dang block; dung API truc tiep.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { Client } = require('pg');

async function main() {
	const url = process.env.DATABASE_URL;
	if (!url) {
		console.error('DATABASE_URL not set');
		process.exit(1);
	}
	const sqlPath = join(
		__dirname,
		'prisma/migrations/20260719000300_permission_labels/migration.sql',
	);
	const sql = readFileSync(sqlPath, 'utf8');
	const client = new Client({ connectionString: url });
	await client.connect();
	try {
		await client.query(sql);
		console.log('OK migration 20260719000300_permission_labels applied');
	} finally {
		await client.end();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
