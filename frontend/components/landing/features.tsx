import {
	BarChart3,
	HandCoins,
	PackagePlus,
	ShoppingCart,
	Users,
	Warehouse,
} from "lucide-react";

/**
 * Bento tính năng: mỗi tính năng một icon tile màu module accent (DESIGN.md §3).
 * 6 tính năng → 6 ô, ô "Bán nhanh" chiếm 2 cột làm điểm nhấn.
 * Màu tile chỉ cho icon tile, không cho text/nút.
 */

const features = [
	{
		icon: ShoppingCart,
		tile: "#43a047",
		title: "Bán nhanh",
		desc: "Tìm sản phẩm, thêm vào đơn, thu tiền hoặc ghi nợ chỉ trong ba lần chạm. Tồn kho tự trừ ngay, không cần bước xác nhận rườm rà.",
		span: true,
	},
	{
		icon: HandCoins,
		tile: "#f4511e",
		title: "Theo dõi công nợ",
		desc: "Ai còn nợ, nợ bao nhiêu, khi nào đến hạn đều rõ ràng. Thu nhiều lần, hệ thống tự tính phần còn lại.",
	},
	{
		icon: Warehouse,
		tile: "#3949ab",
		title: "Nắm rõ tồn kho",
		desc: "Biết ngay hàng nào sắp hết để nhập thêm đúng lúc, tránh mất khách vì đứt hàng.",
	},
	{
		icon: PackagePlus,
		tile: "#26a69a",
		title: "Nhập hàng dễ dàng",
		desc: "Ghi nhận hàng vào kho, cập nhật giá vốn và giá bán chỉ trong một màn hình.",
	},
	{
		icon: Users,
		tile: "#1e88e5",
		title: "Quản lý khách hàng",
		desc: "Lưu tên, số điện thoại, lịch sử mua và công nợ của từng khách trong tầm tay.",
	},
	{
		icon: BarChart3,
		tile: "#546e7a",
		title: "Báo cáo rõ ràng",
		desc: "Doanh thu hôm nay, tháng này và hàng bán chạy hiện ngay trên trang chủ.",
	},
];

export function Features() {
	return (
		<section
			id="tinh-nang"
			className="mx-auto max-w-[1200px] px-4 py-16 lg:px-8 lg:py-24"
		>
			<div className="mx-auto max-w-2xl text-center">
				<h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
					Mọi việc cửa hàng cần, trong một phần mềm
				</h2>
				<p className="mt-4 text-lg leading-relaxed text-[#616161]">
					Từ bán hàng, quản lý kho đến công nợ. Tất cả được thiết kế để người
					chưa quen máy tính vẫn dùng được ngay.
				</p>
			</div>

			<div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
				{features.map((feature) => (
					<article
						key={feature.title}
						className={`flex flex-col gap-4 rounded-[16px] border border-border bg-card p-6 shadow-card transition-shadow duration-200 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] ${
							feature.span ? "md:col-span-2" : ""
						}`}
					>
						<span
							className="flex size-12 shrink-0 items-center justify-center rounded-[10px]"
							style={{ backgroundColor: feature.tile }}
						>
							<feature.icon className="size-6 text-white" aria-hidden />
						</span>
						<div className="flex flex-col gap-2">
							<h3 className="text-xl font-semibold text-foreground">
								{feature.title}
							</h3>
							<p className="text-base leading-relaxed text-[#616161]">
								{feature.desc}
							</p>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
