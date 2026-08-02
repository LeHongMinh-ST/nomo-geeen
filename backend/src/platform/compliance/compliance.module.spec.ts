import { AuditModule } from '../audit/audit.module';
import { ComplianceModule } from './compliance.module';

describe('ComplianceModule', () => {
	it('imports AuditModule for TenantPermissionGuard dependencies', () => {
		const imports = Reflect.getMetadata(
			'imports',
			ComplianceModule,
		) as unknown[];

		expect(imports).toContain(AuditModule);
	});
});
