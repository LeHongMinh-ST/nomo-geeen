import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/**
 * Hero kiểu FarmGo: headline + subtext lồng social proof, 2 CTA, ảnh sản phẩm thật.
 * Ảnh preview.png là LCP → priority. Dải ba giá trị ngay dưới hero.
 */

const values = [
	{
		title: "Bán và thu nợ",
		desc: "Ghi đơn, thu tiền, ghi nợ nhanh gọn mỗi ngày.",
	},
	{
		title: "Quản lý kho",
		desc: "Biết hàng nào sắp hết để nhập thêm đúng lúc.",
	},
	{
		title: "Theo dõi công nợ",
		desc: "Ai còn nợ, nợ bao nhiêu, đến hạn khi nào đều rõ.",
	},
];

export function Hero() {
	return (
		<section className="border-b border-border bg-white">
			<div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 pb-16 pt-14 lg:grid-cols-[1fr_1.1fr] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
				<div className="flex flex-col gap-7">
					<h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
						Phần mềm bán hàng
						<br />
						vật tư nông nghiệp
					</h1>

					<p className="max-w-xl text-lg leading-relaxed text-[#616161]">
						Bán hàng, quản lý kho và theo dõi công nợ trên một phần mềm. Được
						các cửa hàng và đại lý vật tư nông nghiệp tin dùng mỗi ngày.
					</p>

					<div className="flex flex-col gap-3 sm:flex-row">
						<Link
							href="/dang-nhap"
							className="flex h-13 items-center justify-center gap-2 rounded-[10px] bg-primary px-7 text-lg font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32]"
						>
							Dùng thử miễn phí
							<ArrowRight className="size-5" aria-hidden />
						</Link>
						<a
							href="#bang-gia"
							className="flex h-13 items-center justify-center rounded-[10px] border border-border bg-white px-7 text-lg font-semibold text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
						>
							Xem bảng giá
						</a>
					</div>
				</div>

				{/* Ảnh sản phẩm thật trong khung trình duyệt */}
				<div className="overflow-hidden rounded-[16px] border border-border bg-white shadow-[0_20px_60px_rgba(46,125,50,0.14)]">
					<div className="flex items-center gap-2 border-b border-border bg-[#fafafa] px-4 py-3">
						<span className="size-3 rounded-full bg-[#e0e0e0]" />
						<span className="size-3 rounded-full bg-[#e0e0e0]" />
						<span className="size-3 rounded-full bg-[#e0e0e0]" />
						<span className="ml-3 flex-1 rounded-full bg-[#f0f0f0] px-3 py-1 text-xs text-[#9e9e9e]">
							nomogreen.vn
						</span>
					</div>
					<Image
						src="/images/preview.png"
						alt="Màn hình trang chủ NomoGreen: doanh thu hôm nay, cảnh báo hàng sắp hết và biểu đồ doanh thu bảy ngày"
						width={1798}
						height={982}
						priority
						sizes="(max-width: 1024px) 100vw, 640px"
						className="h-auto w-full"
					/>
				</div>
			</div>

			{/* Dải ba giá trị chính */}
			<div className="border-t border-border bg-[#fafafa]">
				<dl className="mx-auto grid max-w-[1200px] grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-8">
					{values.map((value) => (
						<div key={value.title} className="flex flex-col gap-1.5 px-6 py-7">
							<dt className="text-lg font-semibold text-foreground">
								{value.title}
							</dt>
							<dd className="text-base leading-relaxed text-[#616161]">
								{value.desc}
							</dd>
						</div>
					))}
				</dl>
			</div>
		</section>
	);
}
