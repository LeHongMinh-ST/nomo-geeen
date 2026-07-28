import { UnauthorizedException } from '@nestjs/common';
import { assertMetricsAccess } from './observability.controller';

describe('metrics access', () => {
	const original = process.env.METRICS_TOKEN;
	const environment = process.env.NODE_ENV;
	afterEach(() => {
		if (original === undefined) delete process.env.METRICS_TOKEN;
		else process.env.METRICS_TOKEN = original;
		process.env.NODE_ENV = environment;
	});

	it('requires the configured token without exposing it', () => {
		process.env.METRICS_TOKEN = 'test-only-token';
		const request = {
			get: (name: string) => (name === 'x-metrics-token' ? 'wrong' : undefined),
		} as never;
		expect(() => assertMetricsAccess(request)).toThrow(UnauthorizedException);
		expect(() =>
			assertMetricsAccess({ get: () => 'test-only-token' } as never),
		).not.toThrow();
	});

	it('fails closed in production when no token is configured', () => {
		delete process.env.METRICS_TOKEN;
		process.env.NODE_ENV = 'production';
		expect(() =>
			assertMetricsAccess({ get: () => undefined } as never),
		).toThrow('not configured');
	});
});
