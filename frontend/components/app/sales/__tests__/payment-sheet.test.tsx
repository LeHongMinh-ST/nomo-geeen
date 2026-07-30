import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { getCurrentProfile } from "@/lib/user-auth-api";
import { PaymentSheet } from "../payment-sheet";

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

const configuredProfile = {
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

function renderSheet(profile: typeof configuredProfile | null) {
	vi.mocked(getCurrentProfile).mockResolvedValue(
		profile ?? { ...configuredProfile, bank: null },
	);
	return render(
		<PaymentSheet
			open
			total={125000}
			paymentReference="SO-20260730-001"
			paymentNote="Khach mua phan bon"
			onClose={vi.fn()}
			onConfirm={vi.fn()}
		/>,
	);
}

describe("PaymentSheet transfer", () => {
	it("renders configured bank details and VietQR URL with payment reference/note", async () => {
		renderSheet(configuredProfile);
		fireEvent.click(screen.getByRole("button", { name: "Chuyển khoản" }));

		const image = await screen.findByAltText("Mã VietQR thanh toán");
		expect(screen.getByText(/Vietcombank/)).toBeInTheDocument();
		expect(screen.getByText(/0123456789/)).toBeInTheDocument();
		expect(screen.getAllByText(/125\.000/)).toHaveLength(2);
		expect(image).toHaveAttribute(
			"src",
			expect.stringContaining(
				"addInfo=SO-20260730-001%20-%20Khach%20mua%20phan%20bon",
			),
		);
	});

	it("disables transfer confirmation when bank is missing", async () => {
		renderSheet(null);
		fireEvent.click(screen.getByRole("button", { name: "Chuyển khoản" }));

		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Hoàn tất thu tiền" }),
			).toBeDisabled(),
		);
		expect(screen.getByText(/Chưa cấu hình tài khoản/)).toBeInTheDocument();
	});
});
