import { userFetch } from "@/lib/user-fetch";

export type TenantRoleCode = "OWNER" | "MANAGER" | "STAFF";
export type TenantUserStatus = "ACTIVE" | "DISABLED";

export type TenantUser = {
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
};

export type SeatUsage = {
	activeCount: number;
	effectiveMaxUsers: number;
	planCode: string | null;
	seatBonus: number;
};

export type TenantUsersResponse = {
	items: TenantUser[];
	page: number;
	pageSize: number;
	total: number;
	seatUsage: SeatUsage;
};

export type CreateTenantUserInput = {
	fullName: string;
	username: string;
	roleCode: TenantRoleCode;
	phone?: string;
	email?: string;
	mustChangePassword?: boolean;
} &
	(
		| { password: string; generatePassword?: never }
		| { generatePassword: true; password?: never }
	);

export type UpdateTenantUserInput = Partial<
	Pick<CreateTenantUserInput, "fullName" | "username" | "phone" | "email">
>;

type PasswordInput =
	| { newPassword: string; generatePassword?: never }
	| { generatePassword: true; newPassword?: never };

const base = "/tenant/users";

export function listTenantUsers(): Promise<TenantUsersResponse> {
	return userFetch<TenantUsersResponse>(`${base}?page=1&pageSize=100`);
}

export function createTenantUser(
	input: CreateTenantUserInput,
): Promise<{ user: TenantUser; generatedPassword: string | null }> {
	return userFetch(`${base}`, { method: "POST", body: JSON.stringify(input) });
}

export function updateTenantUser(
	userId: string,
	input: UpdateTenantUserInput,
): Promise<TenantUser> {
	return userFetch(`${base}/${userId}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}

export function changeTenantUserRole(
	userId: string,
	roleCode: TenantRoleCode,
): Promise<TenantUser> {
	return userFetch(`${base}/${userId}/role`, {
		method: "PATCH",
		body: JSON.stringify({ roleCode }),
	});
}

export function deactivateTenantUser(userId: string): Promise<TenantUser> {
	return userFetch(`${base}/${userId}/deactivate`, { method: "POST" });
}

export function reactivateTenantUser(userId: string): Promise<TenantUser> {
	return userFetch(`${base}/${userId}/reactivate`, { method: "POST" });
}

export function resetTenantUserPassword(
	userId: string,
	input: PasswordInput,
): Promise<{ generatedPassword: string | null }> {
	return userFetch(`${base}/${userId}/reset-password`, {
		method: "POST",
		body: JSON.stringify(input),
	});
}
