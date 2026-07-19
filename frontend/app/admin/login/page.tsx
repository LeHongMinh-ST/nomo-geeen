import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/auth/admin-login-form";

export const metadata: Metadata = {
	title: "Đăng nhập quản trị · NomoGreen",
	description: "Khu vực quản trị nội bộ NomoGreen. Yêu cầu tài khoản quản trị.",
	robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
	return (
		<main className="flex min-h-[100dvh] w-full items-center justify-center px-5 py-10">
			<div className="w-full max-w-md">
				<div className="mb-6 flex flex-col items-center gap-4 text-center">
					<Image
						src="/images/logo.png"
						alt="NomoGreen"
						width={180}
						height={56}
						priority
					/>
					<div className="flex flex-col gap-2">
						<p className="text-base text-[#616161]">
							Dành cho quản trị viên NomoGreen.
						</p>
					</div>
				</div>

				<div className="rounded-[16px] border border-border bg-card p-6 shadow-card sm:p-8">
					<Suspense fallback={null}>
						<AdminLoginForm />
					</Suspense>
				</div>

				<p className="mt-6 text-center text-sm text-[#9e9e9e]">
					Bạn là chủ cửa hàng?{" "}
					<Link
						href="/dang-nhap"
						className="font-medium text-[#2e7d32] transition-colors duration-200 ease-out hover:text-[#43a047] hover:underline"
					>
						Về trang đăng nhập
					</Link>
				</p>
			</div>
		</main>
	);
}
