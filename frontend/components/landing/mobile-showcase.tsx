import { Smartphone, TrendingUp, Type, Zap } from "lucide-react";

/**
 * Dải nhấn mạnh mobile-first (DESIGN.md §1). Color block xanh đậm — một lần trong trang.
 * Layout khác các section khác để tạo nhịp (chống lặp layout family).
 */

const points = [
	{
		icon: Smartphone,
		title: "Làm việc trên điện thoại",
		desc: "Mở trình duyệt trên điện thoại là bán được hàng, không cần mua máy tính.",
	},
	{
		icon: Type,
		title: "Chữ to, số rõ",
		desc: "Số tiền hiển thị lớn và đậm, người lớn tuổi vẫn đọc thoải mái.",
	},
	{
		icon: Zap,
		title: "Nhẹ và mượt",
		desc: "Tối ưu cho máy yếu và mạng yếu ở vùng quê, thao tác không giật lag.",
	},
	{
		icon: TrendingUp,
		title: "Số liệu luôn cập nhật",
		desc: "Bán xong là doanh thu và tồn kho tự đổi, không phải tính tay.",
	},
];

export function MobileShowcase() {
	return (
		<section className="bg-[#2e7d32] py-16 text-white lg:py-24">
			<div className="mx-auto max-w-[1200px] px-4 lg:px-8">
				<div className="mx-auto max-w-2xl text-center">
					<h2 className="text-3xl font-bold tracking-tight md:text-4xl">
						Làm cho người bán hàng ngoài vườn, ngoài chợ
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-white/85">
						Mỗi chi tiết đều hướng tới người bán bận rộn, thao tác một tay ngay
						tại quầy hay giữa vườn.
					</p>
				</div>

				<div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
					{points.map((point) => (
						<div
							key={point.title}
							className="flex flex-col gap-4 rounded-[16px] bg-[#256a2a] p-6"
						>
							<span className="flex size-12 items-center justify-center rounded-[10px] bg-[#43a047]">
								<point.icon className="size-6 text-white" aria-hidden />
							</span>
							<div className="flex flex-col gap-1.5">
								<h3 className="text-lg font-semibold">{point.title}</h3>
								<p className="text-base leading-relaxed text-white/80">
									{point.desc}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
