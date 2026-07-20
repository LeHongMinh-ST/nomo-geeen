import { adminFetch } from "./fetch";

export type TenantRoleCode = "OWNER" | "MANAGER" | "STAFF";
export type TenantUserStatus = "ACTIVE" | "DISABLED";

export interface TenantUserPublic {
	id: string;
	tenantId: string;
	fullName: string;
	username: string;
	phone: string | null;
	email: string | null;
	roleCode: TenantRoleCode;
	status: TenantUserStatus;
	mustChangePassword: boolean;
	lastLoginAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface SeatUsage {
	activeCount: number;
	effectiveMaxUsers: number;
	planCode: string | null;
	seatBonus: number;
}

export interface ListTenantUsersResult {
	items: TenantUserPublic[];
	page: number;
	pageSize: number;
	total: number;
	seatUsage: SeatUsage;
}

export type CreateTenantUserInput = {
	fullName: string;
	username: string;
	roleCode: TenantRoleCode;
	phone?: string;
	email?: string;
	mustChangePassword?: boolean;
} & (
	| { password: string; generatePassword?: never }
	| { generatePassword: true; password?: never }
);

export interface UpdateTenantUserInput {
	fullName?: string;
	username?: string;
	phone?: string;
	email?: string;
}

export type ResetTenantUserPasswordInput =
	| { newPassword: string; generatePassword?: never }
	| { generatePassword: true; newPassword?: never };

const DEFAULT_PAGE_SIZE = 25;
const base = (tenantId: string) => `/admin/tenants/${tenantId}/users`;

export function listTenantUsers(
	accessToken: string,
	tenantId: string,
	params: { page?: number; pageSize?: number } = {},
): Promise<ListTenantUsersResult> {
	const page = Math.max(params.page ?? 1, 1);
	const pageSize = Math.min(
		Math.max(params.pageSize ?? DEFAULT_PAGE_SIZE, 1),
		100,
	);
	return adminFetch<ListTenantUsersResult>(
		`${base(tenantId)}?page=${page}&pageSize=${pageSize}`,
		{ accessToken },
	);
}

export function createTenantUser(
	accessToken: string,
	tenantId: string,
	input: CreateTenantUserInput,
): Promise<{ user: TenantUserPublic; generatedPassword: string | null }> {
	return adminFetch(`${base(tenantId)}`, {
		method: "POST",
		accessToken,
		body: JSON.stringify(input),
	});
}

export function updateTenantUser(
	accessToken: string,
	tenantId: string,
	userId: string,
	input: UpdateTenantUserInput,
): Promise<TenantUserPublic> {
	return adminFetch(`${base(tenantId)}/${userId}`, {
		method: "PATCH",
		accessToken,
		body: JSON.stringify(input),
	});
}

export function changeTenantUserRole(
	accessToken: string,
	tenantId: string,
	userId: string,
	roleCode: TenantRoleCode,
): Promise<TenantUserPublic> {
	return adminFetch(`${base(tenantId)}/${userId}/role`, {
		method: "PATCH",
		accessToken,
		body: JSON.stringify({ roleCode }),
	});
}

export function deactivateTenantUser(
	accessToken: string,
	tenantId: string,
	userId: string,
): Promise<TenantUserPublic> {
	return adminFetch(`${base(tenantId)}/${userId}/deactivate`, {
		method: "POST",
		accessToken,
	});
}

export function reactivateTenantUser(
	accessToken: string,
	tenantId: string,
	userId: string,
): Promise<TenantUserPublic> {
	return adminFetch(`${base(tenantId)}/${userId}/reactivate`, {
		method: "POST",
		accessToken,
	});
}

export function resetTenantUserPassword(
	accessToken: string,
	tenantId: string,
	userId: string,
	input: ResetTenantUserPasswordInput,
): Promise<{ generatedPassword: string | null }> {
	return adminFetch(`${base(tenantId)}/${userId}/reset-password`, {
		method: "POST",
		accessToken,
		body: JSON.stringify(input),
	});
}
