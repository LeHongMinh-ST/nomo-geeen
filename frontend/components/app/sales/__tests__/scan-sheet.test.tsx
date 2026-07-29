import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/products";
import { ScanSheet } from "../scan-sheet";

const scanner = vi.hoisted(() => ({
	callback: undefined as
		| ((result: { getText: () => string }) => void)
		| undefined,
	stop: vi.fn(),
	getUserMedia: vi.fn(),
	trackStop: vi.fn(),
}));

vi.mock("@zxing/browser", () => ({
	BrowserMultiFormatReader: class {
		decodeFromStream(
			_stream: MediaStream,
			_video: HTMLVideoElement,
			callback: (result: { getText: () => string }) => void,
		) {
			scanner.callback = callback;
			return Promise.resolve({ stop: scanner.stop });
		}
	},
}));

vi.mock("@/lib/use-scroll-lock", () => ({ useScrollLock: vi.fn() }));

const product: Product = {
	id: "p1",
	name: "NPK 20-20-15",
	sku: "NPK-1",
	barcode: "8930001",
	categoryId: "c1",
	baseUnit: "Bao",
	baseUnitId: "u1",
	conversions: [],
	costPrice: 100,
	salePrice: 200,
	priceTiers: [],
	stock: 10,
	lowStockThreshold: 0,
};

function scan(code: string) {
	scanner.callback?.({ getText: () => code });
}

describe("ScanSheet sales scanning", () => {
	beforeEach(() => {
		scanner.callback = undefined;
		scanner.stop.mockClear();
		scanner.getUserMedia.mockClear();
		scanner.trackStop.mockClear();
		Object.defineProperty(navigator, "mediaDevices", {
			configurable: true,
			value: {
				getUserMedia: scanner.getUserMedia.mockResolvedValue({
					getTracks: () => [{ stop: scanner.trackStop }],
				}),
			},
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("keeps one camera session open and accepts scans after the cooldown", async () => {
		const onFound = vi.fn();
		const { unmount } = render(
			<ScanSheet
				open
				onClose={vi.fn()}
				onFound={onFound}
				products={[product]}
				keepOpen
			/>,
		);

		await waitFor(() => expect(scanner.callback).toBeTypeOf("function"));
		vi.useFakeTimers();
		act(() => scan(product.barcode));
		act(() => scan(product.barcode));
		expect(onFound).toHaveBeenCalledTimes(1);

		act(() => {
			vi.advanceTimersByTime(750);
			scan(product.barcode);
		});
		expect(onFound).toHaveBeenCalledTimes(2);
		expect(scanner.stop).not.toHaveBeenCalled();

		unmount();
		expect(scanner.stop).toHaveBeenCalledTimes(1);
	});

	it("re-arms immediately for invalid codes", async () => {
		const onFound = vi.fn();
		render(
			<ScanSheet
				open
				onClose={vi.fn()}
				onFound={onFound}
				products={[product]}
				keepOpen
			/>,
		);

		await waitFor(() => expect(scanner.callback).toBeTypeOf("function"));
		act(() => scan("unknown"));
		act(() => scan(product.barcode));
		expect(onFound).toHaveBeenCalledWith(product);
	});

	it("uses the latest products without restarting the camera", async () => {
		const onFound = vi.fn();
		const nextProduct = { ...product, id: "p2", barcode: "8930002" };
		const { rerender, unmount } = render(
			<ScanSheet
				open
				onClose={vi.fn()}
				onFound={onFound}
				products={[product]}
				keepOpen
			/>,
		);

		await waitFor(() => expect(scanner.callback).toBeTypeOf("function"));
		rerender(
			<ScanSheet
				open
				onClose={vi.fn()}
				onFound={onFound}
				products={[nextProduct]}
				keepOpen
			/>,
		);
		act(() => scan(nextProduct.barcode));

		expect(onFound).toHaveBeenCalledWith(nextProduct);
		expect(scanner.getUserMedia).toHaveBeenCalledTimes(1);
		unmount();
	});

	it("re-arms immediately for out-of-stock and unaddable products", async () => {
		const locked = {
			...product,
			id: "locked",
			barcode: "8930002",
			locked: true,
		};
		const outOfStock = {
			...product,
			id: "empty",
			barcode: "8930003",
			stock: 0,
		};
		const onFound = vi.fn();
		render(
			<ScanSheet
				open
				onClose={vi.fn()}
				onFound={onFound}
				products={[locked, outOfStock, product]}
				keepOpen
			/>,
		);
		await waitFor(() => expect(scanner.callback).toBeTypeOf("function"));

		act(() => scan(locked.barcode));
		act(() => scan(outOfStock.barcode));
		act(() => scan(product.barcode));
		expect(onFound).toHaveBeenCalledTimes(1);
		expect(onFound).toHaveBeenCalledWith(product);
	});

	it("re-arms immediately for recalled and inactive products", async () => {
		const recalled = {
			...product,
			id: "recalled",
			barcode: "8930002",
			recalled: true,
		};
		const inactive = {
			...product,
			id: "inactive",
			barcode: "8930003",
			status: "inactive" as const,
		};
		const onFound = vi.fn();
		render(
			<ScanSheet
				open
				onClose={vi.fn()}
				onFound={onFound}
				products={[recalled, inactive, product]}
				keepOpen
			/>,
		);
		await waitFor(() => expect(scanner.callback).toBeTypeOf("function"));

		act(() => scan(recalled.barcode));
		act(() => scan(inactive.barcode));
		act(() => scan(product.barcode));

		expect(onFound).toHaveBeenCalledTimes(1);
		expect(onFound).toHaveBeenCalledWith(product);
	});

	it("accepts out-of-stock products when allowed", async () => {
		const outOfStock = { ...product, stock: 0 };
		const onFound = vi.fn();
		const { unmount } = render(
			<ScanSheet
				open
				onClose={vi.fn()}
				onFound={onFound}
				products={[outOfStock]}
				allowOutOfStock
			/>,
		);
		await waitFor(() => expect(scanner.callback).toBeTypeOf("function"));

		act(() => scan(outOfStock.barcode));
		expect(onFound).toHaveBeenCalledWith(outOfStock);
		unmount();
	});

	it("clears the cooldown when the sheet closes before it expires", async () => {
		const onFound = vi.fn();
		const { rerender } = render(
			<ScanSheet
				open
				onClose={vi.fn()}
				onFound={onFound}
				products={[product]}
				keepOpen
			/>,
		);
		await waitFor(() => expect(scanner.callback).toBeTypeOf("function"));
		vi.useFakeTimers();

		act(() => scan(product.barcode));
		expect(onFound).toHaveBeenCalledTimes(1);
		rerender(
			<ScanSheet
				open={false}
				onClose={vi.fn()}
				onFound={onFound}
				products={[product]}
				keepOpen
			/>,
		);
		act(() => vi.advanceTimersByTime(750));
		act(() => scan(product.barcode));

		expect(onFound).toHaveBeenCalledTimes(1);
		expect(scanner.stop).toHaveBeenCalledTimes(1);
		expect(scanner.trackStop).toHaveBeenCalledTimes(1);
	});

	it("remains one-shot when keepOpen is omitted", async () => {
		const onFound = vi.fn();
		render(
			<ScanSheet
				open
				onClose={vi.fn()}
				onFound={onFound}
				products={[product]}
			/>,
		);

		await waitFor(() => expect(scanner.callback).toBeTypeOf("function"));
		act(() => scan(product.barcode));
		act(() => scan(product.barcode));
		expect(onFound).toHaveBeenCalledTimes(1);
	});
});
