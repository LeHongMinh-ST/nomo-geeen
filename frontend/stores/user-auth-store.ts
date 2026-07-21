"use client";

import { create } from "zustand";
import {
	changeUserPassword,
	updateCurrentProfile,
	getCurrentUser,
	loginUser,
	logoutUser,
	refreshUser,
	registerUser,
	type TenantAuthUser,
} from "@/lib/user-auth-api";

type UserAuthState = {
	user: TenantAuthUser | null;
	accessToken: string | null;
	loading: boolean;
	hasHydrated: boolean;
	hydrate: () => Promise<void>;
	login: (identifier: string, password: string) => Promise<void>;
	register: (input: Parameters<typeof registerUser>[0]) => Promise<void>;
	changePassword: (
		currentPassword: string,
		newPassword: string,
	) => Promise<void>;
	updateProfile: (input: Parameters<typeof updateCurrentProfile>[1]) => Promise<string>;
	logout: () => Promise<void>;
	clear: () => void;
	setAccessToken: (token: string | null) => void;
};

export const useUserAuth = create<UserAuthState>((set, get) => ({
	user: null,
	accessToken: null,
	loading: false,
	hasHydrated: false,

	hydrate: async () => {
		if (get().hasHydrated || get().loading) return;
		set({ loading: true });
		try {
			const response = await refreshUser();
			const user = await getCurrentUser(response.accessToken);
			set({ user, accessToken: response.accessToken, hasHydrated: true });
		} catch {
			set({ user: null, accessToken: null, hasHydrated: true });
		} finally {
			set({ loading: false });
		}
	},

	login: async (identifier, password) => {
		set({ loading: true });
		try {
			const response = await loginUser({ identifier, password });
			set({
				user: response.user,
				accessToken: response.accessToken,
				hasHydrated: true,
			});
		} finally {
			set({ loading: false });
		}
	},

	register: async (input) => {
		set({ loading: true });
		try {
			const response = await registerUser(input);
			set({
				user: response.user,
				accessToken: response.accessToken,
				hasHydrated: true,
			});
		} finally {
			set({ loading: false });
		}
	},

	changePassword: async (currentPassword, newPassword) => {
		const token = get().accessToken;
		if (!token) throw new Error("Phiên đăng nhập đã hết hạn.");
		set({ loading: true });
		try {
			const response = await changeUserPassword(
				token,
				currentPassword,
				newPassword,
			);
			set({ user: response.user });
		} finally {
			set({ loading: false });
		}
	},

	updateProfile: async (input) => {
		const token = get().accessToken;
		if (!token) throw new Error('Phiên đăng nhập đã hết hạn.');
		set({ loading: true });
		try {
			const response = await updateCurrentProfile(token, input);
			set({ user: response.user });
			return response.address;
		} finally {
			set({ loading: false });
		}
	},

	logout: async () => {
		const token = get().accessToken;
		if (token) {
			try {
				await logoutUser(token);
			} catch {
				// Clear local state even when the server is unavailable.
			}
		}
		set({ user: null, accessToken: null, hasHydrated: true, loading: false });
	},

	clear: () =>
		set({ user: null, accessToken: null, hasHydrated: true, loading: false }),
	setAccessToken: (accessToken) => set({ accessToken }),
}));
