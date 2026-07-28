import { timingSafeEqual } from 'node:crypto';
import {
	Controller,
	Get,
	Header,
	Req,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { MetricsService } from './metrics.service';

export function assertMetricsAccess(request: Request): void {
	const configured = process.env.METRICS_TOKEN?.trim();
	if (!configured) {
		if (process.env.NODE_ENV === 'production')
			throw new ServiceUnavailableException(
				'Metrics authentication is not configured',
			);
		return;
	}
	const bearer = request.get('authorization')?.replace(/^Bearer\s+/i, '');
	const supplied = request.get('x-metrics-token') ?? bearer ?? '';
	const expected = Buffer.from(configured);
	const actual = Buffer.from(supplied);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
		throw new UnauthorizedException('Metrics authentication failed');
}

@Controller()
export class ObservabilityController {
	constructor(private readonly metrics: MetricsService) {}
	@Get('metrics')
	@Header('Content-Type', 'text/plain; version=0.0.4')
	metricsText(@Req() request: Request) {
		assertMetricsAccess(request);
		return this.metrics.toPrometheus();
	}
}
