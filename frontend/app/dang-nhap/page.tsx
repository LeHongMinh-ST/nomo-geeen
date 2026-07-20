import { HandCoins, ShoppingCart, Warehouse } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { GuestGuard } from "@/components/auth/guest-guard";
import { LoginForm } from "@/components/auth/login-form";
import { USER_TILE_BLUE, USER_TILE_GREEN } from "@/lib/navigation";

export const metadata: Metadata = {
	title: "Đăng nhập · NomoGreen",
	description:
		"Đăng nhập NomoGreen để bán hàng, quản lý kho và theo dõi công nợ vật tư nông nghiệp.",
};

const benefits = [
	{
		icon: ShoppingCart,
		title: "Bán hàng nhanh",
		desc: "Ghi đơn, thu tiền chỉ vài lần chạm ngay trên điện thoại.",
		accent: USER_TILE_GREEN,
	},
	{
		icon: Warehouse,
		title: "Nắm rõ tồn kho",
		desc: "Biết ngay hàng nào sắp hết để nhập thêm đúng lúc.",
		accent: USER_TILE_GREEN,
	},
	{
		icon: HandCoins,
		title: "Theo dõi công nợ",
		desc: "Ai còn nợ, nợ bao nhiêu, khi nào đến hạn đều rõ ràng.",
		accent: USER_TILE_BLUE,
	},
] as const;

export default function LoginPage() {
	return (
		<GuestGuard>
			<div className="grid min-h-[100dvh] w-full bg-white lg:grid-cols-2">
				<aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-[#f8f9f8] p-12 lg:flex">
					{/* Nền lấy cảm hứng từ gradient tròn của logo — khối sáng lệch góc phải trên, đổ bóng mềm màu thương hiệu thay vì bóng đen phẳng. */}
					<div
						aria-hidden
						className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full"
						style={{
							background:
								"radial-gradient(circle at 34% 30%, rgba(148,214,118,0.55) 0%, rgba(92,173,69,0.22) 42%, rgba(92,173,69,0) 68%)",
						}}
					/>
					<div
						aria-hidden
						className="pointer-events-none absolute -right-24 top-16 size-64 rounded-full opacity-70 blur-2xl"
						style={{
							background:
								"radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)",
						}}
					/>
					<div
						aria-hidden
						className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full"
						style={{
							background:
								"radial-gradient(circle at 60% 40%, rgba(26,111,168,0.24) 0%, rgba(26,111,168,0.06) 55%, rgba(26,111,168,0) 75%)",
						}}
					/>
					<div
						aria-hidden
						className="pointer-events-none absolute -right-16 top-[38%] h-[30rem] w-40 -rotate-[22deg] opacity-60"
						style={{
							background:
								"linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(148,214,118,0.16) 45%, rgba(92,173,69,0.05) 100%)",
						}}
					/>

					<div className="relative">
						<Image
							src="/images/logo.png"
							alt="NomoGreen"
							width={144}
							height={48}
							className="h-12 w-auto object-contain drop-shadow-[0_12px_28px_rgba(92,173,69,0.22)]"
							priority
						/>
					</div>

					<div className="relative flex flex-col gap-10">
						<div className="flex flex-col gap-3">
							<p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
								Phần mềm bán hàng
							</p>
							<h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-foreground">
								Bán vật tư nông nghiệp, gọn trong lòng bàn tay.
							</h1>
							<p className="max-w-md text-base leading-relaxed text-muted-foreground">
								Một chỗ cho bán hàng, kho và công nợ — to, rõ, dễ dùng trên điện
								thoại.
							</p>
						</div>

						<ol className="flex flex-col gap-0 border-t border-border">
							{benefits.map((item) => (
								<li
									key={item.title}
									className="flex items-start gap-4 border-b border-border py-5"
								>
									<item.icon
										className="mt-0.5 size-8 shrink-0"
										style={{ color: item.accent }}
										strokeWidth={1.75}
										aria-hidden
									/>
									<div className="flex flex-col gap-1.5 pt-0.5">
										<p className="text-base font-semibold text-foreground">
											{item.title}
										</p>
										<p className="text-sm leading-relaxed text-muted-foreground">
											{item.desc}
										</p>
									</div>
								</li>
							))}
						</ol>
					</div>

					<p className="relative text-sm text-muted-foreground">
						Dùng hằng ngày bởi cửa hàng và đại lý vật tư nông nghiệp.
					</p>
				</aside>

				<main className="flex flex-col justify-center bg-white px-5 py-10 sm:px-8 lg:px-16">
					<div className="mx-auto w-full max-w-md">
						<div className="mb-10 flex items-center lg:hidden">
							<Image
								src="/images/logo.png"
								alt="NomoGreen"
								width={240}
								height={80}
								className="h-12 w-auto object-contain drop-shadow-[0_10px_20px_rgba(92,173,69,0.2)]"
								priority
							/>
						</div>

						<div className="mb-8 flex flex-col gap-2">
							<h2 className="text-2xl font-bold tracking-tight text-foreground">
								Đăng nhập
							</h2>
							<p className="text-base text-muted-foreground">
								Nhập tên đăng nhập, email hoặc số điện thoại để tiếp tục bán
								hàng.
							</p>
						</div>

						<LoginForm />
					</div>
				</main>
			</div>
		</GuestGuard>
	);
}
