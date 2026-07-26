import { evaluateProtocol, type ProtocolSource } from './protocol-availability';

function product(overrides: Partial<NonNullable<ProtocolSource['items'][number]['product']>> = {}) {
	return {
		id: 'p1',
		unitId: 'u1',
		unitName: 'Chai',
		unitPrice: 50_000,
		availableQty: 10,
		sellable: true,
		netContent: 100,
		netContentUnit: 'ml',
		...overrides,
	};
}

function item(
	overrides: Partial<ProtocolSource['items'][number]> = {},
): ProtocolSource['items'][number] {
	return {
		id: 'i1',
		productId: 'p1',
		productName: 'Thuốc A',
		activeIngredient: null,
		doseAmount: 25,
		doseUnit: 'ml',
		perAreaAmount: 1_000,
		perAreaUnit: 'M2',
		mixing: 'Pha 25ml với 20 lít nước',
		usage: 'Phun đều mặt lá',
		sortOrder: 0,
		product: product(),
		...overrides,
	};
}

function protocol(items: ProtocolSource['items']): ProtocolSource {
	return {
		id: 'proto-1',
		name: 'Phác đồ chính',
		note: null,
		isDefault: true,
		sortOrder: 0,
		items,
	};
}

describe('evaluateProtocol', () => {
	it('grades FULL when every line is a stocked product', () => {
		const result = evaluateProtocol(protocol([item(), item({ id: 'i2' })]), 3_000);
		expect(result.status).toBe('FULL');
		expect(result.items[0]).toMatchObject({
			needAmount: 75,
			needUnit: 'ml',
			packs: 1,
			inStock: true,
			cannotComputePacks: false,
		});
	});

	it('grades PARTIAL when one product is out of stock', () => {
		const result = evaluateProtocol(
			protocol([
				item(),
				item({ id: 'i2', product: product({ id: 'p2', availableQty: 0 }) }),
			]),
			1_000,
		);
		expect(result.status).toBe('PARTIAL');
		expect(result.items[1].inStock).toBe(false);
	});

	it('grades PARTIAL when a line only names an active ingredient', () => {
		const result = evaluateProtocol(
			protocol([
				item({
					id: 'i2',
					productId: null,
					productName: null,
					activeIngredient: 'Tricyclazole',
					product: null,
				}),
			]),
			1_000,
		);
		expect(result.status).toBe('PARTIAL');
		expect(result.items[0]).toMatchObject({
			inStock: false,
			needAmount: 25,
			packs: null,
			cannotComputePacksReason: 'MISSING_NET_CONTENT',
		});
	});

	it('grades OUT when every linked product is unusable', () => {
		const result = evaluateProtocol(
			protocol([item({ product: product({ sellable: false }) })]),
			1_000,
		);
		expect(result.status).toBe('OUT');
	});

	it('grades OUT for an empty protocol', () => {
		expect(evaluateProtocol(protocol([]), 1_000).status).toBe('OUT');
	});

	it('reports availability but no quantity when no area is given', () => {
		const result = evaluateProtocol(protocol([item()]), null);
		expect(result.status).toBe('FULL');
		expect(result.items[0]).toMatchObject({
			needAmount: null,
			packs: null,
			cannotComputePacks: true,
			cannotComputePacksReason: 'NO_AREA',
			inStock: true,
		});
	});

	it('surfaces a unit mismatch instead of guessing packs', () => {
		const result = evaluateProtocol(
			protocol([item({ product: product({ netContentUnit: 'kg' }) })]),
			2_000,
		);
		expect(result.items[0]).toMatchObject({
			needAmount: 50,
			packs: null,
			cannotComputePacks: true,
			cannotComputePacksReason: 'UNIT_FAMILY_MISMATCH',
		});
	});

	it('scales the dose with a hectare-based area', () => {
		const result = evaluateProtocol(
			protocol([
				item({ doseAmount: 1_000, perAreaAmount: 1, perAreaUnit: 'HA' }),
			]),
			10_000,
		);
		expect(result.items[0]).toMatchObject({ needAmount: 1_000, packs: 10 });
	});
});
