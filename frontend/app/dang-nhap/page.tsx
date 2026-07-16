import { HandCoins, Sprout, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
	title: "Đăng nhập · NomoGreen",
	description:
		"Đăng nhập NomoGreen để bán hàng, quản lý kho và theo dõi công nợ vật tư nông nghiệp.",
};

const benefits = [
	{
		icon: Sprout,
		tile: "#43a047",
		title: "Bán hàng nhanh",
		desc: "Ghi đơn, thu tiền chỉ vài lần chạm ngay trên điện thoại.",
	},
	{
		icon: Warehouse,
		tile: "#3949ab",
		title: "Nắm rõ tồn kho",
		desc: "Biết ngay hàng nào sắp hết để nhập thêm đúng lúc.",
	},
	{
		icon: HandCoins,
		tile: "#f4511e",
		title: "Theo dõi công nợ",
		desc: "Ai còn nợ, nợ bao nhiêu, khi nào đến hạn đều rõ ràng.",
	},
];

export default function DangNhapPage() {
	return (
		<div className="grid min-h-[100dvh] w-full lg:grid-cols-2">
			{/* Panel thương hiệu — chỉ hiện trên desktop */}
			<aside className="relative hidden flex-col justify-between overflow-hidden bg-[#2e7d32] p-12 text-white lg:flex">
				<div
					aria-hidden
					className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-white/10"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute -bottom-28 -left-16 size-72 rounded-full bg-white/[0.07]"
				/>

				<div className="relative flex items-center gap-3">
					<span className="flex size-12 items-center justify-center rounded-[12px] bg-white/15 backdrop-blur-sm">
						<Sprout className="size-7" aria-hidden />
					</span>
					<span className="text-2xl font-bold tracking-tight">NomoGreen</span>
				</div>

				<div className="relative flex flex-col gap-8">
					<h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight">
						Bán vật tư nông nghiệp, gọn trong lòng bàn tay.
					</h1>
					<ul className="flex flex-col gap-5">
						{benefits.map((item) => (
							<li key={item.title} className="flex items-start gap-4">
								<span
									className="flex size-11 shrink-0 items-center justify-center rounded-[10px]"
									style={{ backgroundColor: item.tile }}
								>
									<item.icon className="size-6 text-white" aria-hidden />
								</span>
								<div className="flex flex-col gap-1">
									<p className="text-lg font-semibold">{item.title}</p>
									<p className="text-base leading-relaxed text-white/80">
										{item.desc}
									</p>
								</div>
							</li>
						))}
					</ul>
				</div>

				<p className="relative text-sm text-white/70">
					Dùng hằng ngày bởi các cửa hàng và đại lý vật tư nông nghiệp.
				</p>
			</aside>

			{/* Cột form */}
			<main className="flex flex-col justify-center px-5 py-10 sm:px-8 lg:px-16">
				<div className="mx-auto w-full max-w-md">
					{/* Logo cho mobile (panel brand ẩn) */}
					<div className="mb-8 flex items-center gap-3 lg:hidden">
						<span className="flex size-12 items-center justify-center rounded-[12px] bg-primary text-white">
							<Sprout className="size-7" aria-hidden />
						</span>
						<span className="text-2xl font-bold tracking-tight text-foreground">
							NomoGreen
						</span>
					</div>

					<div className="mb-8 flex flex-col gap-2">
						<h2 className="text-2xl font-bold tracking-tight text-foreground">
							Đăng nhập
						</h2>
						<p className="text-base text-[#616161]">
							Nhập số điện thoại và mật khẩu để tiếp tục bán hàng.
						</p>
					</div>

					<LoginForm />
				</div>
			</main>
		</div>
	);
}
