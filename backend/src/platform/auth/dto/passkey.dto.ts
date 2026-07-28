import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
export class PasskeyAuthenticationOptionsDto {
	@IsOptional() @IsString() identifier?: string;
}
export class PasskeyChallengeDto {
	@IsUUID() challengeId!: string;
	@IsObject() response!: Record<string, unknown>;
}
