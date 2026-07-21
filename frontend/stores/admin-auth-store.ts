// Zustand store cho admin auth — pattern giong stem-exam-app:
// KHONG persist gi ca (in-memory only). Moi F5 phai hydrate qua /auth/me.
// Backend xu ly refresh token rotate tu dong trong /auth/me (neu access
// token het han, su dung refresh cookie de rotate va set accessToken moi
// trong response body).

import { create } from "zustand";

export type AdminIdentity = {
	id: string;
	email: string;
	fullName: string;
	role: string;
	roleCodes?: string[];
	permissions?: string[];
};

type AuthState = {
	admin: AdminIdentity | null;
	accessToken: string | null;
	loading: boolean;
	hasHydrated: boolean;
	hydrate: () => Promise<void>;
	login: (email: string, password: string) => Promise<void>;
	logout: () => Promise<void>;
	clear: () => void;
	setAccessToken: (token: string | null) => void;
};

const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export const useAdminAuth = create<AuthState>((set, get) => ({
	admin: null,
	accessToken: null,
	loading: false,
	hasHydrated: false,

	hydrate: async () => {
		const state = get();
		if (state.hasHydrated || state.loading) return;

		set({ loading: true });
		try {
			const refreshRes = await fetch(`${API_BASE}/auth/refresh?realm=admin`, {
				method: "POST",
				credentials: "include",
			});
			if (!refreshRes.ok) {
				set({ admin: null, accessToken: null, hasHydrated: true, loading: false });
				return;
			}
			const refreshJson = (await refreshRes.json()) as { accessToken?: string };
			if (!refreshJson.accessToken) {
				set({ admin: null, accessToken: null, hasHydrated: true, loading: false });
				return;
			}

			const meRes = await fetch(`${API_BASE}/auth/me`, {
				credentials: "include",
				headers: { Authorization: `Bearer ${refreshJson.accessToken}` },
			});
			if (!meRes.ok) {
				set({ admin: null, accessToken: null, hasHydrated: true, loading: false });
				return;
			}
			const admin = (await meRes.json()) as AdminIdentity;
			set({ admin, accessToken: refreshJson.accessToken, hasHydrated: true });
		} catch {
			set({ admin: null, accessToken: null, hasHydrated: true });
		} finally {
			set({ loading: false });
		}
	},

	login: async (email: string, password: string) => {
		set({ loading: true });
		try {
			const res = await fetch(`${API_BASE}/auth/admin/login`, {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});
			if (!res.ok) {
				const message =
					res.status === 403
						? "Tài khoản quản trị đã bị vô hiệu hóa."
						: res.status === 401
							? "Email hoặc mật khẩu không đúng."
							: "Đăng nhập thất bại, vui lòng thử lại.";
				throw Object.assign(new Error(message), { status: res.status });
			}
			const data = (await res.json()) as {
				accessToken: string;
				admin: AdminIdentity;
			};
			set({
				admin: data.admin,
				accessToken: data.accessToken,
				hasHydrated: true,
			});
		} finally {
			set({ loading: false });
		}
	},

	logout: async () => {
		const token = get().accessToken;
		if (token) {
			try {
				await fetch(`${API_BASE}/auth/logout`, {
					method: "POST",
					credentials: "include",
					headers: { Authorization: `Bearer ${token}` },
				});
			} catch {
				// ignore
			}
		}
		set({ admin: null, accessToken: null });
	},

	clear: () =>
		set({ admin: null, accessToken: null, hasHydrated: true, loading: false }),

	setAccessToken: (token: string | null) => set({ accessToken: token }),
}));
