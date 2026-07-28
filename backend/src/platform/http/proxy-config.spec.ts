import { parseTrustProxy } from './proxy-config';

describe('parseTrustProxy', () => {
	it('supports explicit hop count and disabled mode', () => {
		expect(parseTrustProxy('1')).toBe(1);
		expect(parseTrustProxy('false')).toBe(false);
	});
	it('supports explicit trusted proxy networks', () => {
		expect(parseTrustProxy('loopback, 10.0.0.0/8')).toEqual([
			'loopback',
			'10.0.0.0/8',
		]);
	});
});
