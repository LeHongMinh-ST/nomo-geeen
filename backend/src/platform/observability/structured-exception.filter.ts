import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Catch()
export class StructuredExceptionFilter implements ExceptionFilter {
	private readonly logger = new Logger('error');
	constructor(private readonly metrics: MetricsService) {}
	catch(exception: unknown, host: ArgumentsHost) {
		const response = host.switchToHttp().getResponse<Response>();
		const request = host.switchToHttp().getRequest<Request>();
		const status =
			exception instanceof HttpException ? exception.getStatus() : 500;
		this.metrics.increment('http_errors_total');
		this.logger.error(
			JSON.stringify({
				event: 'request.error',
				method: request.method,
				route: request.path,
				status,
				requestId: request.get('x-request-id') ?? undefined,
				error:
					exception instanceof Error ? exception.message : String(exception),
			}),
		);
		if (!response.headersSent)
			response
				.status(status)
				.json(
					exception instanceof HttpException
						? exception.getResponse()
						: { statusCode: 500, message: 'Internal server error' },
				);
	}
}
