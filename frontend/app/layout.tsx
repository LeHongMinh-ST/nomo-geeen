import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "NomoGreen",
	description:
		"Phần mềm bán hàng vật tư nông nghiệp: bán hàng, kho và công nợ.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="vi" className="h-full antialiased">
			<body className="min-h-full flex flex-col">{children}</body>
		</html>
	);
}
