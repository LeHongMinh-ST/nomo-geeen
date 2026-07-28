import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { parseTrustProxy } from './platform/http/proxy-config';
import { MetricsService } from './platform/observability/metrics.service';
import { ObservabilityMiddleware } from './platform/observability/observability.middleware';

async function bootstrap() {
	// Chan cau hinh cookie khong an toan o production (R8.4).
	const cookieSecure = process.env.AUTH_COOKIE_SECURE !== 'false';
	if (!cookieSecure && process.env.NODE_ENV === 'production') {
		throw new Error(
			'AUTH_COOKIE_SECURE=false is not allowed when NODE_ENV=production',
		);
	}

	const app = await NestFactory.create(AppModule);
	app.getHttpAdapter().getInstance().set('trust proxy', parseTrustProxy());
	const metrics = app.get(MetricsService);
	const observability = new ObservabilityMiddleware(metrics);
	app.use(observability.use.bind(observability));

	app.use(cookieParser());
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);
	app.enableCors({
		origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
		credentials: true,
	});

	await app.listen(process.env.PORT ?? 3001);
}
bootstrap().catch((err) => {
	console.error(`[bootstrap] fatal: ${(err as Error).message}`);
	process.exit(1);
});
