import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
	imports: [AuthModule, EntitlementsModule, PrismaModule],
	controllers: [ProductsController],
	providers: [ProductsService],
})
export class ProductsModule {}
