import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TenantList } from "../tenant-list";

vi.mock("@/hooks/use-has-permission", () => ({
	useHasPermission: () => false,
}));

describe("TenantList permissions", () => {
	it("hides empty-state create CTA without tenant:create permission", () => {
		render(
			<TenantList
				items={[]}
				total={0}
				page={1}
				pageSize={20}
				q=""
				status=""
				loading={false}
				error={null}
				mobileItems={[]}
				mobileTotal={0}
				mobileLoading={false}
				onLoadMoreMobile={vi.fn()}
				onFilter={vi.fn(async () => undefined)}
				onPageChange={vi.fn(async () => undefined)}
				onRefresh={vi.fn(async () => undefined)}
				onExport={vi.fn(async () => undefined)}
			/>,
		);
		expect(
			screen.queryByRole("link", { name: "Thêm cửa hàng" }),
		).not.toBeInTheDocument();
	});
});
