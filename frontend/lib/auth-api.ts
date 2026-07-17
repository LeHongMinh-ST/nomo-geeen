// Client API cho xac thuc admin (PlatformAdmin).
// Access token giu trong bo nho (khong persist) de giam be mat XSS;
// refresh token do backend quan ly qua HttpOnly cookie.

const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export type AdminIdentity = {
	id: string;
	email: string;
	fullName: string;
	role: string;
};

export type AdminLoginResponse = {
	accessToken: string;
	admin: AdminIdentity;
};

export class AdminLoginError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "AdminLoginError";
	}
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
	accessToken = token;
}

export function getAccessToken(): string | null {
	return accessToken;
}

export async function adminLogin(
	email: string,
	password: string,
): Promise<AdminLoginResponse> {
	let res: Response;
	try {
		res = await fetch(`${API_BASE}/auth/admin/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ email, password }),
		});
	} catch {
		throw new AdminLoginError(0, "Không kết nối được máy chủ.");
	}

	if (!res.ok) {
		const message =
			res.status === 403
				? "Tài khoản quản trị đã bị vô hiệu hóa."
				: res.status === 401
					? "Email hoặc mật khẩu không đúng."
					: "Đăng nhập thất bại, vui lòng thử lại.";
		throw new AdminLoginError(res.status, message);
	}

	const data = (await res.json()) as AdminLoginResponse;
	if (!data.accessToken) {
		throw new AdminLoginError(res.status, "Phản hồi đăng nhập không hợp lệ.");
	}
	setAccessToken(data.accessToken);
	return data;
}
