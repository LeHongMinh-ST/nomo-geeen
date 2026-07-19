import { AdminShell } from "@/components/admin/admin-shell";
import { AuthGuard } from "@/components/auth/auth-guard";

// SSR khong check session (cookie HttpOnly host=backend, browser khong gui
// kem request toi Next). AuthGuard phia client goi /auth/refresh + /auth/me
// de xac minh; neu fail -> redirect /admin/login. Pattern giong stem-exam-app.
export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<AuthGuard>
			<AdminShell>{children}</AdminShell>
		</AuthGuard>
	);
}
