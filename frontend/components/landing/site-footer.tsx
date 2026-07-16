import { MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/**
 * Footer: nhóm link + kênh liên hệ quen thuộc với người Việt (hotline, Zalo, Facebook).
 * Một dòng bản quyền, không version stamp.
 */

const contactChannels = [
	{ icon: Phone, label: "Zalo", href: "https://zalo.me/" },
	{ icon: MessageCircle, label: "Facebook", href: "https://facebook.com/" },
];

const columns = [
	{
		heading: "Sản phẩm",
		links: [
			{ label: "Tính năng", href: "#tinh-nang" },
			{ label: "Bảng giá", href: "#bang-gia" },
			{ label: "Cách dùng", href: "#cach-dung" },
			{ label: "Câu hỏi", href: "#cau-hoi" },
		],
	},
	{
		heading: "Hỗ trợ",
		links: [
			{ label: "Hướng dẫn sử dụng", href: "/dang-nhap" },
			{ label: "Liên hệ tư vấn", href: "/dang-nhap" },
			{ label: "Điều khoản", href: "/dang-nhap" },
			{ label: "Bảo mật", href: "/dang-nhap" },
		],
	},
];

export function SiteFooter() {
	return (
		<footer className="border-t border-border bg-white">
			<div className="mx-auto max-w-[1200px] px-4 py-12 lg:px-8">
				<div className="grid grid-cols-2 gap-8 md:grid-cols-4">
					<div className="col-span-2 flex flex-col gap-4">
						<Link href="/" className="flex items-center">
							<Image
								src="/images/logo_ngang.png"
								alt="NomoGreen"
								width={1667}
								height={391}
								className="h-10 w-auto"
							/>
						</Link>
						<p className="max-w-xs text-base leading-relaxed text-[#616161]">
							Phần mềm bán hàng vật tư nông nghiệp cho nông hộ và cửa hàng nhỏ.
						</p>
						<p className="text-base text-[#616161]">
							Gọi tư vấn:{" "}
							<a
								href="tel:19001234"
								className="font-semibold text-primary hover:underline"
							>
								1900 1234
							</a>
						</p>
						<div className="flex flex-wrap gap-2.5">
							{contactChannels.map((channel) => (
								<a
									key={channel.label}
									href={channel.href}
									className="flex h-11 items-center gap-2 rounded-[10px] border border-border bg-white px-4 text-base font-medium text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
								>
									<channel.icon className="size-5 text-primary" aria-hidden />
									{channel.label}
								</a>
							))}
						</div>
					</div>

					{columns.map((column) => (
						<div key={column.heading} className="flex flex-col gap-3">
							<p className="text-base font-semibold text-foreground">
								{column.heading}
							</p>
							<ul className="flex flex-col gap-2.5">
								{column.links.map((link) => (
									<li key={link.label}>
										<a
											href={link.href}
											className="text-base text-[#616161] transition-colors duration-200 ease-out hover:text-primary"
										>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				<div className="mt-10 border-t border-border pt-6 text-center text-sm text-[#9e9e9e]">
					© 2026 NomoGreen. Vật tư nông nghiệp, gọn trong lòng bàn tay.
				</div>
			</div>
		</footer>
	);
}
