type ClientErrorContext = {
	source: string;
	path?: string;
	status?: number;
	reason?: string;
};

export function reportClientError(
	error: unknown,
	context: ClientErrorContext,
): void {
	const payload = {
		message: error instanceof Error ? error.message : String(error),
		...context,
		timestamp: new Date().toISOString(),
	};
	if (process.env.NODE_ENV !== "production")
		console.warn("[client-error]", payload);
	const endpoint = process.env.NEXT_PUBLIC_ERROR_REPORTING_URL;
	if (!endpoint || typeof window === "undefined") return;
	void fetch(endpoint, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
		keepalive: true,
	}).catch(() => undefined);
}
