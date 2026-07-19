import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
	// Chan cau hinh cookie khong an toan o production (R8.4).
	const cookieSecure = process.env.AUTH_COOKIE_SECURE !== 'false';
	if (!cookieSecure && process.env.NODE_ENV === 'production') {
		throw new Error(
			'AUTH_COOKIE_SECURE=false is not allowed when NODE_ENV=production',
		);
	}

	const app = await NestFactory.create(AppModule);

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
