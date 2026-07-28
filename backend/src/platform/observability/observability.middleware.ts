import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

export class ObservabilityMiddleware {
	private readonly logger = new Logger('http');
	constructor(private readonly metrics: MetricsService) {}
	use(request: Request, response: Response, next: NextFunction) {
		const started = Date.now();
		response.on('finish', () => {
			const route = request.route?.path ?? request.path;
			this.metrics.increment('http_requests_total');
			if (response.statusCode >= 400)
				this.metrics.increment('http_errors_total');
			this.logger.log(
				JSON.stringify({
					event: 'request.completed',
					method: request.method,
					route,
					status: response.statusCode,
					durationMs: Date.now() - started,
					requestId: request.get('x-request-id') ?? undefined,
				}),
			);
		});
		next();
	}
}
