import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { QuickProtocol } from "@/lib/tenant-handbook-api";
import { ProtocolPicker } from "../protocol-picker";

function item(overrides: Partial<QuickProtocol["items"][number]> = {}) {
	return {
		id: "i1",
		productId: "p1",
		productName: "Thuốc A",
		productSku: "SKU-A",
		activeIngredient: null,
		doseAmount: 25,
		doseUnit: "ml",
		perAreaAmount: 1000,
		perAreaUnit: "M2" as const,
		mixing: "Pha 20 lít nước",
		usage: "Phun đều mặt lá",
		sortOrder: 0,
		unitId: "u1",
		unit: "Chai",
		unitPrice: 50000,
		availableQty: 10,
		inStock: true,
		needAmount: 75,
		needUnit: "ml",
		packs: 2,
		cannotComputePacks: false,
		cannotComputePacksReason: null,
		...overrides,
	};
}

function protocol(overrides: Partial<QuickProtocol> = {}): QuickProtocol {
	return {
		id: "proto-1",
		name: "Phác đồ chính",
		note: null,
		isDefault: true,
		sortOrder: 0,
		status: "FULL",
		items: [item()],
		...overrides,
	};
}

const area = { value: "3", unit: "CONG_NAM" as const };

describe("ProtocolPicker", () => {
	it("does not add anything before the confirm click", () => {
		const onConfirm = vi.fn();
		render(
			<ProtocolPicker
				protocols={[protocol()]}
				area={area}
				onAreaChange={vi.fn()}
				onConfirm={onConfirm}
			/>,
		);

		expect(onConfirm).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: /Xác nhận thêm/ }));
		expect(onConfirm).toHaveBeenCalledTimes(1);
		const [confirmedProtocol, confirmedItems] = onConfirm.mock.calls[0];
		expect(confirmedProtocol.id).toBe("proto-1");
		expect(confirmedItems).toHaveLength(1);
	});

	it("shows the computed dose and pack count", () => {
		render(
			<ProtocolPicker
				protocols={[protocol()]}
				area={area}
				onAreaChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);

		expect(screen.getByText("75 ml → 2 Chai")).toBeInTheDocument();
		expect(screen.getByText(/Pha 20 lít nước/)).toBeInTheDocument();
		expect(screen.getByText(/Phun đều mặt lá/)).toBeInTheDocument();
	});

	it("excludes an unticked line from the confirmation", () => {
		const onConfirm = vi.fn();
		render(
			<ProtocolPicker
				protocols={[
					protocol({ items: [item(), item({ id: "i2", productId: "p2" })] }),
				]}
				area={area}
				onAreaChange={vi.fn()}
				onConfirm={onConfirm}
			/>,
		);

		fireEvent.click(screen.getAllByRole("checkbox")[0]);
		fireEvent.click(screen.getByRole("button", { name: /Xác nhận thêm 1 thuốc/ }));
		expect(onConfirm.mock.calls[0][1]).toHaveLength(1);
	});

	it("disables confirm when no line is sellable", () => {
		render(
			<ProtocolPicker
				protocols={[
					protocol({
						status: "OUT",
						items: [item({ inStock: false, availableQty: 0 })],
					}),
				]}
				area={area}
				onAreaChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /Chọn thuốc để thêm/ }),
		).toBeDisabled();
		expect(screen.getByText("Hết hàng")).toBeInTheDocument();
	});

	it("prompts for an area when no quantity was computed", () => {
		render(
			<ProtocolPicker
				protocols={[
					protocol({ items: [item({ needAmount: null, packs: null })] }),
				]}
				area={{ value: "", unit: "CONG_NAM" }}
				onAreaChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("Nhập diện tích để tính lượng cần"),
		).toBeInTheDocument();
	});

	it("flags a line that could not be converted to packs", () => {
		render(
			<ProtocolPicker
				protocols={[
					protocol({
						items: [
							item({
								packs: null,
								cannotComputePacks: true,
								cannotComputePacksReason: "UNIT_FAMILY_MISMATCH",
							}),
						],
					}),
				]}
				area={area}
				onAreaChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("75 ml · chưa quy đổi được số lượng bán"),
		).toBeInTheDocument();
	});

	it("reports the area change to the parent", () => {
		const onAreaChange = vi.fn();
		render(
			<ProtocolPicker
				protocols={[protocol()]}
				area={area}
				onAreaChange={onAreaChange}
				onConfirm={vi.fn()}
			/>,
		);

		fireEvent.change(screen.getByLabelText("Diện tích"), {
			target: { value: "5" },
		});
		expect(onAreaChange).toHaveBeenCalledWith({
			value: "5",
			unit: "CONG_NAM",
		});
	});

	it("labels alternates and lets the seller switch protocol", () => {
		render(
			<ProtocolPicker
				protocols={[
					protocol(),
					protocol({
						id: "proto-2",
						name: "Phác đồ thay thế",
						isDefault: false,
						status: "PARTIAL",
					}),
				]}
				area={area}
				onAreaChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);

		expect(screen.getByText("Mặc định")).toBeInTheDocument();
		expect(screen.getByText("Thay thế")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: /Phác đồ thay thế/ }));
		expect(screen.getByText("Thiếu một phần")).toBeInTheDocument();
	});

	it("renders a hint when the disease has no protocol", () => {
		render(
			<ProtocolPicker
				protocols={[]}
				area={area}
				onAreaChange={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);

		expect(screen.getByText(/chưa cấu hình phác đồ/)).toBeInTheDocument();
	});
});
