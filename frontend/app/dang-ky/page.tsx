import type { Metadata } from "next";
import Image from "next/image";
import { GuestGuard } from "@/components/auth/guest-guard";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
	title: "Đăng ký cửa hàng · NomoGreen",
	description:
		"Tạo cửa hàng NomoGreen và bắt đầu quản lý bán hàng, kho, công nợ.",
};

export default function RegisterPage() {
	return (
		<GuestGuard>
			<main className="min-h-[100dvh] bg-[#f8f9f8] px-5 py-8 sm:px-8 sm:py-12">
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
					<div className="flex items-center justify-between">
						<Image
							src="/images/logo.png"
							alt="NomoGreen"
							width={180}
							height={60}
							className="h-12 w-auto"
							priority
						/>
						<span className="rounded-full bg-[#f3f8f1] px-3 py-1.5 text-sm font-medium text-primary">
							Bắt đầu miễn phí
						</span>
					</div>
					<section className="rounded-2xl border border-border bg-white p-5 shadow-[0_2px_10px_rgba(92,173,69,0.06)] sm:p-8">
						<div className="mb-8 flex flex-col gap-2">
							<p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
								Cửa hàng mới
							</p>
							<h1 className="text-3xl font-bold tracking-tight text-foreground">
								Tạo không gian bán hàng
							</h1>
							<p className="text-base leading-relaxed text-muted-foreground">
								Bạn sẽ là chủ cửa hàng và có thể bắt đầu thêm sản phẩm ngay.
							</p>
						</div>
						<RegisterForm />
					</section>
				</div>
			</main>
		</GuestGuard>
	);
}
