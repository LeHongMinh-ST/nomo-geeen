// Client API cho xac thuc admin (PlatformAdmin).
// Refresh token do backend quan ly qua HttpOnly cookie.
// Access token + identity (admin) in-memory trong Zustand store.
// KHONG persist gi vao sessionStorage (tranh stale data khi F5).
//
// FE goi thang NestJS backend (CORS credentials=true de browser
// attach + luu HttpOnly cookie cross-origin).
const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export type AdminIdentity = {
	id: string;
	email: string;
	fullName: string;
	role: string;
	roleCodes?: string[];
	permissions?: string[];
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

export async function adminLogin(
	email: string,
	password: string,
): Promise<AdminLoginResponse> {
	let res: Response;
	try {
		res = await fetch(`${API_BASE}/auth/admin/login`, {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
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
	if (!data.accessToken || !data.admin) {
		throw new AdminLoginError(res.status, "Phản hồi đăng nhập không hợp lệ.");
	}
	return data;
}

export async function adminLogout(accessToken: string): Promise<void> {
	await fetch(`${API_BASE}/auth/logout`, {
		method: "POST",
		credentials: "include",
		headers: { Authorization: `Bearer ${accessToken}` },
	});
}