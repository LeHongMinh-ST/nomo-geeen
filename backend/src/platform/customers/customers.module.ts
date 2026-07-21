import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
	imports: [AuthModule, EntitlementsModule, PrismaModule],
	controllers: [CustomersController],
	providers: [CustomersService],
	exports: [CustomersService],
})
export class CustomersModule {}
