import { Quote } from "lucide-react";

/**
 * Cách hoạt động: 3 bước verb-noun (không "Bước 1/2/3" trần).
 * Testimonial giọng nông dân thật, ≤3 dòng, attribution đầy đủ.
 */

const steps = [
	{
		no: "1",
		title: "Đăng ký cửa hàng",
		desc: "Nhập số điện thoại, tên cửa hàng là xong. Không cần thẻ ngân hàng, không cài đặt phức tạp.",
	},
	{
		no: "2",
		title: "Thêm sản phẩm và khách",
		desc: "Nhập vài mặt hàng hay bán và khách quen. Làm dần cũng được, bán trước rồi bổ sung sau.",
	},
	{
		no: "3",
		title: "Bán hàng mỗi ngày",
		desc: "Mở điện thoại, chọn hàng, thu tiền hoặc ghi nợ. Doanh thu và tồn kho tự cập nhật.",
	},
];

const testimonials = [
	{
		quote:
			"Trước ghi sổ tay hay nhầm nợ. Giờ mở điện thoại ra là biết ai còn thiếu bao nhiêu, đỡ cãi nhau với khách.",
		name: "Chị Tư Hạnh",
		role: "Cửa hàng vật tư · Tiền Giang",
		initials: "TH",
	},
	{
		quote:
			"Chữ to dễ đọc, bấm cái là bán xong. Tôi lớn tuổi không rành máy tính mà vẫn dùng được cả ngày.",
		name: "Anh Bảy Cường",
		role: "Đại lý phân bón · Long An",
		initials: "BC",
	},
	{
		quote:
			"Cuối tháng xem báo cáo biết hàng nào bán chạy để nhập thêm. Không còn cảnh đứt hàng giữa vụ.",
		name: "Chị Năm Thảo",
		role: "Cửa hàng giống · Đồng Tháp",
		initials: "NT",
	},
];

export function HowItWorks() {
	return (
		<section
			id="cach-dung"
			className="mx-auto max-w-[1200px] px-4 py-16 lg:px-8 lg:py-24"
		>
			<div className="mx-auto max-w-2xl text-center">
				<h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
					Bắt đầu chỉ trong buổi sáng
				</h2>
				<p className="mt-4 text-lg leading-relaxed text-[#616161]">
					Ba việc đơn giản để cửa hàng của bạn chạy trên NomoGreen.
				</p>
			</div>

			<div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
				{steps.map((step) => (
					<div
						key={step.no}
						className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-6 shadow-card"
					>
						<span className="flex size-11 items-center justify-center rounded-full bg-accent text-xl font-bold text-accent-foreground">
							{step.no}
						</span>
						<div className="flex flex-col gap-2">
							<h3 className="text-xl font-semibold text-foreground">
								{step.title}
							</h3>
							<p className="text-base leading-relaxed text-[#616161]">
								{step.desc}
							</p>
						</div>
					</div>
				))}
			</div>

			{/* Testimonials */}
			<div className="mt-20">
				<h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
					Người bán hàng nói gì
				</h2>
				<div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
					{testimonials.map((item) => (
						<figure
							key={item.name}
							className="flex flex-col gap-5 rounded-[16px] border border-border bg-card p-6 shadow-card"
						>
							<Quote
								className="size-8 text-primary/40"
								aria-hidden
								fill="currentColor"
							/>
							<blockquote className="text-base leading-relaxed text-foreground">
								{item.quote}
							</blockquote>
							<figcaption className="mt-auto flex items-center gap-3">
								<span className="flex size-11 items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-foreground">
									{item.initials}
								</span>
								<div className="flex flex-col leading-tight">
									<span className="text-base font-semibold text-foreground">
										{item.name}
									</span>
									<span className="text-sm text-[#9e9e9e]">{item.role}</span>
								</div>
							</figcaption>
						</figure>
					))}
				</div>
			</div>
		</section>
	);
}
