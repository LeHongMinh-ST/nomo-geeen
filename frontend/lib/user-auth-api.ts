import { mapTenantApiError } from "./sales-api-error";

export type TenantAuthUser = {
	id: string;
	tenantId: string;
	tenantSlug: string;
	tenantName: string;
	username: string;
	email: string | null;
	phone: string | null;
	fullName: string;
	role: string;
	permissions: string[];
	mustChangePassword: boolean;
};

export type TenantProfile = {
	user: TenantAuthUser;
	address: string;
	bank: {
		bankId: string;
		bankName: string;
		bankShortName: string;
		accountNumber: string;
		accountName: string;
	} | null;
};

export type VietQrBank = {
	id: string;
	name: string;
	shortName: string;
	code: string;
	bin: string;
};

export type TenantAuthResponse = {
	accessToken: string;
	user: TenantAuthUser;
};

export type UserApiError = Error & {
	status?: number;
	reason?: string;
	serverMessage?: string;
};

const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

function messageForStatus(status: number, reason?: string): string {
	if (
		reason === "NO_SUBSCRIPTION" ||
		reason === "SUBSCRIPTION_EXPIRED" ||
		reason === "SUBSCRIPTION_CANCELLED" ||
		reason === "ENTITLEMENT_UNAVAILABLE"
	) {
		return mapTenantApiError({ reason });
	}
	if (status === 400) return "Thông tin chưa hợp lệ, vui lòng kiểm tra lại.";
	if (status === 401)
		return "Thông tin đăng nhập không đúng hoặc phiên đã hết hạn.";
	if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
	if (status === 409) return "Tên cửa hàng hoặc tài khoản đã tồn tại.";
	if (status === 429)
		return "Bạn thao tác quá nhiều. Vui lòng thử lại sau ít phút.";
	if (status >= 500) return "Hệ thống đang bận. Vui lòng thử lại sau.";
	return "Không thể hoàn tất yêu cầu.";
}

export function createUserApiError(
	status: number,
	body?: { reason?: string; message?: string | string[] },
): UserApiError {
	const reason = body?.reason;
	const serverMessage = Array.isArray(body?.message)
		? body.message.join("; ")
		: body?.message;
	return Object.assign(new Error(messageForStatus(status, reason)), {
		status,
		reason,
		serverMessage,
	});
}

async function requestJson<T>(
	path: string,
	init: RequestInit = {},
): Promise<T> {
	const headers = new Headers(init.headers);
	if (!headers.has("Content-Type"))
		headers.set("Content-Type", "application/json");
	let response: Response;
	try {
		response = await fetch(`${API_BASE}${path}`, {
			...init,
			headers,
			credentials: "include",
		});
	} catch {
		throw Object.assign(
			new Error(
				"Không thể kết nối máy chủ. Vui lòng kiểm tra backend đang chạy.",
			),
			{ reason: "NETWORK_ERROR" },
		) as UserApiError;
	}
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			reason?: string;
			message?: string | string[];
		} | null;
		throw createUserApiError(response.status, body ?? undefined);
	}
	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}

export function registerUser(input: {
	tenantName: string;
	slug: string;
	fullName: string;
	username: string;
	email?: string;
	phone?: string;
	password: string;
}): Promise<TenantAuthResponse> {
	return requestJson<TenantAuthResponse>("/auth/register", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function loginUser(input: {
	identifier: string;
	password: string;
}): Promise<TenantAuthResponse> {
	return requestJson<TenantAuthResponse>("/auth/login", {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function refreshUser(): Promise<TenantAuthResponse> {
	return requestJson<TenantAuthResponse>("/auth/refresh?realm=user", {
		method: "POST",
	});
}

export function getCurrentUser(accessToken: string): Promise<TenantAuthUser> {
	return requestJson<TenantAuthUser>("/auth/me", {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
}

export function getCurrentProfile(accessToken: string): Promise<TenantProfile> {
	return requestJson<TenantProfile>("/auth/profile", {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
}

export async function getVietQrBanks(): Promise<VietQrBank[]> {
	const response = await fetch("https://api.vietqr.io/v2/banks");
	if (!response.ok) throw new Error("Không thể tải danh sách ngân hàng.");
	const body = (await response.json()) as {
		code?: string;
		data?: Array<Partial<VietQrBank>>;
	};
	if (body.code !== "00" || !Array.isArray(body.data))
		throw new Error("Danh sách ngân hàng không hợp lệ.");
	return body.data.flatMap((bank) => {
		const identifier = bank.id ?? bank.bin ?? bank.code;
		if (!bank.name || !identifier) return [];
		return [
			{
				id: String(identifier),
				name: bank.name,
				shortName: bank.shortName ?? bank.code ?? bank.name,
				code: String(bank.code ?? bank.id ?? bank.bin ?? identifier),
				bin: String(bank.bin ?? bank.id ?? bank.code ?? identifier),
			},
		];
	});
}

export function updateCurrentProfile(
	accessToken: string,
	input: {
		fullName: string;
		phone?: string;
		email?: string;
		address?: string;
		bankId?: string | null;
		bankName?: string | null;
		bankShortName?: string | null;
		bankAccountNumber?: string | null;
		bankAccountName?: string | null;
	},
): Promise<TenantProfile> {
	return requestJson<TenantProfile>("/auth/profile", {
		method: "PATCH",
		headers: { Authorization: `Bearer ${accessToken}` },
		body: JSON.stringify(input),
	});
}

export function passkeyRegistrationOptions(accessToken: string) {
	return requestJson<{ challengeId: string; options: unknown }>(
		"/auth/passkeys/registration/options",
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);
}
export function passkeyRegistrationVerify(
	accessToken: string,
	challengeId: string,
	response: unknown,
	label?: string,
) {
	return requestJson<{ id: string; message: string }>(
		"/auth/passkeys/registration/verify",
		{
			method: "POST",
			headers: { Authorization: `Bearer ${accessToken}` },
			body: JSON.stringify({ challengeId, response, label }),
		},
	);
}
export function passkeyAuthenticationOptions(identifier?: string) {
	return requestJson<{ challengeId: string; options: unknown }>(
		"/auth/passkeys/authentication/options",
		{ method: "POST", body: JSON.stringify({ identifier }) },
	);
}
export function passkeyAuthenticationVerify(
	challengeId: string,
	response: unknown,
) {
	return requestJson<TenantAuthResponse>(
		"/auth/passkeys/authentication/verify",
		{ method: "POST", body: JSON.stringify({ challengeId, response }) },
	);
}
export function listPasskeys(accessToken: string) {
	return requestJson<
		Array<{
			id: string;
			label: string | null;
			deviceType: string | null;
			backedUp: boolean;
			createdAt: string;
			lastUsedAt: string | null;
		}>
	>("/auth/passkeys", { headers: { Authorization: `Bearer ${accessToken}` } });
}
export function revokePasskey(accessToken: string, id: string) {
	return requestJson(`/auth/passkeys/${id}`, {
		method: "DELETE",
		headers: { Authorization: `Bearer ${accessToken}` },
	});
}
export function logoutUser(accessToken: string): Promise<void> {
	return requestJson<void>("/auth/logout", {
		method: "POST",
		headers: { Authorization: `Bearer ${accessToken}` },
	});
}

export function changeUserPassword(
	accessToken: string,
	currentPassword: string,
	newPassword: string,
): Promise<{ user: TenantAuthUser }> {
	return requestJson<{ user: TenantAuthUser }>("/auth/change-password", {
		method: "POST",
		headers: { Authorization: `Bearer ${accessToken}` },
		body: JSON.stringify({ currentPassword, newPassword }),
	});
}
