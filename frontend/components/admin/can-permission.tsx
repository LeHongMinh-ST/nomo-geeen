"use client";

import { useHasPermission } from "@/hooks/use-has-permission";

interface Props {
	permission: string;
	fallback?: React.ReactNode;
	children: React.ReactNode;
}

/**
 * R7.8: conditional render based on user permission. Renders `children`
 * only if the current admin has the given code (or is SUPER_ADMIN); else
 * renders `fallback` (default: nothing).
 */
export function Can({ permission, fallback = null, children }: Props) {
	const allowed = useHasPermission(permission);
	return <>{allowed ? children : fallback}</>;
}