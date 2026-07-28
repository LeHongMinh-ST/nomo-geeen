import { HealthService } from './health.service';

describe('HealthService', () => {
	it('reports degraded when Redis is down but Postgres is available', async () => {
		const service = new HealthService(
			{ $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as never,
			{ ping: jest.fn().mockRejectedValue(new Error('redis down')) } as never,
		);
		await expect(service.ready()).resolves.toMatchObject({
			status: 'degraded',
			checks: { database: { status: 'up' }, redis: { status: 'degraded' } },
		});
	});
	it('reports down when Postgres is unavailable', async () => {
		const service = new HealthService(
			{ $queryRaw: jest.fn().mockRejectedValue(new Error('db down')) } as never,
			{ ping: jest.fn().mockResolvedValue('PONG') } as never,
		);
		await expect(service.ready()).resolves.toMatchObject({ status: 'down' });
	});
});
