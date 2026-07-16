import { ArrowRight } from "lucide-react";
import Link from "next/link";

/**
 * Khối kêu gọi cuối trang: nền primary, một hành động chính rõ ràng.
 */

export function CtaSection() {
	return (
		<section className="mx-auto max-w-[1200px] px-4 pb-16 lg:px-8 lg:pb-24">
			<div className="rounded-[24px] bg-primary px-6 py-14 text-center text-white lg:px-16 lg:py-20">
				<div className="mx-auto max-w-2xl">
					<h2 className="text-3xl font-bold tracking-tight md:text-4xl">
						Bắt đầu bán hàng gọn hơn hôm nay
					</h2>
					<p className="mt-4 text-lg leading-relaxed text-white/85">
						Dùng thử miễn phí, không cần thẻ ngân hàng. Cửa hàng của bạn có thể
						chạy trên NomoGreen ngay trong buổi sáng.
					</p>
					<Link
						href="/dang-nhap"
						className="mt-8 inline-flex h-13 items-center justify-center gap-2 rounded-[10px] bg-white px-8 text-lg font-semibold text-[#2e7d32] transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
					>
						Dùng thử miễn phí
						<ArrowRight className="size-5" aria-hidden />
					</Link>
				</div>
			</div>
		</section>
	);
}
