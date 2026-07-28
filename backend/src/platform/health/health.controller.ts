import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
	constructor(private readonly health: HealthService) {}

	@Get('ready')
	@HttpCode(HttpStatus.OK)
	async ready(@Res({ passthrough: true }) response: Response) {
		const result = await this.health.ready();
		if (result.status === 'down')
			response.status(HttpStatus.SERVICE_UNAVAILABLE);
		return result;
	}
}
