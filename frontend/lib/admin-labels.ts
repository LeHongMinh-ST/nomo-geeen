// Localized labels for admin RBAC codes (NFR-7 / design F-25).

import { SUPER_ADMIN_ROLE_CODE } from "@/lib/admin-rbac";

const ROLE_LABELS: Record<string, string> = {
	[SUPER_ADMIN_ROLE_CODE]: "Siêu quản trị",
	SUPPORT: "Hỗ trợ",
	BILLING: "Tài chính",
};

const PERMISSION_ACTION_LABELS: Record<string, string> = {
	view: "Xem",
	create: "Tạo",
	edit: "Sửa",
	delete: "Xóa",
	deactivate: "Vô hiệu hóa",
	reactivate: "Kích hoạt lại",
	reset_password: "Đặt lại mật khẩu",
	approve: "Duyệt",
	export: "Xuất",
};

const RESOURCE_LABELS: Record<string, string> = {
	user: "Người dùng",
	role: "Vai trò",
	permission: "Quyền",
	tenant: "Cửa hàng",
	audit: "Nhật ký",
};

export function labelRoleCode(code: string): string {
	return ROLE_LABELS[code] ?? code;
}

export function labelPermissionCode(code: string): string {
	// admin.user:view → resource=user, action=view
	const withoutPrefix = code.startsWith("admin.")
		? code.slice("admin.".length)
		: code;
	const [resource, action] = withoutPrefix.split(":");
	const r = RESOURCE_LABELS[resource] ?? resource;
	const a = PERMISSION_ACTION_LABELS[action] ?? action;
	return `${a} ${r}`.trim();
}
