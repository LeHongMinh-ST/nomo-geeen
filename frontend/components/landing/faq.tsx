import { Plus } from "lucide-react";

/**
 * FAQ dùng native details/summary — không cần JS, mở/đóng bằng HTML.
 * Ngôn ngữ đời thường, trả lời trực tiếp câu hỏi của chủ cửa hàng.
 */

const faqs = [
	{
		q: "Tôi không rành máy tính có dùng được không?",
		a: "Được. NomoGreen thiết kế chữ to, nút to, mỗi màn hình chỉ một việc chính. Nhiều chủ cửa hàng lớn tuổi đang dùng hằng ngày mà không cần ai hướng dẫn nhiều.",
	},
	{
		q: "Có cần mua máy tính hay máy in không?",
		a: "Không bắt buộc. Chỉ cần một chiếc điện thoại có mạng là bán được hàng. Máy in biên lai là tùy chọn thêm nếu bạn muốn.",
	},
	{
		q: "Dữ liệu bán hàng của tôi có an toàn không?",
		a: "Dữ liệu được lưu trên máy chủ và sao lưu thường xuyên. Chỉ bạn và người bạn cho phép mới xem được số liệu cửa hàng.",
	},
	{
		q: "Mạng yếu ở quê có dùng được không?",
		a: "Có. Phần mềm được tối ưu cho máy yếu và mạng yếu, tải nhẹ và chạy mượt ở vùng nông thôn.",
	},
	{
		q: "Tôi muốn dừng thì có mất tiền không?",
		a: "Không. Bạn có thể hủy bất cứ lúc nào, không ràng buộc hợp đồng. Gói miễn phí thì dùng mãi mãi mà không tốn đồng nào.",
	},
];

export function Faq() {
	return (
		<section
			id="cau-hoi"
			className="mx-auto max-w-[820px] px-4 py-16 lg:px-8 lg:py-24"
		>
			<div className="text-center">
				<h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
					Câu hỏi thường gặp
				</h2>
				<p className="mt-4 text-lg leading-relaxed text-[#616161]">
					Chưa rõ điều gì? Dưới đây là những thắc mắc hay gặp nhất.
				</p>
			</div>

			<div className="mt-10 flex flex-col gap-3">
				{faqs.map((faq) => (
					<details
						key={faq.q}
						className="group rounded-[16px] border border-border bg-card p-5 shadow-card [&_svg]:open:rotate-45"
					>
						<summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-foreground">
							{faq.q}
							<Plus
								className="size-5 shrink-0 text-primary transition-transform duration-200 ease-out"
								aria-hidden
							/>
						</summary>
						<p className="mt-3 text-base leading-relaxed text-[#616161]">
							{faq.a}
						</p>
					</details>
				))}
			</div>
		</section>
	);
}
