import { HandbookCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsOptional,
	IsString,
	Max,
	Min,
} from 'class-validator';

/** Selectable write set — excludes UNCATEGORIZED. */
export enum HandbookCategoryInput {
	CROP_PROTECTION_AND_FERTILIZER = 'CROP_PROTECTION_AND_FERTILIZER',
	CROP_SEEDLINGS = 'CROP_SEEDLINGS',
	ANIMAL_FEED = 'ANIMAL_FEED',
	VETERINARY_DRUGS = 'VETERINARY_DRUGS',
	LIVESTOCK = 'LIVESTOCK',
}

/** Mirrors Prisma DiseaseType (no EPIDEMIC — map FE epidemic → OTHER). */
export enum DiseaseTypeInput {
	DISEASE = 'DISEASE',
	PEST = 'PEST',
	WEED = 'WEED',
	OTHER = 'OTHER',
}

export class HandbookQueryDto {
	@IsOptional()
	@IsString()
	search?: string;

	@IsOptional()
	@IsEnum(HandbookCategory)
	category?: HandbookCategory;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page = 1;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(50)
	pageSize = 20;
}

export class CreateHandbookEntryDto {
	@IsString()
	@IsNotEmpty()
	name!: string;

	@IsEnum(HandbookCategoryInput)
	category!: HandbookCategoryInput;

	@IsOptional()
	@IsString()
	subject?: string;

	@IsOptional()
	@IsEnum(DiseaseTypeInput)
	type?: DiseaseTypeInput;

	@IsOptional()
	@IsString()
	symptom?: string;

	@IsOptional()
	@IsString()
	note?: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	aliases?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	recommendedIngredients?: string[];
}

export class UpdateHandbookEntryDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	name?: string;

	@IsOptional()
	@IsEnum(HandbookCategoryInput)
	category?: HandbookCategoryInput;

	@IsOptional()
	@IsString()
	subject?: string;

	@IsOptional()
	@IsEnum(DiseaseTypeInput)
	type?: DiseaseTypeInput;

	@IsOptional()
	@IsString()
	symptom?: string;

	@IsOptional()
	@IsString()
	note?: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	aliases?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	recommendedIngredients?: string[];
}
