import { adminFetch } from "./fetch";

export type AuditAction = string;
export type AuditActorType = "PLATFORM_ADMIN" | "USER" | "SYSTEM";

export interface AuditLogItem {
	id: string;
	tenantId: string | null;
	actorType: AuditActorType;
	actorId: string | null;
	actorRoleCode: string | null;
	action: AuditAction;
	resource: string | null;
	resourceId: string | null;
	createdAt: string;
	before: unknown;
	after: unknown;
}

export interface AuditLogResult {
	items: AuditLogItem[];
	page: number;
	pageSize: number;
	total: number;
}

export type AuditLogQuery = Partial<{
	page: number;
	pageSize: number;
	from: string;
	to: string;
	actorType: AuditActorType;
	actorId: string;
	tenantId: string;
	action: string;
	resource: string;
	resourceId: string;
	q: string;
}>;

function queryString(query: AuditLogQuery): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== "") params.set(key, String(value));
	}
	return params.toString();
}

export function listAuditLogs(
	query: AuditLogQuery,
	accessToken: string,
): Promise<AuditLogResult> {
	const suffix = queryString(query);
	return adminFetch<AuditLogResult>(
		`/admin/audit-logs${suffix ? `?${suffix}` : ""}`,
		{ accessToken },
	);
}

export function getAuditLog(id: string, accessToken: string): Promise<AuditLogItem> {
	return adminFetch<AuditLogItem>(`/admin/audit-logs/${id}`, { accessToken });
}
