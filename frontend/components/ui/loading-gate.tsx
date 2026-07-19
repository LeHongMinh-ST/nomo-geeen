"use client";

import { useEffect, useState } from "react";

/**
 * LoadingGate — hiện `skeleton` trong lúc "tải", rồi thay bằng `children`.
 *
 * Hiện dùng delay giả lập vì dữ liệu còn mock đồng bộ (DESIGN.md §21: skeleton
 * thay vì màn trắng). Nhận children/skeleton là ReactNode nên server component
 * (vd Trang chủ) vẫn truyền vào được, chỉ gate này là client.
 *
 * TODO(backend): khi gắn API, bỏ delay giả lập — dùng trạng thái fetch thật
 * (isLoading của React Query/Suspense) làm cờ hiển thị skeleton.
 */
export function LoadingGate({
	children,
	skeleton,
	delay = 450,
}: {
	children: React.ReactNode;
	skeleton: React.ReactNode;
	delay?: number;
}) {
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => setLoading(false), delay);
		return () => clearTimeout(timer);
	}, [delay]);

	return <>{loading ? skeleton : children}</>;
}
