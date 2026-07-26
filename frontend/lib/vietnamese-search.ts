/**
 * Fold Vietnamese text to a diacritic-free lowercase form so that "Da" matches "Đạo ôn".
 * Mirrors backend/src/platform/handbook/vietnamese-search.ts — the backend writes the
 * stored search columns with the same algorithm.
 */
export function normalizeVietnameseSearch(input: string): string {
	if (!input) return "";
	return input
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

/**
 * Every query token must appear somewhere in the haystack, ignoring diacritics.
 * Pass several haystack fragments (name, aliases, sku…) and they are matched as one.
 */
export function matchesVietnamese(
	haystack: string | readonly (string | null | undefined)[],
	query: string,
): boolean {
	const q = normalizeVietnameseSearch(query);
	if (!q) return true;
	const target = normalizeVietnameseSearch(
		Array.isArray(haystack) ? haystack.filter(Boolean).join(" ") : String(haystack),
	);
	if (!target) return false;
	return q.split(" ").every((token) => target.includes(token));
}
