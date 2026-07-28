"use client";

import type { ReactNode } from "react";

/**
 * LoadingGate — hiện `skeleton` trong lúc "tải", rồi thay bằng `children`.
 *
 * Hiển thị theo cờ loading từ trạng thái fetch thật; không tự tạo delay.
 */
export function LoadingGate({
	children,
	skeleton,
	loading = false,
}: {
	children: ReactNode;
	skeleton: ReactNode;
	loading?: boolean;
}) {
	return <>{loading ? skeleton : children}</>;
}
