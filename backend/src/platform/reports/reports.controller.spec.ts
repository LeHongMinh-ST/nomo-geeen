import 'reflect-metadata';
import { AuditModule } from '../audit/audit.module';
import { TENANT_PERMISSIONS_KEY } from '../auth/decorators/require-tenant-permission.decorator';
import { ENTITLEMENT_FEATURE_KEY } from '../entitlements/entitlement.constants';
import { ReportsController } from './reports.controller';
import { ReportsModule } from './reports.module';

describe('ReportsController', () => {
	it('forwards tenant stock report and keeps guards', () => {
		const reports = {
			stockSummary: jest.fn().mockReturnValue({ items: [] }),
		} as never;
		const controller = new ReportsController(reports);
		const request = { user: { tenantId: 'tenant-1' } } as never;
		expect(controller.stock(request, {})).toEqual({ items: [] });
		expect(
			(reports as { stockSummary: jest.Mock }).stockSummary,
		).toHaveBeenCalledWith('tenant-1', {});
		expect(
			Reflect.getMetadata(
				TENANT_PERMISSIONS_KEY,
				ReportsController.prototype.stock,
			),
		).toEqual(['inventory:view']);
		expect(
			Reflect.getMetadata(
				ENTITLEMENT_FEATURE_KEY,
				ReportsController.prototype.stock,
			),
		).toBe('inventory');
	});

	it('forwards sales query including businessGroup', () => {
		const reports = {
			salesSummary: jest.fn().mockReturnValue({ orders: 0 }),
		} as never;
		const controller = new ReportsController(reports);
		const request = { user: { tenantId: 'tenant-1' } } as never;
		const query = {
			from: '2026-01-01',
			to: '2026-01-31',
			businessGroup: 'CROP_INPUTS' as never,
		};
		expect(controller.sales(request, query)).toEqual({ orders: 0 });
		expect(
			(reports as { salesSummary: jest.Mock }).salesSummary,
		).toHaveBeenCalledWith('tenant-1', query);
	});

	it('forwards home dashboard summary with dashboard:view', () => {
		const reports = {
			homeSummary: jest.fn().mockReturnValue({ today: { revenue: '0' } }),
		} as never;
		const controller = new ReportsController(reports);
		const request = { user: { tenantId: 'tenant-1' } } as never;
		expect(controller.home(request)).toEqual({ today: { revenue: '0' } });
		expect(
			(reports as { homeSummary: jest.Mock }).homeSummary,
		).toHaveBeenCalledWith('tenant-1');
		expect(
			Reflect.getMetadata(
				TENANT_PERMISSIONS_KEY,
				ReportsController.prototype.home,
			),
		).toEqual(['dashboard:view']);
		expect(
			Reflect.getMetadata(
				ENTITLEMENT_FEATURE_KEY,
				ReportsController.prototype.home,
			),
		).toBeUndefined();
	});

	it('imports the audit module required by the tenant permission guard', () => {
		expect(Reflect.getMetadata('imports', ReportsModule)).toContain(
			AuditModule,
		);
	});
});
