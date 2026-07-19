import {
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Query,
	UseGuards,
} from '@nestjs/common';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import {
	type AuditLogDetail,
	type AuditLogListResult,
	AuditQueryService,
} from './audit-query.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Controller('admin/audit-logs')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AuditController {
	constructor(private readonly service: AuditQueryService) {}

	@Get()
	@RequirePermission('admin.audit:view')
	list(@Query() query: AuditQueryDto): Promise<AuditLogListResult> {
		return this.service.list(query);
	}

	@Get(':id')
	@RequirePermission('admin.audit:view')
	findOne(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
	): Promise<AuditLogDetail> {
		return this.service.findById(id);
	}
}
