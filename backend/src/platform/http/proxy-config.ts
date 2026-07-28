export type TrustProxySetting = boolean | number | string[];

export function parseTrustProxy(
	value = process.env.TRUST_PROXY,
): TrustProxySetting {
	const normalized = value?.trim();
	if (!normalized || normalized === 'false' || normalized === '0') return false;
	if (normalized === 'true') return true;
	if (/^\d+$/.test(normalized)) return Number(normalized);
	return normalized
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}
