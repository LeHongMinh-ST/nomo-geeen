// API client cho admin RBAC users. Tuong thich voi
// backend/src/platform/admin-users/admin-users.controller.ts.

import { adminFetch } from "./fetch";

export interface AdminPublicShape {
	id: string;
	email: string;
	fullName: string;
	status: "ACTIVE" | "DISABLED";
	roles: string[];
	permissions: string[];
	lastLoginAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ListAdminsResult {
	items: AdminPublicShape[];
	total: number;
	page: number;
	pageSize: number;
}

export interface CreateAdminInput {
	email: string;
	password: string;
	fullName: string;
	roleIds: string[];
}

export interface UpdateAdminInput {
	fullName?: string;
	roleIds?: string[];
}

export async function listAdmins(
	accessToken: string,
	page: number,
	pageSize: number,
): Promise<ListAdminsResult> {
	return adminFetch<ListAdminsResult>(
		`/admin/users?page=${page}&pageSize=${pageSize}`,
		{ accessToken },
	);
}

export async function getAdmin(
	accessToken: string,
	id: string,
): Promise<AdminPublicShape> {
	return adminFetch<AdminPublicShape>(`/admin/users/${id}`, { accessToken });
}

export async function createAdmin(
	accessToken: string,
	input: CreateAdminInput,
): Promise<AdminPublicShape> {
	return adminFetch<AdminPublicShape>("/admin/users", {
		method: "POST",
		accessToken,
		body: JSON.stringify(input),
	});
}

export async function updateAdmin(
	accessToken: string,
	id: string,
	input: UpdateAdminInput,
): Promise<AdminPublicShape> {
	return adminFetch<AdminPublicShape>(`/admin/users/${id}`, {
		method: "PATCH",
		accessToken,
		body: JSON.stringify(input),
	});
}

export async function deactivateAdmin(
	accessToken: string,
	id: string,
): Promise<void> {
	return adminFetch<void>(`/admin/users/${id}/deactivate`, {
		method: "POST",
		accessToken,
	});
}

export async function reactivateAdmin(
	accessToken: string,
	id: string,
): Promise<void> {
	return adminFetch<void>(`/admin/users/${id}/reactivate`, {
		method: "POST",
		accessToken,
	});
}

export async function resetPassword(
	accessToken: string,
	id: string,
	newPassword: string,
): Promise<void> {
	return adminFetch<void>(`/admin/users/${id}/reset-password`, {
		method: "POST",
		accessToken,
		body: JSON.stringify({ newPassword }),
	});
}
