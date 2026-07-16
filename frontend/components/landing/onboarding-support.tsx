import { ArrowRight, Database, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";

/**
 * "Chúng tôi giúp bạn bắt đầu" — khối hỗ trợ onboarding kiểu FarmGo.
 * 2-col split: trái nội dung + CTA, phải panel Primary Soft ba mục hỗ trợ.
 * Layout family riêng (split có panel), không lặp với section khác.
 */

const supports = [
	{
		icon: Database,
		title: "Chuyển sổ sách cũ giúp bạn",
		desc: "Đang ghi sổ tay hay Excel? Gửi cho chúng tôi, đội hỗ trợ nhập sẵn khách hàng và sản phẩm vào phần mềm.",
	},
	{
		icon: MessageCircle,
		title: "Hướng dẫn qua Zalo",
		desc: "Nhắn Zalo là có người chỉ tận nơi từng bước, cầm tay cho tới khi bạn bán được đơn đầu tiên.",
	},
	{
		icon: Phone,
		title: "Gọi hỗ trợ khi cần",
		desc: "Vướng đâu gọi đó trong giờ làm việc, nói chuyện bằng tiếng Việt đời thường, không thuật ngữ khó hiểu.",
	},
];

export function OnboardingSupport() {
	return (
		<section className="bg-white py-16 lg:py-24">
			<div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:px-8">
				<div className="flex flex-col gap-6">
					<h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
						Chúng tôi giúp bạn bắt đầu
					</h2>
					<p className="max-w-xl text-lg leading-relaxed text-[#616161]">
						Không rành máy tính cũng không sao. Đội ngũ NomoGreen đồng hành từ
						lúc chuyển sổ sách cũ cho tới khi bạn quen tay bán hàng.
					</p>
					<Link
						href="/dang-nhap"
						className="flex h-13 w-fit items-center justify-center gap-2 rounded-[10px] bg-primary px-7 text-lg font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32]"
					>
						Dùng thử miễn phí
						<ArrowRight className="size-5" aria-hidden />
					</Link>
				</div>

				<ul className="flex flex-col gap-4">
					{supports.map((item) => (
						<li
							key={item.title}
							className="flex items-start gap-4 rounded-[16px] bg-accent p-6"
						>
							<span className="flex size-12 shrink-0 items-center justify-center rounded-[10px] bg-primary">
								<item.icon className="size-6 text-white" aria-hidden />
							</span>
							<div className="flex flex-col gap-1.5">
								<h3 className="text-lg font-semibold text-foreground">
									{item.title}
								</h3>
								<p className="text-base leading-relaxed text-[#616161]">
									{item.desc}
								</p>
							</div>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
