import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getQuickHandbookSuggestions,
	listHandbookEntries,
} from "@/lib/tenant-handbook-api";
import {
	getProductLookups,
	listTenantProducts,
} from "@/lib/tenant-products-api";
import { HandbookQuickPanel } from "./handbook-quick-panel";

vi.mock("@/lib/tenant-handbook-api", async () => {
	const actual = await vi.importActual<
		typeof import("@/lib/tenant-handbook-api")
	>("@/lib/tenant-handbook-api");
	return {
		...actual,
		listHandbookEntries: vi.fn(),
		getQuickHandbookSuggestions: vi.fn(),
	};
});
vi.mock("@/lib/tenant-products-api", async () => {
	const actual = await vi.importActual<
		typeof import("@/lib/tenant-products-api")
	>("@/lib/tenant-products-api");
	return {
		...actual,
		listTenantProducts: vi.fn(),
		getProductLookups: vi.fn(),
	};
});
vi.mock("@/components/app/sales/scan-sheet", () => ({ ScanSheet: () => null }));
vi.mock("@/components/app/sales/protocol-picker", () => ({
	ProtocolPicker: () => null,
}));

const entry = {
	id: "disease-1",
	name: "Sâu bệnh trên lúa",
	symptom: "Lá bị cuốn",
};

const response = {
	disease: {
		id: "disease-1",
		name: "Sâu bệnh trên lúa",
		category: "DISEASE",
		symptom: "Lá bị cuốn",
		aliases: [],
		note: null,
		formulaExpr: null,
	},
	consultFields: [
		{
			fieldKey: "area",
			label: "Diện tích",
			fieldType: "NUMBER",
			unit: "ha",
			required: true,
			options: null,
			sortOrder: 0,
		},
	],
	suggestions: [],
	area: null,
	protocols: [],
};

function renderPanel() {
	return render(
		<HandbookQuickPanel
			onAddProduct={vi.fn()}
			onAddSuggestion={vi.fn()}
			onChangeMeta={vi.fn()}
		/>,
	);
}

describe("HandbookQuickPanel", () => {
	beforeEach(() => {
		vi.mocked(listTenantProducts).mockResolvedValue([] as never);
		vi.mocked(getProductLookups).mockResolvedValue({} as never);
		vi.mocked(listHandbookEntries).mockResolvedValue({
			items: [entry],
			page: 1,
			pageSize: 8,
			total: 1,
		} as never);
		vi.mocked(getQuickHandbookSuggestions).mockResolvedValue(response as never);
	});

	it("keeps the picker open with a clear action and empty-state feedback", async () => {
		renderPanel();
		const input = screen.getByRole("searchbox", {
			name: "Tìm sản phẩm hoặc Sổ tay",
		});
		fireEvent.change(input, { target: { value: "sâu" } });
		expect(
			await screen.findByRole("listbox", { name: "Gợi ý tìm kiếm" }),
		).toBeInTheDocument();
		expect(await screen.findByText("Sâu bệnh trên lúa")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Xóa tìm kiếm" }));
		expect(input).toHaveValue("");
		expect(
			screen.queryByRole("listbox", { name: "Gợi ý tìm kiếm" }),
		).not.toBeInTheDocument();
	});

	it("marks required handbook consultation fields", async () => {
		renderPanel();
		fireEvent.change(
			screen.getByRole("searchbox", { name: "Tìm sản phẩm hoặc Sổ tay" }),
			{
				target: { value: "sâu" },
			},
		);
		fireEvent.click(
			await screen.findByRole("button", { name: /Sâu bệnh trên lúa/ }),
		);
		expect(await screen.findByTitle("Bắt buộc")).toBeInTheDocument();
		expect(screen.getByLabelText(/Diện tích/)).toBeRequired();
	});
});
