import { SupplierType } from '@prisma/client';
import { mapSupplierType } from './supplier-type';

describe('mapSupplierType', () => {
	it.each([
		['CROP_PROTECTION', SupplierType.CROP_PROTECTION],
		['FERTILIZER', SupplierType.FERTILIZER],
		['BOTH', SupplierType.BOTH],
	])('keeps canonical value %s', (raw, expected) => {
		expect(mapSupplierType(raw)).toBe(expected);
	});

	it.each([
		'Thuốc BVTV',
		'thuoc bvtv',
		'Nhà phân phối BVTV',
		'Thuốc bảo vệ thực vật',
		'thuoc bao ve thuc vat',
		'Pesticide',
		'Crop Protection',
		'crop-protection',
		'Thuốc trừ sâu',
	])('maps %s to CROP_PROTECTION', (raw) => {
		expect(mapSupplierType(raw)).toBe(SupplierType.CROP_PROTECTION);
	});

	it.each([
		'Phân bón',
		'phan bon',
		'Nhà cung cấp phân bón',
		'Fertilizer',
		'fertiliser',
	])('maps %s to FERTILIZER', (raw) => {
		expect(mapSupplierType(raw)).toBe(SupplierType.FERTILIZER);
	});

	it.each([
		'Cả hai',
		'ca hai',
		'Cả 2',
		'Both',
		'Thuốc BVTV và phân bón',
		'phan bon + thuoc bao ve thuc vat',
	])('maps %s to BOTH', (raw) => {
		expect(mapSupplierType(raw)).toBe(SupplierType.BOTH);
	});

	it.each([
		'',
		'   ',
		'Nhà phân phối',
		'distributor',
		'manufacturer',
		'agent',
		'Đại lý',
		null,
		undefined,
	])('returns null for unmappable input %s', (raw) => {
		expect(mapSupplierType(raw)).toBeNull();
	});

	it('does not match a token that is only a substring of another word', () => {
		expect(mapSupplierType('bvtvxyz')).toBeNull();
		expect(mapSupplierType('superfertilizerplus')).toBeNull();
	});
});
