import { AppShell } from "@/components/app/app-shell";
import { PwaSplash } from "@/components/pwa/pwa-splash";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<PwaSplash />
			<AppShell>{children}</AppShell>
		</>
	);
}
