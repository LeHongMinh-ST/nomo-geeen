import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
	title: "NomoGreen",
	description:
		"Phần mềm bán hàng vật tư nông nghiệp: bán hàng, kho và công nợ.",
	manifest: "/manifest.webmanifest",
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "NomoGreen",
	},
	icons: {
		icon: [
			{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
		],
		apple: "/icons/apple-touch-icon.png",
	},
};

export const viewport: Viewport = {
	themeColor: "#5cad45",
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="vi" className="h-full antialiased" suppressHydrationWarning>
			<body className="min-h-full flex flex-col" suppressHydrationWarning>
				{children}
				<ServiceWorkerRegister />
			</body>
		</html>
	);
}
