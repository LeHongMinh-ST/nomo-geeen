import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DebtAccount } from "@/lib/debts";
import { getCurrentProfile } from "@/lib/user-auth-api";
import { CollectPaymentSheet } from "../collect-payment-sheet";

vi.mock("next/image", () => ({
	default: ({ unoptimized: _unoptimized, ...props }: Record<string, unknown>) =>
		createElement("img", props),
}));
vi.mock("@/lib/use-scroll-lock", () => ({ useScrollLock: vi.fn() }));
vi.mock("@/lib/user-auth-api", () => ({ getCurrentProfile: vi.fn() }));
vi.mock("@/stores/user-auth-store", () => ({
	useUserAuth: (selector: (state: { accessToken: string }) => unknown) =>
		selector({ accessToken: "access-token" }),
}));

const customer: DebtAccount = {
	id: "customer-1",
	direction: "receivable",
	name: "Khách hàng A",
	phone: "0900000000",
	partyLabel: "Nông hộ",
	entries: [
		{ id: "charge-1", date: "2026-07-30", kind: "charge", amount: 250000 },
	],
};

const supplier: DebtAccount = {
	...customer,
	id: "supplier-1",
	direction: "payable",
	name: "Nhà cung cấp A",
};

const bankProfile = {
	user: {} as never,
	address: "",
	bank: {
		bankId: "970436",
		bankName: "Vietcombank",
		bankShortName: "VCB",
		accountNumber: "0123456789",
		accountName: "NGUYEN VAN A",
	},
};

describe("CollectPaymentSheet transfer", () => {
	it("renders configured bank details and VietQR URL for customer receivable", async () => {
		vi.mocked(getCurrentProfile).mockResolvedValue(bankProfile);
		render(
			<CollectPaymentSheet
				account={customer}
				onClose={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Thu hết 250.000₫" }));
		fireEvent.click(screen.getByRole("button", { name: "Chuyển khoản" }));

		const image = await screen.findByAltText("Mã VietQR thu nợ");
		expect(screen.getByText(/Vietcombank/)).toBeInTheDocument();
		expect(screen.getByText(/0123456789/)).toBeInTheDocument();
		expect(screen.getAllByText(/250\.000/).length).toBeGreaterThanOrEqual(2);
		expect(image).toHaveAttribute(
			"src",
			expect.stringContaining(
				"addInfo=Thu%20no%20customer-1%20-%20Kh%C3%A1ch%20h%C3%A0ng%20A",
			),
		);
	});

	it("disables customer transfer when bank is missing but allows supplier transfer", async () => {
		vi.mocked(getCurrentProfile).mockResolvedValue({
			...bankProfile,
			bank: null,
		});
		const { rerender } = render(
			<CollectPaymentSheet
				account={customer}
				onClose={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Thu hết 250.000₫" }));
		fireEvent.click(screen.getByRole("button", { name: "Chuyển khoản" }));
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Thu 250.000₫" }),
			).toBeDisabled(),
		);

		rerender(
			<CollectPaymentSheet
				account={supplier}
				onClose={vi.fn()}
				onConfirm={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByRole("button", { name: "Trả hết 250.000₫" }));
		fireEvent.click(screen.getByRole("button", { name: "Chuyển khoản" }));
		expect(
			screen.getByRole("button", { name: "Trả 250.000₫" }),
		).not.toBeDisabled();
	});
});
