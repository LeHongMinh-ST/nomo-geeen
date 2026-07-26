/**
 * Fold Vietnamese text to a diacritic-free lowercase form so that "Da" matches "Đạo ôn".
 * Must stay behaviourally identical to frontend/lib/vietnamese-search.ts — stored search
 * columns are produced here and filtered again on the client.
 */
export function normalizeVietnameseSearch(input: string): string {
	if (!input) return '';
	return input
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

/** Join a list of terms into one normalized haystack. */
export function normalizeSearchList(values: readonly string[]): string {
	return normalizeVietnameseSearch(values.join(' '));
}

/**
 * Every query token must appear in the haystack. Tokens match as substrings so a short
 * prefix like "da" still finds "dao on".
 */
export function matchesNormalized(haystack: string, query: string): boolean {
	const q = normalizeVietnameseSearch(query);
	if (!q) return true;
	const target = normalizeVietnameseSearch(haystack);
	if (!target) return false;
	return q.split(' ').every((token) => target.includes(token));
}
