import Image from "next/image";
import Link from "next/link";

/**
 * Header landing: logo + neo tới các mục + CTA.
 * Server Component, không JS. CTA "Dùng thử" luôn thấy kể cả trên mobile.
 */

const navLinks = [
	{ label: "Tính năng", href: "#tinh-nang" },
	{ label: "Cách dùng", href: "#cach-dung" },
	{ label: "Bảng giá", href: "#bang-gia" },
	{ label: "Câu hỏi", href: "#cau-hoi" },
];

export function SiteHeader() {
	return (
		<header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
			<div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 lg:px-8">
				<Link href="/home-page" className="flex items-center">
					<Image
						src="/images/logo_ngang.png"
						alt="NomoGreen"
						width={1667}
						height={391}
						priority
						className="h-9 w-auto"
					/>
				</Link>

				<nav className="ml-6 hidden items-center gap-1 lg:flex">
					{navLinks.map((link) => (
						<a
							key={link.href}
							href={link.href}
							className="rounded-[10px] px-3 py-2 text-base font-medium text-[#616161] transition-colors duration-200 ease-out hover:bg-[#f5f5f5] hover:text-foreground"
						>
							{link.label}
						</a>
					))}
				</nav>

				<div className="ml-auto flex items-center gap-2 lg:gap-3">
					<Link
						href="/dang-nhap"
						className="hidden h-11 items-center rounded-[10px] px-4 text-base font-semibold text-[#616161] transition-colors duration-200 ease-out hover:bg-[#f5f5f5] hover:text-foreground sm:flex"
					>
						Đăng nhập
					</Link>
					<Link
						href="/dang-nhap"
						className="flex h-11 items-center rounded-full bg-primary px-5 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32]"
					>
						Dùng thử miễn phí
					</Link>
				</div>
			</div>
		</header>
	);
}
