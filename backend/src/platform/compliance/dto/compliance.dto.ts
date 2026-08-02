import { TenantLicenseType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
	IsBoolean,
	IsEnum,
	IsInt,
	IsISO8601,
	IsNotEmpty,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
} from 'class-validator';

export class CreateTenantLicenseDto {
	@IsEnum(TenantLicenseType) licenseType!: TenantLicenseType;
	@IsString() @IsNotEmpty() @MaxLength(120) licenseNo!: string;
	@IsOptional() @IsString() @MaxLength(200) holderName?: string;
	@IsOptional() @IsString() @MaxLength(200) issuedBy?: string;
	@IsOptional() @IsISO8601({ strict: true }) issuedAt?: string;
	@IsOptional() @IsISO8601({ strict: true }) expiresAt?: string;
	@IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class UpdateTenantLicenseDto {
	@IsOptional() @IsEnum(TenantLicenseType) licenseType?: TenantLicenseType;
	@IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) licenseNo?: string;
	@IsOptional() @IsString() @MaxLength(200) holderName?: string | null;
	@IsOptional() @IsString() @MaxLength(200) issuedBy?: string | null;
	@IsOptional() @IsISO8601({ strict: true }) issuedAt?: string | null;
	@IsOptional() @IsISO8601({ strict: true }) expiresAt?: string | null;
	@IsOptional() @IsString() @MaxLength(500) note?: string | null;
}

export class TenantLicenseQueryDto {
	/** Số ngày coi là "sắp hết hạn" khi lọc; mặc định 30. */
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(365)
	expiringWithinDays?: number;

	@IsOptional()
	@Type(() => Boolean)
	@IsBoolean()
	expiringOnly?: boolean;
}

export class CreateBannedIngredientDto {
	@IsString() @IsNotEmpty() @MaxLength(200) name!: string;
	@IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class UpdateBannedIngredientDto {
	@IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) name?: string;
	@IsOptional() @IsString() @MaxLength(500) note?: string | null;
}
