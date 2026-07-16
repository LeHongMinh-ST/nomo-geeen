import { Check } from "lucide-react";
import Link from "next/link";

/**
 * Bảng giá 3 gói. Giá VNĐ hợp thị trường VN cho cửa hàng nhỏ.
 * Gói "Cửa hàng" nổi bật (viền primary + badge). Số tiền đậm, kèm đơn vị.
 */

const plans = [
	{
		name: "Miễn phí",
		price: "0",
		unit: "đ",
		period: "mãi mãi",
		desc: "Cho nông hộ mới bắt đầu, bán ít.",
		features: [
			"Bán hàng và ghi nợ",
			"Tối đa 50 sản phẩm",
			"1 người dùng",
			"Báo cáo doanh thu cơ bản",
		],
		cta: "Dùng ngay",
		highlight: false,
	},
	{
		name: "Cửa hàng",
		price: "149.000",
		unit: "đ",
		period: "mỗi tháng",
		desc: "Cho cửa hàng bán đều mỗi ngày.",
		features: [
			"Không giới hạn sản phẩm",
			"Quản lý kho và công nợ đầy đủ",
			"3 người dùng",
			"Báo cáo chi tiết, hàng bán chạy",
			"In và gửi biên lai",
		],
		cta: "Dùng thử 30 ngày",
		highlight: true,
	},
	{
		name: "Đại lý",
		price: "349.000",
		unit: "đ",
		period: "mỗi tháng",
		desc: "Cho đại lý nhiều nhân viên, nhiều kho.",
		features: [
			"Mọi tính năng gói Cửa hàng",
			"Nhiều kho, nhiều chi nhánh",
			"Không giới hạn người dùng",
			"Phân quyền nhân viên",
			"Hỗ trợ ưu tiên qua điện thoại",
		],
		cta: "Liên hệ tư vấn",
		highlight: false,
	},
];

export function Pricing() {
	return (
		<section id="bang-gia" className="bg-[#fafafa] py-16 lg:py-24">
			<div className="mx-auto max-w-[1200px] px-4 lg:px-8">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
						Giá rõ ràng, không phí ẩn
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-[#616161]">
						Bắt đầu miễn phí, nâng cấp khi cửa hàng lớn hơn. Hủy bất cứ lúc nào.
					</p>
				</div>

				<div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
					{plans.map((plan) => (
						<div
							key={plan.name}
							className={`relative flex flex-col rounded-[16px] bg-card p-7 ${
								plan.highlight
									? "border-2 border-primary shadow-[0_8px_30px_rgba(76,175,80,0.16)]"
									: "border border-border shadow-card"
							}`}
						>
							{plan.highlight ? (
								<span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-sm font-semibold text-white">
									Phổ biến nhất
								</span>
							) : null}

							<h3 className="text-xl font-semibold text-foreground">
								{plan.name}
							</h3>
							<p className="mt-1.5 text-base text-[#616161]">{plan.desc}</p>

							<div className="mt-5 flex items-end gap-1.5">
								<span className="text-4xl font-bold tracking-tight text-foreground">
									{plan.price}
								</span>
								<span className="pb-1 text-2xl font-bold text-foreground">
									{plan.unit}
								</span>
								<span className="pb-1.5 text-base text-[#9e9e9e]">
									/ {plan.period}
								</span>
							</div>

							<ul className="mt-6 flex flex-1 flex-col gap-3">
								{plan.features.map((feature) => (
									<li key={feature} className="flex items-start gap-3">
										<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
											<Check className="size-3.5" aria-hidden />
										</span>
										<span className="text-base text-foreground">{feature}</span>
									</li>
								))}
							</ul>

							<Link
								href="/dang-nhap"
								className={`mt-7 flex h-13 items-center justify-center rounded-[10px] px-6 text-lg font-semibold transition-colors duration-200 ease-out ${
									plan.highlight
										? "bg-primary text-white hover:bg-[#43a047] active:bg-[#2e7d32]"
										: "border border-border bg-white text-foreground hover:bg-[#f5f5f5]"
								}`}
							>
								{plan.cta}
							</Link>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
