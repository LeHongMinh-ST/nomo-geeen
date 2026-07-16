import { Building2, Sprout, Store } from "lucide-react";

/**
 * "Phù hợp với mọi quy mô" — khối tin cậy kiểu FarmGo.
 * 3 nhóm người dùng, icon tile màu module accent (DESIGN.md §3), phân tách bằng đường mảnh.
 */

const tiers = [
	{
		icon: Sprout,
		tile: "#43a047",
		title: "Nông hộ",
		desc: "Bán lẻ vật tư cho bà con trong xóm, cần ghi đơn và theo dõi nợ đơn giản.",
	},
	{
		icon: Store,
		tile: "#1e88e5",
		title: "Cửa hàng",
		desc: "Bán đều mỗi ngày, cần quản lý kho, công nợ và xem doanh thu rõ ràng.",
	},
	{
		icon: Building2,
		tile: "#7e57c2",
		title: "Đại lý và chuỗi",
		desc: "Nhiều nhân viên, nhiều kho, cần phân quyền và báo cáo theo từng điểm bán.",
	},
];

export function ScaleTiers() {
	return (
		<section className="mx-auto max-w-[1200px] px-4 py-16 lg:px-8 lg:py-24">
			<div className="mx-auto max-w-2xl text-center">
				<h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
					Phù hợp với mọi quy mô
				</h2>
				<p className="mt-4 text-lg leading-relaxed text-[#616161]">
					Từ nông hộ bán lẻ tới đại lý nhiều điểm bán, NomoGreen lớn cùng cửa
					hàng của bạn.
				</p>
			</div>

			<div className="mt-12 grid grid-cols-1 divide-y divide-border overflow-hidden rounded-[16px] border border-border bg-card shadow-card md:grid-cols-3 md:divide-x md:divide-y-0">
				{tiers.map((tier) => (
					<div key={tier.title} className="flex flex-col gap-4 p-7">
						<span
							className="flex size-12 shrink-0 items-center justify-center rounded-[10px]"
							style={{ backgroundColor: tier.tile }}
						>
							<tier.icon className="size-6 text-white" aria-hidden />
						</span>
						<div className="flex flex-col gap-2">
							<h3 className="text-xl font-semibold text-foreground">
								{tier.title}
							</h3>
							<p className="text-base leading-relaxed text-[#616161]">
								{tier.desc}
							</p>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
