// API client cho admin RBAC roles + permissions.
// Tuong thich voi backend tai backend/src/platform/roles/roles.controller.ts.

import { adminFetch } from "./fetch";

export interface PermissionPublicShape {
	id: string;
	code: string;
	resource: string;
	action: string;
	group: string | null;
	label: string | null;
	description: string | null;
}

export interface RolePublicShape {
	id: string;
	code: string;
	name: string;
	isSystem: boolean;
	isAdmin: boolean;
	tenantId: string | null;
	permissions: string[];
	createdAt: string;
	updatedAt: string;
}

// ----- Permissions -----

export async function listPermissions(
	accessToken: string,
): Promise<PermissionPublicShape[]> {
	return adminFetch<PermissionPublicShape[]>("/admin/permissions", {
		accessToken,
	});
}

// ----- Roles -----

export async function listRoles(
	accessToken: string,
): Promise<RolePublicShape[]> {
	return adminFetch<RolePublicShape[]>("/admin/roles", { accessToken });
}

export async function getRole(
	accessToken: string,
	roleId: string,
): Promise<RolePublicShape> {
	return adminFetch<RolePublicShape>(`/admin/roles/${roleId}`, { accessToken });
}

export interface CreateRoleInput {
	code: string;
	name: string;
	permissionIds: string[];
}

export async function createRole(
	accessToken: string,
	input: CreateRoleInput,
): Promise<RolePublicShape> {
	return adminFetch<RolePublicShape>("/admin/roles", {
		method: "POST",
		accessToken,
		body: JSON.stringify(input),
	});
}

export interface UpdateRoleInput {
	name?: string;
	addPermissionIds?: string[];
	removePermissionIds?: string[];
}

export async function updateRole(
	accessToken: string,
	roleId: string,
	input: UpdateRoleInput,
): Promise<RolePublicShape> {
	return adminFetch<RolePublicShape>(`/admin/roles/${roleId}`, {
		method: "PATCH",
		accessToken,
		body: JSON.stringify(input),
	});
}

export async function deleteRole(
	accessToken: string,
	roleId: string,
): Promise<void> {
	return adminFetch<void>(`/admin/roles/${roleId}`, {
		method: "DELETE",
		accessToken,
	});
}
