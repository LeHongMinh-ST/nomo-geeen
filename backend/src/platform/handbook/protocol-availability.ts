import type { AreaUnit } from '@prisma/client';
import { calculateDose, type CannotComputePacksReason } from './dose-calculator';

export type ProtocolStatus = 'FULL' | 'PARTIAL' | 'OUT';

export type ProtocolItemSource = {
	id: string;
	productId: string | null;
	productName: string | null;
	activeIngredient: string | null;
	doseAmount: number;
	doseUnit: string;
	perAreaAmount: number;
	perAreaUnit: AreaUnit;
	mixing: string | null;
	usage: string | null;
	sortOrder: number;
	/** Null when the line only names an active ingredient. */
	product: {
		id: string;
		unitId: string;
		unitName: string;
		unitPrice: number;
		availableQty: number;
		sellable: boolean;
		netContent: number | null;
		netContentUnit: string | null;
	} | null;
};

export type ProtocolSource = {
	id: string;
	name: string;
	note: string | null;
	isDefault: boolean;
	sortOrder: number;
	items: ProtocolItemSource[];
};

export type EvaluatedItem = {
	id: string;
	productId: string | null;
	productName: string | null;
	activeIngredient: string | null;
	doseAmount: number;
	doseUnit: string;
	perAreaAmount: number;
	perAreaUnit: AreaUnit;
	mixing: string | null;
	usage: string | null;
	unitId: string | null;
	unit: string | null;
	unitPrice: number | null;
	availableQty: number;
	/** True only when a linked product is sellable and in stock. */
	inStock: boolean;
	needAmount: number | null;
	needUnit: string;
	packs: number | null;
	cannotComputePacks: boolean;
	cannotComputePacksReason: CannotComputePacksReason | 'NO_AREA' | null;
};

export type EvaluatedProtocol = {
	id: string;
	name: string;
	note: string | null;
	isDefault: boolean;
	sortOrder: number;
	status: ProtocolStatus;
	items: EvaluatedItem[];
};

/**
 * Attach dose and availability to every drug line, then grade the protocol.
 * `areaSquareMeters` is null when the counter has not entered an area yet — lines still
 * report availability, they just carry no quantity.
 */
export function evaluateProtocol(
	protocol: ProtocolSource,
	areaSquareMeters: number | null,
): EvaluatedProtocol {
	const items = protocol.items.map((item) =>
		evaluateItem(item, areaSquareMeters),
	);
	return {
		id: protocol.id,
		name: protocol.name,
		note: protocol.note,
		isDefault: protocol.isDefault,
		sortOrder: protocol.sortOrder,
		status: gradeProtocol(items),
		items,
	};
}

function evaluateItem(
	item: ProtocolItemSource,
	areaSquareMeters: number | null,
): EvaluatedItem {
	const product = item.product;
	const base = {
		id: item.id,
		productId: item.productId,
		productName: item.productName,
		activeIngredient: item.activeIngredient,
		doseAmount: item.doseAmount,
		doseUnit: item.doseUnit,
		perAreaAmount: item.perAreaAmount,
		perAreaUnit: item.perAreaUnit,
		mixing: item.mixing,
		usage: item.usage,
		unitId: product?.unitId ?? null,
		unit: product?.unitName ?? null,
		unitPrice: product?.unitPrice ?? null,
		availableQty: product?.availableQty ?? 0,
		inStock: !!product && product.sellable && product.availableQty > 0,
		needUnit: item.doseUnit,
	};

	if (areaSquareMeters === null) {
		return {
			...base,
			needAmount: null,
			packs: null,
			cannotComputePacks: true,
			cannotComputePacksReason: 'NO_AREA',
		};
	}

	const dose = calculateDose({
		doseAmount: item.doseAmount,
		doseUnit: item.doseUnit,
		perAreaAmount: item.perAreaAmount,
		perAreaUnit: item.perAreaUnit,
		areaSquareMeters,
		netContent: product?.netContent ?? null,
		netContentUnit: product?.netContentUnit ?? null,
	});

	if (!dose.ok) {
		return {
			...base,
			needAmount: null,
			packs: null,
			cannotComputePacks: true,
			cannotComputePacksReason: 'MISSING_NET_CONTENT',
		};
	}

	const enoughStock =
		!!product &&
		product.sellable &&
		product.availableQty > 0 &&
		(dose.packs === null || product.availableQty >= dose.packs);

	return {
		...base,
		inStock: enoughStock,
		needAmount: dose.needAmount,
		needUnit: dose.needUnit,
		packs: dose.packs,
		cannotComputePacks: dose.cannotComputePacks,
		cannotComputePacksReason: dose.cannotComputePacksReason,
	};
}

/**
 * FULL when every line is a stocked product. OUT when nothing is usable at all.
 * A line naming only an active ingredient is advisory — it keeps the protocol at PARTIAL
 * rather than dragging it to OUT, because the seller can still substitute manually.
 */
function gradeProtocol(items: EvaluatedItem[]): ProtocolStatus {
	if (!items.length) return 'OUT';
	if (items.every((item) => item.inStock)) return 'FULL';
	const usable = items.some((item) => item.inStock || !item.productId);
	return usable ? 'PARTIAL' : 'OUT';
}
