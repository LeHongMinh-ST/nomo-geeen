import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Put,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequireTenantPermission } from '../auth/decorators/require-tenant-permission.decorator';
import { TenantAccessTokenGuard } from '../auth/guards/tenant-access-token.guard';
import { TenantPermissionGuard } from '../auth/guards/tenant-permission.guard';
import type { TenantIdentity } from '../auth/token.service';
import {
	CreateHandbookEntryDto,
	HandbookQueryDto,
	UpdateHandbookEntryDto,
} from './dto/handbook.dto';
import {
	QuickSuggestionsQueryDto,
	ReplaceProtocolsDto,
} from './dto/protocol.dto';
import { HandbookProtocolService } from './handbook-protocol.service';
import { HandbookService } from './handbook.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

@Controller('tenant/handbook')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard)
export class HandbookController {
	constructor(
		private readonly handbook: HandbookService,
		private readonly protocols: HandbookProtocolService,
	) {}

	@Get('categories')
	@RequireTenantPermission('handbook:view')
	categories() {
		return this.handbook.catalog();
	}

	@Get('migration-report')
	@RequireTenantPermission('handbook:view')
	migrationReport(@Req() request: TenantRequest) {
		return this.handbook.migrationReport(request.user.tenantId);
	}

	@Get()
	@RequireTenantPermission('handbook:view')
	list(@Req() request: TenantRequest, @Query() query: HandbookQueryDto) {
		return this.handbook.list(request.user.tenantId, query);
	}

	@Get(':id')
	@RequireTenantPermission('handbook:view')
	detail(@Req() request: TenantRequest, @Param('id') id: string) {
		return this.handbook.findById(request.user.tenantId, id);
	}

	@Get(':id/quick-suggestions')
	@RequireTenantPermission('handbook:view')
	quickSuggestions(
		@Req() request: TenantRequest,
		@Param('id') id: string,
		@Query() query: QuickSuggestionsQueryDto,
	) {
		return this.handbook.quickSuggestions(request.user.tenantId, id, query);
	}

	@Put(':id/protocols')
	@RequireTenantPermission('handbook:edit')
	replaceProtocols(
		@Req() request: TenantRequest,
		@Param('id') id: string,
		@Body() dto: ReplaceProtocolsDto,
	) {
		return this.protocols.replaceAll(
			request.user.tenantId,
			request.user.id,
			id,
			dto,
		);
	}

	@Post()
	@RequireTenantPermission('handbook:create')
	create(@Req() request: TenantRequest, @Body() dto: CreateHandbookEntryDto) {
		return this.handbook.create(request.user.tenantId, request.user.id, dto);
	}

	@Patch(':id')
	@RequireTenantPermission('handbook:edit')
	update(
		@Req() request: TenantRequest,
		@Param('id') id: string,
		@Body() dto: UpdateHandbookEntryDto,
	) {
		return this.handbook.update(
			request.user.tenantId,
			request.user.id,
			id,
			dto,
		);
	}
}
