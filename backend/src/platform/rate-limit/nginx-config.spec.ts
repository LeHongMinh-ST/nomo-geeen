import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('production gateway rate limit config', () => {
	it('defines auth limit zones and applies them to both auth routes', () => {
		const root = join(process.cwd(), '..');
		const config = readFileSync(join(root, 'deploy/nginx/nginx.conf'), 'utf8');
		expect(config).toContain(
			'limit_req_zone $binary_remote_addr zone=auth_login',
		);
		expect(config).toContain(
			'limit_req_zone $binary_remote_addr zone=auth_refresh',
		);
		expect(config).toContain('location = /auth/login');
		expect(config).toContain('location = /auth/refresh');
		expect(config).toContain('limit_req zone=auth_login');
		expect(config).toContain('limit_req zone=auth_refresh');
	});
});
