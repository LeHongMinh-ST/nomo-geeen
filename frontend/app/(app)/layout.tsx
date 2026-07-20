import { AppShell } from "@/components/app/app-shell";
import { UserAuthGuard } from "@/components/auth/user-auth-guard";
import { PwaSplash } from "@/components/pwa/pwa-splash";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<PwaSplash />
			<UserAuthGuard>
				<AppShell>{children}</AppShell>
			</UserAuthGuard>
		</>
	);
}
