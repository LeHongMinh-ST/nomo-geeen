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
};

export type TenantAuthResponse = {
	accessToken: string;
	user: TenantAuthUser;
};

export type UserApiError = Error & { status?: number; reason?: string };

const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

function messageForStatus(status: number): string {
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
	body?: { reason?: string },
): UserApiError {
	return Object.assign(new Error(messageForStatus(status)), {
		status,
		reason: body?.reason,
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

export function updateCurrentProfile(
	accessToken: string,
	input: { fullName: string; phone?: string; email?: string; address?: string },
): Promise<TenantProfile> {
	return requestJson<TenantProfile>("/auth/profile", {
		method: "PATCH",
		headers: { Authorization: `Bearer ${accessToken}` },
		body: JSON.stringify(input),
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
