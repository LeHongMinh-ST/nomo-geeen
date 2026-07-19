const SENSITIVE_KEY =
	/(password|passwd|passcode|pwd|token|jwt|secret|hash|cookie|authorization|credential|api[_-]?key|private[_-]?key)/i;

export function sanitizeAuditValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sanitizeAuditValue);
	if (value === null || typeof value !== 'object') return value;

	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>).map(([key, child]) => [
			key,
			SENSITIVE_KEY.test(key) ? '[REDACTED]' : sanitizeAuditValue(child),
		]),
	);
}
